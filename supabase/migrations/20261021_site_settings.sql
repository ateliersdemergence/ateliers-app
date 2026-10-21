-- ============================================================
-- Réglages du site modifiables par les admins (ex : page Contact)
-- À exécuter UNE FOIS dans Supabase > SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS public.site_settings (
  key        text PRIMARY KEY,
  value      jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES public.users(id) ON DELETE SET NULL
);

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- Tout le monde peut lire (la page Contact est publique)
DROP POLICY IF EXISTS "Anyone can read site settings" ON public.site_settings;
CREATE POLICY "Anyone can read site settings" ON public.site_settings
  FOR SELECT USING (true);

-- Seuls les admins peuvent créer / modifier / supprimer
DROP POLICY IF EXISTS "Admin can manage site settings" ON public.site_settings;
CREATE POLICY "Admin can manage site settings" ON public.site_settings
  FOR ALL
  USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));

-- Valeurs de départ = coordonnées actuellement affichées sur le site
INSERT INTO public.site_settings (key, value) VALUES (
  'contact',
  '{
    "espace": {
      "name": "Émergence Labussière",
      "address": "96 avenue Emile Labussière, 87100 Limoges",
      "phone": "+33 7 82 76 93 41",
      "email": "emergence.labussiere@gmail.com",
      "website": "https://www.emergence-labussiere.fr/fr/"
    },
    "contacts": [
      { "name": "Pascal Charbonnier", "email": "form4business87@gmail.com", "phone": "+33 6 50 27 04 40" },
      { "name": "Jessica Mataele", "email": "contact@stratgestion.com", "phone": "+33 6 42 01 19 06" }
    ]
  }'::jsonb
) ON CONFLICT (key) DO NOTHING;
