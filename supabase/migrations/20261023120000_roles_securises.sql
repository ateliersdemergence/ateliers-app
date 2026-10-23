-- ============================================================
-- Sécurisation des rôles utilisateurs
-- À exécuter UNE FOIS dans Supabase > SQL Editor (tout le fichier d'un coup)
--
-- Corrige :
--  1. handle_new_user lisait le rôle dans raw_user_meta_data
--     → une inscription publique avec role=admin créait un admin
--  2. la policy "Users can update own profile" n'a pas de restriction de colonne
--     → un utilisateur pouvait se passer role='admin' / is_super_admin=true
--
-- public.users.role reste la référence (utilisée par l'appli et les policies RLS).
-- Il est recopié automatiquement dans auth.users.raw_app_meta_data (non modifiable
-- par l'utilisateur).
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- Étape 2 : création du profil – le rôle des métadonnées est restreint
-- Une inscription publique ne peut donner que participant ou collaborateur.
-- animateur / admin ne sont attribués que par un admin ou le serveur.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.users (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'full_name', ''), 'Utilisateur'),
    CASE
      WHEN NEW.raw_user_meta_data->>'role' = 'collaborateur' THEN 'collaborateur'::user_role
      ELSE 'participant'::user_role
    END
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$function$;

-- ------------------------------------------------------------
-- Étape 3 : protection des colonnes role et is_super_admin
-- ------------------------------------------------------------

-- Petit helper (SECURITY DEFINER pour ne pas dépendre des policies de public.users)
CREATE OR REPLACE FUNCTION public.is_super_admin(uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT COALESCE((SELECT is_super_admin FROM public.users WHERE id = uid), false)
$function$;

-- SECURITY INVOKER (par défaut) : current_user = rôle réel de l'appelant
-- (anon / authenticated depuis le navigateur, service_role depuis le serveur,
--  postgres depuis le SQL Editor ou les triggers SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.protect_user_privileges()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.role IS NOT DISTINCT FROM OLD.role
     AND NEW.is_super_admin IS NOT DISTINCT FROM OLD.is_super_admin THEN
    RETURN NEW;
  END IF;

  -- Serveur (service_role), SQL Editor, triggers internes : autorisé
  IF current_user NOT IN ('anon', 'authenticated') THEN
    RETURN NEW;
  END IF;

  -- is_super_admin ne se modifie jamais depuis le navigateur
  IF NEW.is_super_admin IS DISTINCT FROM OLD.is_super_admin THEN
    RAISE EXCEPTION 'Modification de is_super_admin interdite'
      USING ERRCODE = '42501';
  END IF;

  -- Seul un admin peut changer un rôle
  IF auth.uid() IS NULL OR public.get_user_role(auth.uid()) IS DISTINCT FROM 'admin'::user_role THEN
    RAISE EXCEPTION 'Seul un administrateur peut modifier un rôle'
      USING ERRCODE = '42501';
  END IF;

  -- Donner ou retirer le rôle admin : réservé au super admin (comme dans l'interface)
  IF (OLD.role = 'admin'::user_role OR NEW.role = 'admin'::user_role)
     AND NOT public.is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Seul le super administrateur peut donner ou retirer le rôle admin'
      USING ERRCODE = '42501';
  END IF;

  -- Un super admin ne peut pas être rétrogradé depuis le navigateur
  IF OLD.is_super_admin THEN
    RAISE EXCEPTION 'Le rôle du super administrateur ne peut pas être modifié'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS protect_user_privileges ON public.users;
CREATE TRIGGER protect_user_privileges
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.protect_user_privileges();

-- ------------------------------------------------------------
-- Étape 4 : synchronisation public.users.role → auth.users.raw_app_meta_data
-- (l'opérateur || conserve les autres clés : provider, providers…)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_role_to_app_metadata()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE auth.users
  SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb)
                          || jsonb_build_object('role', NEW.role::text)
  WHERE id = NEW.id
    AND (raw_app_meta_data->>'role') IS DISTINCT FROM NEW.role::text;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS sync_role_to_app_metadata ON public.users;
CREATE TRIGGER sync_role_to_app_metadata
  AFTER INSERT OR UPDATE OF role ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.sync_role_to_app_metadata();

-- ------------------------------------------------------------
-- Étape 5 : comptes existants – recopie depuis public.users
-- ------------------------------------------------------------
UPDATE auth.users a
SET raw_app_meta_data = COALESCE(a.raw_app_meta_data, '{}'::jsonb)
                        || jsonb_build_object('role', u.role::text)
FROM public.users u
WHERE u.id = a.id
  AND (a.raw_app_meta_data->>'role') IS DISTINCT FROM u.role::text;

COMMIT;
