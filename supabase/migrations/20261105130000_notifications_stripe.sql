-- ============================================================
-- Passage à Stripe – notifications admin
-- À exécuter APRÈS 20261105120000_stripe_reservations.sql
-- Dans Supabase > SQL Editor, tout le fichier d'un coup.
-- Transactionnel, peut être relancé sans risque.
--
-- - « Nouvelle réservation » : uniquement quand une réservation devient
--   confirmée (INSERT en confirmed, ou UPDATE qui passe à confirmed).
--   Plus de notification pour pending_payment, waitlist ou cancelled.
-- - « Paiement reçu » : quand payment_id OU stripe_payment_intent_id passe
--   de NULL à une valeur (le serveur remplit les deux avec le pi_... Stripe ;
--   une seule notification par mise à jour).
-- Les textes des notifications sont inchangés.
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- 1. Nouvelle réservation (confirmée)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.notify_new_reservation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  user_name     text;
  atelier_title text;
BEGIN
  IF NEW.status::text <> 'confirmed' THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.status::text = 'confirmed' THEN
    RETURN NEW;
  END IF;

  SELECT u.full_name INTO user_name FROM public.users u WHERE u.id = NEW.user_id;
  SELECT a.title INTO atelier_title FROM public.ateliers a WHERE a.id = NEW.atelier_id;

  INSERT INTO public.notifications (type, title, message, metadata)
  VALUES (
    'reservation',
    'Nouvelle réservation',
    COALESCE(user_name, 'Un participant') || ' s''est inscrit à « ' || COALESCE(atelier_title, 'un atelier') || ' ».',
    jsonb_build_object('user_id', NEW.user_id, 'atelier_id', NEW.atelier_id)
  );

  RETURN NEW;
END;
$function$;

-- Déclenché aussi sur UPDATE du statut (paiement confirmé, réinscription)
DROP TRIGGER IF EXISTS trigger_new_reservation_notification ON public.reservations;
CREATE TRIGGER trigger_new_reservation_notification
  AFTER INSERT OR UPDATE OF status ON public.reservations
  FOR EACH ROW EXECUTE FUNCTION public.notify_new_reservation();

-- ------------------------------------------------------------
-- 2. Paiement reçu (PayPal historique ou Stripe)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.notify_new_payment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  user_name     text;
  atelier_title text;
BEGIN
  IF NOT (
       (NEW.payment_id IS NOT NULL AND OLD.payment_id IS NULL)
    OR (NEW.stripe_payment_intent_id IS NOT NULL AND OLD.stripe_payment_intent_id IS NULL)
  ) THEN
    RETURN NEW;
  END IF;

  SELECT u.full_name INTO user_name FROM public.users u WHERE u.id = NEW.user_id;
  SELECT a.title INTO atelier_title FROM public.ateliers a WHERE a.id = NEW.atelier_id;

  INSERT INTO public.notifications (type, title, message, metadata)
  VALUES (
    'payment',
    'Paiement reçu',
    COALESCE(user_name, 'Un participant') || ' a payé pour « ' || COALESCE(atelier_title, 'un atelier') || ' ».',
    jsonb_build_object(
      'user_id', NEW.user_id,
      'atelier_id', NEW.atelier_id,
      'payment_id', COALESCE(NEW.payment_id, NEW.stripe_payment_intent_id),
      'payment_method', NEW.payment_method
    )
  );

  RETURN NEW;
END;
$function$;

-- Le trigger existant (AFTER UPDATE) est recréé à l'identique
DROP TRIGGER IF EXISTS trigger_new_payment_notification ON public.reservations;
CREATE TRIGGER trigger_new_payment_notification
  AFTER UPDATE ON public.reservations
  FOR EACH ROW EXECUTE FUNCTION public.notify_new_payment();

COMMIT;

-- ------------------------------------------------------------
-- Contrôle (lecture seule) – à lancer ensuite
-- ------------------------------------------------------------
-- SELECT t.tgname, pg_get_triggerdef(t.oid)
-- FROM pg_trigger t
-- WHERE t.tgrelid = 'public.reservations'::regclass AND NOT t.tgisinternal
-- ORDER BY t.tgname;
