-- Corrige le bug de création de compte : la table tenants n'avait pas ces
-- colonnes, alors que l'onboarding (TenantContext.jsx > simulatedSaveConfig)
-- essaie de les écrire à la fin de l'inscription. L'échec était silencieux
-- côté client, donnant l'illusion qu'un compte avait été créé.
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS rccm TEXT,
  ADD COLUMN IF NOT EXISTS nif TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS email TEXT;
