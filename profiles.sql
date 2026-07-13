-- 1. Création de la table profiles reliée à auth.users
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id VARCHAR(255) REFERENCES tenants(id),
  name VARCHAR(255),
  email VARCHAR(255),
  role VARCHAR(50) DEFAULT 'comptable', -- client_manager, comptable, factory_admin
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Active la sécurité RLS sur la table profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Fonction helper SECURITY DEFINER pour éviter la récursion infinie RLS
CREATE OR REPLACE FUNCTION public.get_user_tenant_id()
RETURNS UUID AS $$
  SELECT tenant_id FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- Suppression des politiques de sécurité si elles existent déjà pour éviter l'erreur 42710
DROP POLICY IF EXISTS "Allow profile read for tenant members" ON public.profiles;
DROP POLICY IF EXISTS "Allow users to manage their own profile" ON public.profiles;

-- Autorise la lecture pour les membres du même tenant sans récursion
CREATE POLICY "Allow profile read for tenant members" ON public.profiles
  FOR SELECT USING (tenant_id = public.get_user_tenant_id());

-- Autorise l'insertion/modification pour soi-même
CREATE POLICY "Allow users to manage their own profile" ON public.profiles
  FOR ALL USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- 2. Trigger automatique pour insérer une ligne profil lors de la création d'un utilisateur auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, role, tenant_id)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'name', 'Nouvel Utilisateur'),
    COALESCE(new.raw_user_meta_data->>'role', 'comptable'),
    COALESCE(new.raw_user_meta_data->>'tenant_id', 'tenant_onyx_dist_1')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Déclencheur du trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. Trigger d'envoi automatique d'email lors de la création d'un Tenant
-- Active l'extension pg_net si elle n'est pas déjà présente
CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE OR REPLACE FUNCTION public.send_welcome_email_on_tenant_insert()
RETURNS TRIGGER AS $$
DECLARE
  payload JSONB;
BEGIN
  -- Préparation du payload avec le tenant_id et l'email du propriétaire
  payload := jsonb_build_object(
    'tenantId', NEW.id,
    'email', NEW.email
  );

  -- Appel asynchrone de votre Supabase Edge Function via l'extension pg_net
  PERFORM net.http_post(
    'https://izeucyvkhvrjmdviqhnk.supabase.co/functions/v1/send-welcome-email',
    payload,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' -- Votre clé anon ou service_role
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Déclencheur du trigger sur la table tenants
DROP TRIGGER IF EXISTS on_tenant_created ON public.tenants;
CREATE TRIGGER on_tenant_created
  AFTER INSERT ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION public.send_welcome_email_on_tenant_insert();
