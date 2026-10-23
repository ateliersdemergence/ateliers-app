-- ============================================================
-- Validation des ateliers par le super admin + contrôle des créneaux
--
-- - Un atelier créé par un animateur (ou un admin non super admin) est
--   "pending" : il n'apparaît pas au planning tant que le super admin
--   ne l'a pas validé ("approved") ou refusé ("rejected").
-- - Deux ateliers actifs (pending ou approved, non annulés) ne peuvent pas
--   se chevaucher le même jour.
-- - Une notification "atelier_pending" est créée pour les admins.
-- - Corrige la vue ateliers_with_spots, qui n'exposait pas le prix.
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- 1. Colonnes de validation (les ateliers existants sont validés)
-- ------------------------------------------------------------
ALTER TABLE public.ateliers
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'approved'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  ADD COLUMN IF NOT EXISTS rejection_reason text,
  ADD COLUMN IF NOT EXISTS validated_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS validated_at timestamptz;

-- Les nouveaux ateliers sont en attente par défaut
ALTER TABLE public.ateliers ALTER COLUMN status SET DEFAULT 'pending';

-- ------------------------------------------------------------
-- 2. Créneau déjà pris ? (SECURITY DEFINER : voit tous les ateliers,
--    y compris les ateliers en attente des autres animateurs)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.atelier_slot_conflict(
  p_date date, p_start time, p_end time, p_exclude uuid DEFAULT NULL
)
RETURNS TABLE (id uuid, title text, start_time time, end_time time, status text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT a.id, a.title, a.start_time, a.end_time, a.status
  FROM public.ateliers a
  WHERE a.date = p_date
    AND a.is_cancelled = false
    AND a.status IN ('pending', 'approved')
    AND (p_exclude IS NULL OR a.id <> p_exclude)
    AND a.start_time < p_end
    AND a.end_time > p_start
$function$;

-- ------------------------------------------------------------
-- 3. Créneaux occupés sur une période, pour le mini planning du formulaire
--    Réservé aux animateurs et admins (renvoie 0 ligne aux autres)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.creneaux_occupes(p_from date, p_to date)
RETURNS TABLE (
  id uuid, date date, start_time time, end_time time,
  title text, status text, animateur_name text, is_mine boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT a.id, a.date, a.start_time, a.end_time, a.title, a.status,
         u.full_name, a.animateur_id = auth.uid()
  FROM public.ateliers a
  LEFT JOIN public.users u ON u.id = a.animateur_id
  WHERE a.date BETWEEN p_from AND p_to
    AND a.is_cancelled = false
    AND a.status IN ('pending', 'approved')
    AND public.get_user_role(auth.uid()) IN ('admin'::user_role, 'animateur'::user_role)
  ORDER BY a.date, a.start_time
$function$;

REVOKE EXECUTE ON FUNCTION public.creneaux_occupes(date, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.creneaux_occupes(date, date) TO authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.atelier_slot_conflict(date, time, time, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.atelier_slot_conflict(date, time, time, uuid) TO authenticated, service_role;

-- ------------------------------------------------------------
-- 4. Règles à la création / modification d'un atelier
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.protect_atelier_validation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  is_api boolean := current_user IN ('anon', 'authenticated');
  caller_super boolean := public.is_super_admin(auth.uid());
  caller_role user_role := public.get_user_role(auth.uid());
  slot_changed boolean;
  clash record;
BEGIN
  IF NEW.end_time <= NEW.start_time THEN
    RAISE EXCEPTION 'L''heure de fin doit être après l''heure de début' USING ERRCODE = '22000';
  END IF;

  slot_changed := TG_OP = 'INSERT'
    OR NEW.date IS DISTINCT FROM OLD.date
    OR NEW.start_time IS DISTINCT FROM OLD.start_time
    OR NEW.end_time IS DISTINCT FROM OLD.end_time;

  IF is_api THEN
    IF TG_OP = 'INSERT' THEN
      IF caller_role IS NULL OR caller_role NOT IN ('admin'::user_role, 'animateur'::user_role) THEN
        RAISE EXCEPTION 'Seuls les animateurs et les admins peuvent proposer un atelier' USING ERRCODE = '42501';
      END IF;

      IF caller_super THEN
        NEW.status := 'approved';
        NEW.validated_by := auth.uid();
        NEW.validated_at := now();
      ELSE
        NEW.status := 'pending';
        NEW.validated_by := NULL;
        NEW.validated_at := NULL;
      END IF;
      NEW.rejection_reason := NULL;

    ELSE -- UPDATE
      IF caller_super THEN
        -- Le super admin valide ou refuse
        IF NEW.status IS DISTINCT FROM OLD.status THEN
          NEW.validated_by := auth.uid();
          NEW.validated_at := now();
          IF NEW.status <> 'rejected' THEN NEW.rejection_reason := NULL; END IF;
        END IF;
      ELSE
        IF NEW.status IS DISTINCT FROM OLD.status
           OR NEW.validated_by IS DISTINCT FROM OLD.validated_by
           OR NEW.validated_at IS DISTINCT FROM OLD.validated_at
           OR NEW.rejection_reason IS DISTINCT FROM OLD.rejection_reason THEN
          RAISE EXCEPTION 'Seul le super administrateur peut valider ou refuser un atelier' USING ERRCODE = '42501';
        END IF;

        -- Nouveau créneau, ou atelier refusé puis corrigé : retour en validation
        IF (slot_changed AND OLD.status = 'approved') OR OLD.status = 'rejected' THEN
          NEW.status := 'pending';
          NEW.validated_by := NULL;
          NEW.validated_at := NULL;
          NEW.rejection_reason := NULL;
        END IF;
      END IF;
    END IF;
  END IF;

  -- Chevauchement avec un autre atelier actif
  IF NOT NEW.is_cancelled
     AND NEW.status IN ('pending', 'approved')
     AND (slot_changed
          OR (TG_OP = 'UPDATE' AND (OLD.is_cancelled OR OLD.status = 'rejected'))) THEN
    SELECT * INTO clash
    FROM public.atelier_slot_conflict(NEW.date, NEW.start_time, NEW.end_time, NEW.id)
    LIMIT 1;
    IF FOUND THEN
      RAISE EXCEPTION 'Créneau déjà pris : « % » de % à %',
        clash.title, to_char(clash.start_time, 'HH24:MI'), to_char(clash.end_time, 'HH24:MI')
        USING ERRCODE = '23P01';
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS protect_atelier_validation ON public.ateliers;
CREATE TRIGGER protect_atelier_validation
  BEFORE INSERT OR UPDATE ON public.ateliers
  FOR EACH ROW EXECUTE FUNCTION public.protect_atelier_validation();

-- ------------------------------------------------------------
-- 5. Notification "atelier à valider"
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.notify_atelier_pending()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  animateur_name text;
BEGIN
  IF NEW.status = 'pending' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'pending') THEN
    SELECT full_name INTO animateur_name FROM public.users WHERE id = NEW.animateur_id;
    INSERT INTO public.notifications (type, title, message, metadata)
    VALUES (
      'atelier_pending',
      'Atelier à valider',
      coalesce(animateur_name, 'Un animateur') || ' propose « ' || NEW.title || ' » le '
        || to_char(NEW.date, 'DD/MM/YYYY') || ' de ' || to_char(NEW.start_time, 'HH24:MI')
        || ' à ' || to_char(NEW.end_time, 'HH24:MI') || '.',
      jsonb_build_object('atelier_id', NEW.id, 'animateur_id', NEW.animateur_id)
    );
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS notify_atelier_pending ON public.ateliers;
CREATE TRIGGER notify_atelier_pending
  AFTER INSERT OR UPDATE OF status ON public.ateliers
  FOR EACH ROW EXECUTE FUNCTION public.notify_atelier_pending();

-- ------------------------------------------------------------
-- 6. Lecture : un atelier non validé n'est visible que par son animateur
--    et les admins
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "Anyone can read ateliers" ON public.ateliers;
DROP POLICY IF EXISTS "Read approved or own ateliers" ON public.ateliers;
CREATE POLICY "Read approved or own ateliers" ON public.ateliers
  FOR SELECT USING (
    status = 'approved'
    OR animateur_id = auth.uid()
    OR public.get_user_role(auth.uid()) = 'admin'::user_role
  );

-- ------------------------------------------------------------
-- 7. Vue du planning : ajoute price / status (en fin de liste, requis par
--    CREATE OR REPLACE VIEW) et applique la même règle de visibilité
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
       count(r.id) FILTER (WHERE r.status = 'confirmed'::reservation_status) AS spots_taken,
       a.max_participants - count(r.id) FILTER (WHERE r.status = 'confirmed'::reservation_status) AS spots_remaining,
       a.price,
       a.status,
       a.rejection_reason
FROM public.ateliers a
LEFT JOIN public.reservations r ON r.atelier_id = a.id
WHERE a.status = 'approved'
   OR a.animateur_id = auth.uid()
   OR public.get_user_role(auth.uid()) = 'admin'::user_role
GROUP BY a.id;

COMMIT;
