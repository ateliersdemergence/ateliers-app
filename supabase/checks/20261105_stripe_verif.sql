-- ============================================================
-- Vérification après 20261105120000_stripe_reservations.sql (LECTURE SEULE)
-- À lancer dans Supabase > SQL Editor, tout le fichier d'un coup.
-- Chaque ligne doit afficher "OK".
-- ============================================================

SELECT controle, CASE WHEN ok THEN 'OK' ELSE 'MANQUANT / INCORRECT' END AS resultat FROM (

  SELECT '01 statut pending_payment' AS controle,
         EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
                 WHERE t.typname = 'reservation_status' AND e.enumlabel = 'pending_payment') AS ok

  UNION ALL
  SELECT '02 colonnes Stripe (3)',
         (SELECT count(*) FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'reservations'
            AND column_name IN ('stripe_checkout_session_id', 'stripe_payment_intent_id', 'payment_expires_at')) = 3

  UNION ALL
  SELECT '03 index uniques Stripe (2)',
         (SELECT count(*) FROM pg_indexes
          WHERE schemaname = 'public' AND tablename = 'reservations'
            AND indexname IN ('reservations_stripe_checkout_session_id_key',
                              'reservations_stripe_payment_intent_id_key')) = 2

  UNION ALL
  SELECT '04 contraintes reservations (2)',
         (SELECT count(*) FROM pg_constraint
          WHERE conrelid = 'public.reservations'::regclass
            AND conname IN ('reservations_pending_payment_expires_check',
                            'reservations_payment_method_check')) = 2

  UNION ALL
  SELECT '05 prix : contrainte >= 0',
         EXISTS (SELECT 1 FROM pg_constraint
                 WHERE conrelid = 'public.ateliers'::regclass AND conname = 'ateliers_price_check')

  UNION ALL
  SELECT '06 prix : obligatoire, sans défaut',
         EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema = 'public' AND table_name = 'ateliers' AND column_name = 'price'
                   AND is_nullable = 'NO' AND column_default IS NULL)

  UNION ALL
  SELECT '07 vue : compte les attentes de paiement',
         pg_get_viewdef('public.ateliers_with_spots'::regclass) LIKE '%pending_payment%'

  UNION ALL
  SELECT '08 trigger protection : version Stripe',
         pg_get_functiondef('public.protect_reservation_status'::regproc) LIKE '%stripe_payment_intent_id%'

  UNION ALL
  SELECT '09 trigger contrôle des places',
         EXISTS (SELECT 1 FROM pg_trigger
                 WHERE tgrelid = 'public.reservations'::regclass
                   AND tgname = 'check_reservation_capacity' AND NOT tgisinternal)

  UNION ALL
  SELECT '10 contrôle des places : SECURITY DEFINER',
         (SELECT prosecdef FROM pg_proc WHERE oid = 'public.check_reservation_capacity'::regproc)

  UNION ALL
  SELECT '11 aucune surréservation existante',
         NOT EXISTS (SELECT 1 FROM public.ateliers_with_spots WHERE spots_remaining < 0)

) x
ORDER BY controle;
