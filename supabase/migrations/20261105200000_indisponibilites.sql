-- ============================================================
-- Indisponibilités de la salle (réunion, RDV, location…)
--
-- - Créées, modifiées et supprimées par les super admins uniquement.
-- - Les admins voient le motif ; les animateurs voient « Indisponible » ;
--   les autres (collaborateurs, participants, visiteurs) ne voient rien.
-- - Une indisponibilité ne peut pas chevaucher un atelier actif
--   (en attente ou validé, non annulé), ni une autre indisponibilité.
-- - Un atelier ne peut pas être placé sur une indisponibilité.
-- Ajout pur : aucune donnée existante n'est modifiée.
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- 1. Table
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.indisponibilites (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date        date NOT NULL,
  start_time  time NOT NULL,
  end_time    time NOT NULL,
  all_day     boolean NOT NULL DEFAULT false,
  motif       text NOT NULL CHECK (length(btrim(motif)) > 0),
  created_by  uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT indisponibilites_horaires CHECK (end_time > start_time)
);

CREATE INDEX IF NOT EXISTS indisponibilites_date_idx ON public.indisponibilites (date);

ALTER TABLE public.indisponibilites ENABLE ROW LEVEL SECURITY;

-- Lecture directe (avec le motif) : admins uniquement
DROP POLICY IF EXISTS "Admins can read indisponibilites" ON public.indisponibilites;
CREATE POLICY "Admins can read indisponibilites" ON public.indisponibilites
  FOR SELECT USING (public.get_user_role(auth.uid()) = 'admin'::user_role);

-- Écriture : super admins uniquement
DROP POLICY IF EXISTS "Super admins can insert indisponibilites" ON public.indisponibilites;
CREATE POLICY "Super admins can insert indisponibilites" ON public.indisponibilites
  FOR INSERT WITH CHECK (public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "Super admins can update indisponibilites" ON public.indisponibilites;
CREATE POLICY "Super admins can update indisponibilites" ON public.indisponibilites
  FOR UPDATE USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "Super admins can delete indisponibilites" ON public.indisponibilites;
CREATE POLICY "Super admins can delete indisponibilites" ON public.indisponibilites
  FOR DELETE USING (public.is_super_admin(auth.uid()));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.indisponibilites TO authenticated;
REVOKE ALL ON public.indisponibilites FROM anon;

-- ------------------------------------------------------------
-- 2. Contrôles à l'enregistrement d'une indisponibilité
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.protect_indisponibilite()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  clash record;
BEGIN
  NEW.motif := btrim(NEW.motif);

  IF NEW.all_day THEN
    NEW.start_time := '00:00';
    NEW.end_time := '23:59';
  END IF;

  IF NEW.end_time <= NEW.start_time THEN
    RAISE EXCEPTION 'L''heure de fin doit être après l''heure de début' USING ERRCODE = '22000';
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.created_by := COALESCE(auth.uid(), NEW.created_by);
    NEW.created_at := now();
  ELSE
    NEW.created_by := OLD.created_by;
    NEW.created_at := OLD.created_at;
  END IF;
  NEW.updated_at := now();

  -- Atelier actif sur le créneau : refus
  SELECT a.title, a.start_time, a.end_time INTO clash
  FROM public.ateliers a
  WHERE a.date = NEW.date
    AND a.is_cancelled = false
    AND a.status IN ('pending', 'approved')
    AND a.start_time < NEW.end_time
    AND a.end_time > NEW.start_time
  ORDER BY a.start_time
  LIMIT 1;
  IF FOUND THEN
    RAISE EXCEPTION 'Un atelier est déjà prévu sur ce créneau : « % » de % à %. Déplacez-le ou annulez-le d''abord.',
      clash.title, to_char(clash.start_time, 'HH24:MI'), to_char(clash.end_time, 'HH24:MI')
      USING ERRCODE = '23P01';
  END IF;

  -- Autre indisponibilité sur le créneau : refus
  SELECT i.motif, i.start_time, i.end_time INTO clash
  FROM public.indisponibilites i
  WHERE i.date = NEW.date
    AND i.id <> NEW.id
    AND i.start_time < NEW.end_time
    AND i.end_time > NEW.start_time
  LIMIT 1;
  IF FOUND THEN
    RAISE EXCEPTION 'Une indisponibilité existe déjà sur ce créneau : « % » de % à %',
      clash.motif, to_char(clash.start_time, 'HH24:MI'), to_char(clash.end_time, 'HH24:MI')
      USING ERRCODE = '23P01';
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS protect_indisponibilite ON public.indisponibilites;
CREATE TRIGGER protect_indisponibilite
  BEFORE INSERT OR UPDATE ON public.indisponibilites
  FOR EACH ROW EXECUTE FUNCTION public.protect_indisponibilite();

-- ------------------------------------------------------------
-- 3. Un atelier ne peut pas être placé sur une indisponibilité :
--    la fonction de conflit utilisée par le trigger des ateliers
--    renvoie aussi les indisponibilités (sans leur motif)
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
  UNION ALL
  SELECT i.id, 'Indisponible'::text, i.start_time, i.end_time, 'indisponible'::text
  FROM public.indisponibilites i
  WHERE i.date = p_date
    AND i.start_time < p_end
    AND i.end_time > p_start
$function$;

-- ------------------------------------------------------------
-- 4. Mini planning du formulaire de création : ajoute les indisponibilités
--    (motif pour un admin, « Indisponible » pour un animateur)
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
  SELECT * FROM (
    SELECT a.id, a.date, a.start_time, a.end_time, a.title, a.status,
           u.full_name, a.animateur_id = auth.uid()
    FROM public.ateliers a
    LEFT JOIN public.users u ON u.id = a.animateur_id
    WHERE a.date BETWEEN p_from AND p_to
      AND a.is_cancelled = false
      AND a.status IN ('pending', 'approved')
    UNION ALL
    SELECT i.id, i.date, i.start_time, i.end_time,
           CASE WHEN public.get_user_role(auth.uid()) = 'admin'::user_role
                THEN i.motif ELSE 'Indisponible' END,
           'indisponible', NULL::text, false
    FROM public.indisponibilites i
    WHERE i.date BETWEEN p_from AND p_to
  ) c
  WHERE public.get_user_role(auth.uid()) IN ('admin'::user_role, 'animateur'::user_role)
  ORDER BY c.date, c.start_time
$function$;

-- ------------------------------------------------------------
-- 5. Planning : indisponibilités visibles selon le rôle
--    admin → motif ; animateur → motif NULL (« Indisponible ») ; autres → rien
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.indisponibilites_visibles(p_from date, p_to date)
RETURNS TABLE (
  id uuid, date date, start_time time, end_time time, all_day boolean, motif text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT i.id, i.date, i.start_time, i.end_time, i.all_day,
         CASE WHEN public.get_user_role(auth.uid()) = 'admin'::user_role THEN i.motif END
  FROM public.indisponibilites i
  WHERE i.date BETWEEN p_from AND p_to
    AND public.get_user_role(auth.uid()) IN ('admin'::user_role, 'animateur'::user_role)
  ORDER BY i.date, i.start_time
$function$;

REVOKE EXECUTE ON FUNCTION public.indisponibilites_visibles(date, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.indisponibilites_visibles(date, date) TO authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.creneaux_occupes(date, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.creneaux_occupes(date, date) TO authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.atelier_slot_conflict(date, time, time, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.atelier_slot_conflict(date, time, time, uuid) TO authenticated, service_role;

COMMIT;
