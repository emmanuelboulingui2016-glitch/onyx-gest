-- Module Comptabilité SYSCOHADA — Phase 1 (Partie A du cahier des charges)
-- Voir ONYX_GEST_MODULE_COMPTABILITE_COMPLET.md
-- Prérequis : table public.tenants (id uuid) et la fonction public.get_user_tenant_id()
-- définie dans profiles.sql doivent déjà exister.

-- ─── 1. Plan comptable ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.plan_comptable (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  numero_compte VARCHAR(8) NOT NULL,
  libelle TEXT NOT NULL,
  classe SMALLINT NOT NULL,
  type_compte VARCHAR(20) NOT NULL, -- 'actif' | 'passif' | 'charge' | 'produit'
  compte_parent VARCHAR(8),
  actif BOOLEAN DEFAULT true,
  UNIQUE(tenant_id, numero_compte)
);

ALTER TABLE public.plan_comptable ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant members can read plan_comptable" ON public.plan_comptable;
DROP POLICY IF EXISTS "Tenant members can manage plan_comptable" ON public.plan_comptable;

CREATE POLICY "Tenant members can read plan_comptable" ON public.plan_comptable
  FOR SELECT USING (tenant_id = public.get_user_tenant_id()::uuid);

CREATE POLICY "Tenant members can manage plan_comptable" ON public.plan_comptable
  FOR ALL USING (tenant_id = public.get_user_tenant_id()::uuid)
  WITH CHECK (tenant_id = public.get_user_tenant_id()::uuid);

-- ─── 2. Journaux ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.journaux (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  code VARCHAR(4) NOT NULL,        -- 'VT', 'BQ', 'CA', 'OD', 'AC'
  libelle TEXT NOT NULL,
  UNIQUE(tenant_id, code)
);

ALTER TABLE public.journaux ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant members can read journaux" ON public.journaux;
DROP POLICY IF EXISTS "Tenant members can manage journaux" ON public.journaux;

CREATE POLICY "Tenant members can read journaux" ON public.journaux
  FOR SELECT USING (tenant_id = public.get_user_tenant_id()::uuid);

CREATE POLICY "Tenant members can manage journaux" ON public.journaux
  FOR ALL USING (tenant_id = public.get_user_tenant_id()::uuid)
  WITH CHECK (tenant_id = public.get_user_tenant_id()::uuid);

-- ─── 3. Exercices comptables ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.exercices_comptables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  date_debut DATE NOT NULL,
  date_fin DATE NOT NULL,
  statut VARCHAR(10) DEFAULT 'ouvert',   -- 'ouvert' | 'cloture'
  cloture_le TIMESTAMPTZ
);

ALTER TABLE public.exercices_comptables ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant members can read exercices" ON public.exercices_comptables;
DROP POLICY IF EXISTS "Tenant members can manage exercices" ON public.exercices_comptables;

CREATE POLICY "Tenant members can read exercices" ON public.exercices_comptables
  FOR SELECT USING (tenant_id = public.get_user_tenant_id()::uuid);

CREATE POLICY "Tenant members can manage exercices" ON public.exercices_comptables
  FOR ALL USING (tenant_id = public.get_user_tenant_id()::uuid)
  WITH CHECK (tenant_id = public.get_user_tenant_id()::uuid);

-- ─── 4. Écritures (en-tête) ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ecritures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  journal_id UUID NOT NULL REFERENCES public.journaux(id),
  numero_piece VARCHAR(30) NOT NULL,
  date_ecriture DATE NOT NULL,
  libelle TEXT NOT NULL,
  exercice_id UUID NOT NULL REFERENCES public.exercices_comptables(id),
  lettrage_statut VARCHAR(10) DEFAULT 'non_lettre',
  source_type VARCHAR(20),                -- 'facture' | 'paiement' | 'manuel'
  source_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.ecritures ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant members can read ecritures" ON public.ecritures;
DROP POLICY IF EXISTS "Tenant members can manage ecritures" ON public.ecritures;

CREATE POLICY "Tenant members can read ecritures" ON public.ecritures
  FOR SELECT USING (tenant_id = public.get_user_tenant_id()::uuid);

CREATE POLICY "Tenant members can manage ecritures" ON public.ecritures
  FOR ALL USING (tenant_id = public.get_user_tenant_id()::uuid)
  WITH CHECK (tenant_id = public.get_user_tenant_id()::uuid);

-- ─── 5. Lignes d'écritures ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.lignes_ecritures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ecriture_id UUID NOT NULL REFERENCES public.ecritures(id) ON DELETE CASCADE,
  numero_compte VARCHAR(8) NOT NULL,
  libelle TEXT,
  debit NUMERIC(15,2) DEFAULT 0,
  credit NUMERIC(15,2) DEFAULT 0,
  lettrage_code VARCHAR(10),
  CHECK (debit = 0 OR credit = 0)
);

ALTER TABLE public.lignes_ecritures ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant members can read lignes_ecritures" ON public.lignes_ecritures;
DROP POLICY IF EXISTS "Tenant members can manage lignes_ecritures" ON public.lignes_ecritures;

-- Pas de tenant_id direct sur cette table : on passe par l'écriture parente
CREATE POLICY "Tenant members can read lignes_ecritures" ON public.lignes_ecritures
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.ecritures e WHERE e.id = ecriture_id AND e.tenant_id = public.get_user_tenant_id()::uuid)
  );

CREATE POLICY "Tenant members can manage lignes_ecritures" ON public.lignes_ecritures
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.ecritures e WHERE e.id = ecriture_id AND e.tenant_id = public.get_user_tenant_id()::uuid)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.ecritures e WHERE e.id = ecriture_id AND e.tenant_id = public.get_user_tenant_id()::uuid)
  );

