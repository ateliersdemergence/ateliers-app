-- ============================================================
-- Étape 0 – Passage à Stripe : état actuel de la base (LECTURE SEULE)
-- À lancer dans Supabase > SQL Editor, tout le fichier d'un coup.
-- Ne modifie rien : uniquement des SELECT.
-- Un seul tableau de résultats (section / nom / détail), trié par section.
-- ============================================================

SELECT section, nom, detail FROM (

  -- 01. Version de PostgreSQL
  SELECT '01-version' AS section, 'server_version' AS nom, current_setting('server_version') AS detail

  UNION ALL
  -- 02. Colonnes de reservations et ateliers (type exact, obligatoire ?, défaut)
  SELECT '02-colonnes',
         c.relname || '.' || a.attname,
         format_type(a.atttypid, a.atttypmod)
           || CASE WHEN a.attnotnull THEN ' NOT NULL' ELSE ' NULL' END
           || COALESCE(' DEFAULT ' || pg_get_expr(d.adbin, d.adrelid), '')
  FROM pg_attribute a
  JOIN pg_class c ON c.oid = a.attrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = 'public'
  LEFT JOIN pg_attrdef d ON d.adrelid = a.attrelid AND d.adnum = a.attnum
  WHERE c.relname IN ('reservations', 'ateliers')
    AND a.attnum > 0 AND NOT a.attisdropped

  UNION ALL
  -- 03. Valeurs des types énumérés utilisés (reservation_status, user_role,
  --     et le type de payment_method s'il s'agit d'un enum)
  SELECT '03-enum',
         t.typname,
         string_agg(e.enumlabel, ', ' ORDER BY e.enumsortorder)
  FROM pg_type t
  JOIN pg_enum e ON e.enumtypid = t.oid
  WHERE t.typname IN ('reservation_status', 'user_role')
     OR t.oid = (SELECT a.atttypid FROM pg_attribute a
                 WHERE a.attrelid = 'public.reservations'::regclass
                   AND a.attname = 'payment_method' AND NOT a.attisdropped)
  GROUP BY t.typname

  UNION ALL
  -- 04. Contraintes (CHECK, UNIQUE, clés) sur reservations et ateliers
  SELECT '04-contraintes',
         con.conrelid::regclass::text || ' – ' || con.conname,
         pg_get_constraintdef(con.oid)
  FROM pg_constraint con
  WHERE con.conrelid IN ('public.reservations'::regclass, 'public.ateliers'::regclass)

  UNION ALL
  -- 05. Index de reservations (unicité éventuelle sur payment_id, etc.)
  SELECT '05-index', i.indexname, i.indexdef
  FROM pg_indexes i
  WHERE i.schemaname = 'public' AND i.tablename = 'reservations'

  UNION ALL
  -- 06. Triggers sur reservations et ateliers
  SELECT '06-triggers',
         t.tgrelid::regclass::text || ' – ' || t.tgname,
         pg_get_triggerdef(t.oid)
  FROM pg_trigger t
  WHERE t.tgrelid IN ('public.reservations'::regclass, 'public.ateliers'::regclass)
    AND NOT t.tgisinternal

  UNION ALL
  -- 07. Règles d'accès (RLS) sur reservations
  SELECT '07-policies',
         p.policyname || ' (' || p.cmd || ')',
         'USING: ' || COALESCE(p.qual, '-') || ' | CHECK: ' || COALESCE(p.with_check, '-')
  FROM pg_policies p
  WHERE p.schemaname = 'public' AND p.tablename = 'reservations'

  UNION ALL
  -- 08. Valeurs de payment_method réellement utilisées
  SELECT '08-payment_method',
         COALESCE(r.payment_method::text, '(vide)'),
         count(*)::text || ' réservation(s)'
  FROM public.reservations r
  GROUP BY r.payment_method::text

  UNION ALL
  -- 09. Répartition des réservations par statut
  SELECT '09-statuts', r.status::text, count(*)::text || ' réservation(s)'
  FROM public.reservations r
  GROUP BY r.status::text

  UNION ALL
  -- 10. Ateliers SANS PRIX – à compléter avant la migration
  SELECT '10-sans-prix',
         a.id::text,
         a.title || ' | ' || to_char(a.date, 'DD/MM/YYYY')
           || ' | animateur : ' || COALESCE(u.full_name, '?') || ' <' || COALESCE(u.email, '?') || '>'
  FROM public.ateliers a
  LEFT JOIN public.users u ON u.id = a.animateur_id
  WHERE a.price IS NULL

  UNION ALL
  -- 11. Ateliers au prix négatif (seraient refusés par la future contrainte)
  SELECT '11-prix-negatif', a.id::text, a.title || ' | prix : ' || a.price::text
  FROM public.ateliers a
  WHERE a.price < 0

  UNION ALL
  -- 12. Ateliers déjà en surréservation (confirmées > places)
  --     Le futur contrôle des places ne touchera pas l'existant,
  --     mais bloquera toute nouvelle inscription sur ces ateliers.
  SELECT '12-surreservation',
         a.id::text,
         a.title || ' | ' || count(r.id)::text || ' confirmée(s) pour ' || a.max_participants::text || ' place(s)'
  FROM public.ateliers a
  JOIN public.reservations r ON r.atelier_id = a.id AND r.status::text = 'confirmed'
  GROUP BY a.id, a.title, a.max_participants
  HAVING count(r.id) > a.max_participants

  UNION ALL
  -- 13. Résumé
  SELECT '13-resume', 'ateliers sans prix', count(*)::text FROM public.ateliers WHERE price IS NULL

) x
ORDER BY section, nom;
