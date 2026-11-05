-- ============================================================
-- Passage à Stripe (Checkout hébergé) – étape 1 : base de données
-- À exécuter dans Supabase > SQL Editor, tout le fichier d'un coup.
-- Transactionnel : en cas d'erreur, rien n'est appliqué.
-- Peut être relancé sans risque.
--
-- - Nouveau statut de réservation 'pending_payment' (en attente de paiement),
--   distinct de 'waitlist' (liste d'attente quand l'atelier est complet).
-- - Colonnes Stripe + date d'expiration de la place bloquée.
-- - payment_method limité à 'paypal' (historique) et 'stripe'.
-- - ateliers.price : plus de valeur par défaut, prix >= 0 (0 = gratuit).
-- - Les places en attente de paiement non expirées comptent comme occupées.
-- - Contrôle des places : refus d'une inscription confirmée ou en attente
--   de paiement quand l'atelier est complet (la liste d'attente reste libre).
-- - Trigger de protection : seul le serveur confirme une réservation payante.
--
-- NB : une valeur ajoutée à un enum ne peut pas être utilisée dans la
-- transaction qui l'ajoute. Partout ci-dessous, le statut est donc comparé
-- en texte (status::text = 'pending_payment'), ce qui reste valable après.
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- 1. Statut "en attente de paiement"
-- ------------------------------------------------------------
ALTER TYPE public.reservation_status ADD VALUE IF NOT EXISTS 'pending_payment';

-- ------------------------------------------------------------
-- 2. Colonnes Stripe sur les réservations
-- ------------------------------------------------------------
ALTER TABLE public.reservations
  ADD COLUMN IF NOT EXISTS stripe_checkout_session_id text,
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id  text,
  ADD COLUMN IF NOT EXISTS payment_expires_at        timestamptz;

COMMENT ON COLUMN public.reservations.stripe_checkout_session_id IS 'Session Stripe Checkout (cs_...)';
COMMENT ON COLUMN public.reservations.stripe_payment_intent_id  IS 'Paiement Stripe (pi_...)';
COMMENT ON COLUMN public.reservations.payment_expires_at        IS 'Fin du blocage de la place pendant le paiement (statut pending_payment)';

-- Une même session / un même paiement Stripe ne sert qu'à une réservation
-- (plusieurs NULL restent possibles)
CREATE UNIQUE INDEX IF NOT EXISTS reservations_stripe_checkout_session_id_key
  ON public.reservations (stripe_checkout_session_id);
CREATE UNIQUE INDEX IF NOT EXISTS reservations_stripe_payment_intent_id_key
  ON public.reservations (stripe_payment_intent_id);

-- Une réservation en attente de paiement a toujours une date d'expiration
ALTER TABLE public.reservations
  DROP CONSTRAINT IF EXISTS reservations_pending_payment_expires_check;
ALTER TABLE public.reservations
  ADD CONSTRAINT reservations_pending_payment_expires_check
  CHECK (status::text <> 'pending_payment' OR payment_expires_at IS NOT NULL);

-- ------------------------------------------------------------
-- 3. Moyens de paiement autorisés ('paypal' sera retiré avec PayPal)
-- ------------------------------------------------------------
ALTER TABLE public.reservations
  DROP CONSTRAINT IF EXISTS reservations_payment_method_check;
ALTER TABLE public.reservations
  ADD CONSTRAINT reservations_payment_method_check
  CHECK (payment_method IS NULL OR payment_method IN ('paypal', 'stripe'));

-- ------------------------------------------------------------
-- 4. Prix des ateliers : obligatoire (déjà NOT NULL), sans défaut, >= 0
-- ------------------------------------------------------------
ALTER TABLE public.ateliers ALTER COLUMN price SET NOT NULL;
ALTER TABLE public.ateliers ALTER COLUMN price DROP DEFAULT;

ALTER TABLE public.ateliers
  DROP CONSTRAINT IF EXISTS ateliers_price_check;
ALTER TABLE public.ateliers
  ADD CONSTRAINT ateliers_price_check CHECK (price >= 0);

