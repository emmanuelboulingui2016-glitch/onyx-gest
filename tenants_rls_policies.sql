-- Corrige le bug de création de compte (partie 2/2) : la table tenants avait
-- RLS activé mais AUCUNE policy, donc tout accès (lecture/écriture) y était
-- bloqué pour tout utilisateur non-admin. Résultat : la création du tenant à
-- la fin de l'inscription échouait silencieusement (42501).
DROP POLICY IF EXISTS "Tenant members can read own tenant" ON public.tenants;
DROP POLICY IF EXISTS "Tenant members can insert own tenant" ON public.tenants;
DROP POLICY IF EXISTS "Tenant members can update own tenant" ON public.tenants;

CREATE POLICY "Tenant members can read own tenant" ON public.tenants
  FOR SELECT USING (id = public.get_user_tenant_id()::uuid);

-- Vérification directe via profiles (plutôt que get_user_tenant_id()) :
-- plus robuste vis-à-vis du contexte d'exécution du SECURITY DEFINER.
CREATE POLICY "Tenant members can insert own tenant" ON public.tenants
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.tenant_id = tenants.id
    )
  );

CREATE POLICY "Tenant members can update own tenant" ON public.tenants
  FOR UPDATE USING (id = public.get_user_tenant_id()::uuid)
  WITH CHECK (id = public.get_user_tenant_id()::uuid);
