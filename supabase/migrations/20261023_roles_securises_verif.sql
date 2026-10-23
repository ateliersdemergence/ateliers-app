-- ============================================================
-- Vérification après 20261023_roles_securises.sql (lecture seule)
-- ============================================================
SELECT * FROM (
  -- Les deux nouveaux triggers doivent apparaître
  SELECT '1-trigger' AS kind, t.tgname AS name, pg_get_triggerdef(t.oid) AS detail
  FROM pg_trigger t
  WHERE t.tgrelid = 'public.users'::regclass AND NOT t.tgisinternal

  UNION ALL
  -- handle_new_user ne doit plus contenir de cast "::user_role" sur les métadonnées
  SELECT '2-handle_new_user',
         CASE WHEN pg_get_functiondef('public.handle_new_user'::regproc) LIKE '%->>''role'')::user_role%'
              THEN 'ANCIENNE VERSION (faille)' ELSE 'OK – version corrigée' END,
         ''

  UNION ALL
  -- Doit afficher 0 : comptes dont app_metadata.role diffère de public.users.role
  SELECT '3-desynchro', 'comptes non synchronisés', count(*)::text
  FROM public.users u JOIN auth.users a ON a.id = u.id
  WHERE (a.raw_app_meta_data->>'role') IS DISTINCT FROM u.role::text

  UNION ALL
  -- provider / providers doivent toujours être présents
  SELECT '4-app_metadata', u.role::text || ' – ' || u.email, a.raw_app_meta_data::text
  FROM public.users u JOIN auth.users a ON a.id = u.id
) x
ORDER BY kind, name;