-- ------------------------------------------------------------
-- 5. Vue du planning : confirmées + en attente de paiement non expirées
--    (mêmes colonnes, même ordre que la version précédente)
-- ------------------------------------------------------------
CREATE OR REPLACE VIEW public.ateliers_with_spots AS
SELECT a.id,
       a.title,
       a.description,
       a.animateur_id,
       a.date,
       a.start_time,
       a.end_time,
       a.max_participants,
       a.theme,
       a.location,
       a.is_cancelled,
       a.created_at,
       count(r.id) FILTER (
         WHERE r.status::text = 'confirmed'
            OR (r.status::text = 'pending_payment' AND r.payment_expires_at > now())
       ) AS spots_taken,
       a.max_participants - count(r.id) FILTER (
         WHERE r.status::text = 'confirmed'
            OR (r.status::text = 'pending_payment' AND r.payment_expires_at > now())
       ) AS spots_remaining,
       a.price,
       a.status,
       a.rejection_reason
FROM public.ateliers a
LEFT JOIN public.reservations r ON r.atelier_id = a.id
WHERE a.status = 'approved'
   OR a.animateur_id = auth.uid()
   OR public.get_user_role(auth.uid()) = 'admin'::user_role
GROUP BY a.id;

-- ------------------------------------------------------------
-- 6. Protection des réservations (remplace la version du 23/10)
--    Navigateur (anon / authenticated, hors admin) :
--    - ne peut jamais écrire les champs de paiement ni le statut
--      pending_payment (réservés au serveur) ;
--    - ne peut confirmer que : un atelier gratuit (prix 0), en tant que
--      collaborateur, ou une réinscription après une réservation déjà payée.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.protect_reservation_status()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  caller_role   user_role;
  atelier_price numeric;
BEGIN
  -- Serveur (service_role), SQL Editor, triggers internes : autorisé
  IF current_user NOT IN ('anon', 'authenticated') THEN
    RETURN NEW;
  END IF;

  caller_role := public.get_user_role(auth.uid());

  -- Les admins gèrent librement les réservations
  IF caller_role = 'admin'::user_role THEN
    RETURN NEW;
  END IF;

  -- Champs de paiement : écrits uniquement par le serveur
  IF TG_OP = 'INSERT' THEN
    IF NEW.payment_id IS NOT NULL
       OR NEW.payment_method IS NOT NULL
       OR NEW.stripe_checkout_session_id IS NOT NULL
       OR NEW.stripe_payment_intent_id IS NOT NULL
       OR NEW.payment_expires_at IS NOT NULL THEN
      RAISE EXCEPTION 'Les informations de paiement sont enregistrées par le serveur'
        USING ERRCODE = '42501';
    END IF;
  ELSE
    IF NEW.payment_id IS DISTINCT FROM OLD.payment_id
       OR NEW.payment_method IS DISTINCT FROM OLD.payment_method
       OR NEW.stripe_checkout_session_id IS DISTINCT FROM OLD.stripe_checkout_session_id
       OR NEW.stripe_payment_intent_id IS DISTINCT FROM OLD.stripe_payment_intent_id
       OR NEW.payment_expires_at IS DISTINCT FROM OLD.payment_expires_at THEN
      RAISE EXCEPTION 'Les informations de paiement sont enregistrées par le serveur'
        USING ERRCODE = '42501';
    END IF;
    IF NEW.user_id IS DISTINCT FROM OLD.user_id
       OR NEW.atelier_id IS DISTINCT FROM OLD.atelier_id THEN
      RAISE EXCEPTION 'Réservation non modifiable' USING ERRCODE = '42501';
    END IF;
  END IF;

  -- Mise en attente de paiement : uniquement par le serveur
  IF NEW.status::text = 'pending_payment'
     AND (TG_OP = 'INSERT' OR OLD.status::text IS DISTINCT FROM 'pending_payment') THEN
    RAISE EXCEPTION 'La mise en attente de paiement est faite par le serveur'
      USING ERRCODE = '42501';
  END IF;

  -- Passage en "confirmed"
  IF NEW.status::text = 'confirmed'
     AND (TG_OP = 'INSERT' OR OLD.status::text IS DISTINCT FROM 'confirmed') THEN

    -- Accès gratuit des collaborateurs (entreprises partenaires)
    IF caller_role = 'collaborateur'::user_role THEN
      RETURN NEW;
    END IF;

    -- Atelier gratuit : rien à payer
    SELECT a.price INTO atelier_price FROM public.ateliers a WHERE a.id = NEW.atelier_id;
    IF atelier_price = 0 THEN
      RETURN NEW;
    END IF;

    -- Réinscription après annulation d'une réservation déjà payée
    IF TG_OP = 'UPDATE'
       AND (OLD.payment_id IS NOT NULL OR OLD.stripe_payment_intent_id IS NOT NULL) THEN
      RETURN NEW;
    END IF;

    RAISE EXCEPTION 'La réservation sera confirmée après le paiement'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS protect_reservation_status ON public.reservations;
