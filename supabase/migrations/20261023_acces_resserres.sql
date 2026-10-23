-- ============================================================
-- Resserrement des accès (candidatures, notifications, profils, réservations)
-- À exécuter APRÈS 20261023_roles_securises.sql (utilise public.is_super_admin)
-- Dans Supabase > SQL Editor, tout le fichier d'un coup.
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- 1. Candidatures : lecture réservée aux super admins
--    (le dépôt d'une candidature reste ouvert à tous)
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "Admins can read candidatures" ON public.candidatures;
DROP POLICY IF EXISTS "Super admins can read candidatures" ON public.candidatures;
CREATE POLICY "Super admins can read candidatures" ON public.candidatures
  FOR SELECT USING (public.is_super_admin(auth.uid()));

-- ------------------------------------------------------------
-- 2. Notifications : lecture et modification réservées aux admins
--    (la création reste ouverte : le formulaire public /prout en crée,
--     et les triggers SECURITY DEFINER en créent aussi)
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "Anyone can read notifications" ON public.notifications;
DROP POLICY IF EXISTS "Anyone can update notifications" ON public.notifications;
DROP POLICY IF EXISTS "Admins can read notifications" ON public.notifications;
DROP POLICY IF EXISTS "Admins can update notifications" ON public.notifications;

CREATE POLICY "Admins can read notifications" ON public.notifications
  FOR SELECT USING (public.get_user_role(auth.uid()) = 'admin'::user_role);

CREATE POLICY "Admins can update notifications" ON public.notifications
  FOR UPDATE
  USING (public.get_user_role(auth.uid()) = 'admin'::user_role)
  WITH CHECK (public.get_user_role(auth.uid()) = 'admin'::user_role);

-- ------------------------------------------------------------
-- 3. Profils (public.users)
--    - visiteurs et membres : uniquement les animateurs/admins (intervenants)
--      + leur propre profil
--    - animateurs et admins : tous les profils (listes de participants, /membres)
--    → les coordonnées des collaborateurs et inscrits ne sont plus lisibles
--      par les autres membres ni par les visiteurs
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "Users can read all profiles" ON public.users;
DROP POLICY IF EXISTS "Utilisateurs connectés peuvent voir tous les membres" ON public.users;
DROP POLICY IF EXISTS "Users can read own profile" ON public.users;
DROP POLICY IF EXISTS "Staff can read all profiles" ON public.users;

CREATE POLICY "Users can read own profile" ON public.users
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "Staff can read all profiles" ON public.users
  FOR SELECT USING (public.get_user_role(auth.uid()) IN ('admin'::user_role, 'animateur'::user_role));

-- "Public can view animateurs and admins" est conservée (page Entreprises > Intervenants)
-- "Admin can manage all users" est conservée

-- ------------------------------------------------------------
-- 4. Réservations
-- ------------------------------------------------------------

-- Doublon de "Users can manage own reservations" (même effet, sans l'accès admin)
DROP POLICY IF EXISTS "Users can manage their own reservations" ON public.reservations;

-- Une réservation ne passe en "confirmed" que :
--   - par le serveur (service_role) après un paiement PayPal vérifié,
--   - ou directement pour un collaborateur ou un admin (accès gratuit).
-- payment_id / payment_method ne sont jamais modifiables depuis le navigateur.
CREATE OR REPLACE FUNCTION public.protect_reservation_status()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  caller_role user_role;
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
    IF NEW.payment_id IS NOT NULL THEN
      RAISE EXCEPTION 'Les informations de paiement sont enregistrées par le serveur'
        USING ERRCODE = '42501';
    END IF;
  ELSE
    IF NEW.payment_id IS DISTINCT FROM OLD.payment_id
       OR NEW.payment_method IS DISTINCT FROM OLD.payment_method THEN
      RAISE EXCEPTION 'Les informations de paiement sont enregistrées par le serveur'
        USING ERRCODE = '42501';
    END IF;
    IF NEW.user_id IS DISTINCT FROM OLD.user_id
       OR NEW.atelier_id IS DISTINCT FROM OLD.atelier_id THEN
      RAISE EXCEPTION 'Réservation non modifiable' USING ERRCODE = '42501';
    END IF;
  END IF;

  -- Passage en "confirmed"
  IF NEW.status = 'confirmed'::reservation_status
     AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'confirmed'::reservation_status) THEN

    -- Accès gratuit des collaborateurs (entreprises partenaires)
    IF caller_role = 'collaborateur'::user_role THEN
      RETURN NEW;
    END IF;

    -- Réinscription après annulation d'une réservation déjà payée
    IF TG_OP = 'UPDATE' AND OLD.payment_id IS NOT NULL THEN
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

COMMIT;

-- ------------------------------------------------------------
-- Contrôle (lecture seule) – à lancer ensuite
-- ------------------------------------------------------------
-- SELECT tablename, policyname, cmd, qual, with_check
-- FROM pg_policies
-- WHERE schemaname = 'public'
--   AND tablename IN ('candidatures', 'notifications', 'users', 'reservations')
-- ORDER BY tablename, policyname;