-- ─── 6. Règle non négociable : une écriture doit toujours être équilibrée ─────
-- (Débit total = Crédit total sur l'ensemble des lignes d'une même écriture)
CREATE OR REPLACE FUNCTION public.check_ecriture_equilibree()
RETURNS TRIGGER AS $$
DECLARE
  target_ecriture_id UUID;
  total_debit NUMERIC(15,2);
  total_credit NUMERIC(15,2);
  exercice_statut VARCHAR(10);
BEGIN
  target_ecriture_id := COALESCE(NEW.ecriture_id, OLD.ecriture_id);

  -- Un exercice clôturé est intégralement figé
  SELECT ex.statut INTO exercice_statut
  FROM public.ecritures e
  JOIN public.exercices_comptables ex ON ex.id = e.exercice_id
  WHERE e.id = target_ecriture_id;

  IF exercice_statut = 'cloture' THEN
    RAISE EXCEPTION 'Exercice clôturé : aucune écriture ne peut plus être modifiée.';
  END IF;

  SELECT COALESCE(SUM(debit), 0), COALESCE(SUM(credit), 0)
  INTO total_debit, total_credit
  FROM public.lignes_ecritures
  WHERE ecriture_id = target_ecriture_id;

  IF total_debit <> total_credit THEN
    RAISE EXCEPTION 'Écriture déséquilibrée (id=%) : Débit % ≠ Crédit %. La partie double doit toujours être respectée.', target_ecriture_id, total_debit, total_credit;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_check_ecriture_equilibree ON public.lignes_ecritures;
CREATE CONSTRAINT TRIGGER trg_check_ecriture_equilibree
  AFTER INSERT OR UPDATE OR DELETE ON public.lignes_ecritures
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION public.check_ecriture_equilibree();

-- ─── 7. Seed automatique du plan comptable + journaux à la création d'un tenant ──
-- Fonction réutilisable (appelée par le trigger ET par le backfill ci-dessous).
CREATE OR REPLACE FUNCTION public.seed_tenant_accounting_for(p_tenant_id UUID)
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.plan_comptable (tenant_id, numero_compte, libelle, classe, type_compte)
  VALUES
    (p_tenant_id, '101', 'Capital', 1, 'passif'),
    (p_tenant_id, '121', 'Résultat net', 1, 'passif'),
    (p_tenant_id, '2183', 'Matériel informatique', 2, 'actif'),
    (p_tenant_id, '2841', 'Amortissements matériel informatique', 2, 'actif'),
    (p_tenant_id, '411', 'Clients', 4, 'actif'),
    (p_tenant_id, '401', 'Fournisseurs', 4, 'passif'),
    (p_tenant_id, '4431', 'État, TVA facturée sur ventes', 4, 'passif'),
    (p_tenant_id, '4432', 'État, TVA facturée sur services', 4, 'passif'),
    (p_tenant_id, '4451', 'État, TVA récupérable sur immobilisations', 4, 'actif'),
    (p_tenant_id, '4452', 'État, TVA récupérable sur achats', 4, 'actif'),
    (p_tenant_id, '4441', 'État, TVA due', 4, 'passif'),
    (p_tenant_id, '421', 'Personnel, rémunérations dues', 4, 'passif'),
    (p_tenant_id, '512', 'Banques', 5, 'actif'),
    (p_tenant_id, '571', 'Caisse', 5, 'actif'),
    (p_tenant_id, '601', 'Achats de marchandises', 6, 'charge'),
    (p_tenant_id, '622', 'Locations', 6, 'charge'),
    (p_tenant_id, '628', 'Services extérieurs divers', 6, 'charge'),
    (p_tenant_id, '641', 'Impôts et taxes', 6, 'charge'),
    (p_tenant_id, '661', 'Charges de personnel', 6, 'charge'),
    (p_tenant_id, '701', 'Ventes de marchandises', 7, 'produit'),
    (p_tenant_id, '706', 'Services vendus', 7, 'produit'),
    (p_tenant_id, '707', 'Produits accessoires', 7, 'produit')
  ON CONFLICT (tenant_id, numero_compte) DO NOTHING;

  INSERT INTO public.journaux (tenant_id, code, libelle)
  VALUES
    (p_tenant_id, 'VT', 'Journal des ventes'),
    (p_tenant_id, 'BQ', 'Journal de banque'),
    (p_tenant_id, 'CA', 'Journal de caisse'),
    (p_tenant_id, 'OD', 'Opérations diverses'),
    (p_tenant_id, 'AC', 'Journal des achats')
  ON CONFLICT (tenant_id, code) DO NOTHING;

  INSERT INTO public.exercices_comptables (tenant_id, date_debut, date_fin, statut)
  SELECT p_tenant_id, date_trunc('year', now())::date, (date_trunc('year', now()) + interval '1 year' - interval '1 day')::date, 'ouvert'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.exercices_comptables
    WHERE tenant_id = p_tenant_id AND date_debut = date_trunc('year', now())::date
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.seed_tenant_accounting()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM public.seed_tenant_accounting_for(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_tenant_created_seed_accounting ON public.tenants;
CREATE TRIGGER on_tenant_created_seed_accounting
  AFTER INSERT ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION public.seed_tenant_accounting();

-- ─── 8. Backfill : le trigger ci-dessus ne couvre que les FUTURS tenants.
-- On amorce ici le plan comptable de tous les tenants déjà existants en base
-- (idempotent — peut être rejoué sans risque).
DO $$
DECLARE
  t RECORD;
BEGIN
  FOR t IN SELECT id FROM public.tenants LOOP
    PERFORM public.seed_tenant_accounting_for(t.id);
  END LOOP;
END;
$$;