CREATE TRIGGER protect_reservation_status
  BEFORE INSERT OR UPDATE ON public.reservations
  FOR EACH ROW EXECUTE FUNCTION public.protect_reservation_status();

-- ------------------------------------------------------------
-- 7. Contrôle des places
--    Occupent une place : 'confirmed' (y compris inscriptions gratuites
--    admin / collaborateur) et 'pending_payment' non expirée.
--    'waitlist' et 'cancelled' ne sont jamais bloqués.
--    S'applique à tous (navigateur, admin, serveur), sauf une exception :
--    le serveur qui confirme une réservation en attente de paiement
--    (paiement Stripe reçu, même juste après l'expiration du blocage).
--    SECURITY DEFINER : doit compter toutes les réservations de l'atelier,
--    pas seulement celles visibles par l'utilisateur (RLS).
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_reservation_capacity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  -- Rôle de l'appelant d'après le jeton Supabase (current_user vaut le
  -- propriétaire ici, à cause de SECURITY DEFINER). Sans jeton : SQL Editor.
  caller      text := COALESCE(
                        NULLIF(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role',
                        'sql_editor');
  max_places  integer;
  taken       integer;
  new_holds   boolean;
  old_holds   boolean := false;
BEGIN
  new_holds := NEW.status::text = 'confirmed'
            OR (NEW.status::text = 'pending_payment' AND NEW.payment_expires_at > now());

  -- La nouvelle ligne n'occupe pas de place (waitlist, cancelled, attente expirée)
  IF NOT new_holds THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.atelier_id = OLD.atelier_id THEN
    old_holds := OLD.status::text = 'confirmed'
              OR (OLD.status::text = 'pending_payment' AND OLD.payment_expires_at > now());

    -- Elle occupait déjà une place : rien ne change
    IF old_holds THEN
      RETURN NEW;
    END IF;

    -- Paiement reçu par le serveur pour une place en attente (même expirée)
    IF OLD.status::text = 'pending_payment' AND NEW.status::text = 'confirmed'
       AND caller NOT IN ('anon', 'authenticated') THEN
      RETURN NEW;
    END IF;
  END IF;

  -- Verrou sur l'atelier : deux inscriptions simultanées sont traitées l'une après l'autre
  SELECT a.max_participants INTO max_places
  FROM public.ateliers a
  WHERE a.id = NEW.atelier_id
  FOR UPDATE;

  SELECT count(*) INTO taken
  FROM public.reservations r
  WHERE r.atelier_id = NEW.atelier_id
    AND r.id <> NEW.id
    AND (r.status::text = 'confirmed'
         OR (r.status::text = 'pending_payment' AND r.payment_expires_at > now()));

  IF max_places IS NOT NULL AND taken >= max_places THEN
    RAISE EXCEPTION 'Atelier complet'
      USING ERRCODE = 'P0001', HINT = 'Inscription possible en liste d''attente';
  END IF;

  RETURN NEW;
END;
$function$;

-- Appelée uniquement par le trigger
REVOKE ALL ON FUNCTION public.check_reservation_capacity() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS check_reservation_capacity ON public.reservations;
CREATE TRIGGER check_reservation_capacity
  BEFORE INSERT OR UPDATE ON public.reservations
  FOR EACH ROW EXECUTE FUNCTION public.check_reservation_capacity();

COMMIT;
