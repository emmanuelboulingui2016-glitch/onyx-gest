// Moteur comptable SYSCOHADA (partie double) — localStorage-first, avec synchro
// best-effort vers Supabase, sur le même principe que supabaseSim.js.
import { supabase } from './supabaseClient';

// ─── Plan comptable standard (socle PME SYSCOHADA) ─────────────────────────
export const STANDARD_PLAN_COMPTABLE = [
  { numero_compte: '101', libelle: 'Capital', classe: 1, type_compte: 'passif' },
  { numero_compte: '121', libelle: 'Résultat net', classe: 1, type_compte: 'passif' },
  { numero_compte: '2183', libelle: 'Matériel informatique', classe: 2, type_compte: 'actif' },
  { numero_compte: '2841', libelle: 'Amortissements matériel informatique', classe: 2, type_compte: 'actif' },
  { numero_compte: '411', libelle: 'Clients', classe: 4, type_compte: 'actif' },
  { numero_compte: '401', libelle: 'Fournisseurs', classe: 4, type_compte: 'passif' },
  { numero_compte: '4431', libelle: 'État, TVA facturée sur ventes', classe: 4, type_compte: 'passif' },
  { numero_compte: '4432', libelle: 'État, TVA facturée sur services', classe: 4, type_compte: 'passif' },
  { numero_compte: '4451', libelle: 'État, TVA récupérable sur immobilisations', classe: 4, type_compte: 'actif' },
  { numero_compte: '4452', libelle: 'État, TVA récupérable sur achats', classe: 4, type_compte: 'actif' },
  { numero_compte: '4441', libelle: 'État, TVA due', classe: 4, type_compte: 'passif' },
  { numero_compte: '421', libelle: 'Personnel, rémunérations dues', classe: 4, type_compte: 'passif' },
  { numero_compte: '512', libelle: 'Banques', classe: 5, type_compte: 'actif' },
  { numero_compte: '571', libelle: 'Caisse', classe: 5, type_compte: 'actif' },
  { numero_compte: '601', libelle: 'Achats de marchandises', classe: 6, type_compte: 'charge' },
  { numero_compte: '622', libelle: 'Locations', classe: 6, type_compte: 'charge' },
  { numero_compte: '628', libelle: 'Services extérieurs divers', classe: 6, type_compte: 'charge' },
  { numero_compte: '641', libelle: 'Impôts et taxes', classe: 6, type_compte: 'charge' },
  { numero_compte: '661', libelle: 'Charges de personnel', classe: 6, type_compte: 'charge' },
  { numero_compte: '701', libelle: 'Ventes de marchandises', classe: 7, type_compte: 'produit' },
  { numero_compte: '706', libelle: 'Services vendus', classe: 7, type_compte: 'produit' },
  { numero_compte: '707', libelle: 'Produits accessoires', classe: 7, type_compte: 'produit' }
];

export const STANDARD_JOURNAUX = [
  { code: 'VT', libelle: 'Journal des ventes' },
  { code: 'BQ', libelle: 'Journal de banque' },
  { code: 'CA', libelle: 'Journal de caisse' },
  { code: 'OD', libelle: 'Opérations diverses' },
  { code: 'AC', libelle: 'Journal des achats' }
];

const getStore = (key, defaultVal) => {
  const data = localStorage.getItem(key);
  if (!data) {
    localStorage.setItem(key, JSON.stringify(defaultVal));
    return defaultVal;
  }
  return JSON.parse(data);
};

const setStore = (key, data) => {
  localStorage.setItem(key, JSON.stringify(data));
};

const generateId = (prefix) => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

// ─── Plan comptable & journaux (pré-remplis à la première utilisation du tenant) ──
export const seedTenantAccounting = (tenantId) => {
  const allPlans = getStore('onyx_plan_comptable', []);
  if (!allPlans.some(p => p.tenant_id === tenantId)) {
    const seeded = STANDARD_PLAN_COMPTABLE.map(c => ({
      id: generateId('pc'),
      tenant_id: tenantId,
      ...c,
      actif: true
    }));
    setStore('onyx_plan_comptable', [...allPlans, ...seeded]);
  }

  const allJournaux = getStore('onyx_journaux', []);
  if (!allJournaux.some(j => j.tenant_id === tenantId)) {
    const seeded = STANDARD_JOURNAUX.map(j => ({
      id: generateId('jr'),
      tenant_id: tenantId,
      ...j
    }));
    setStore('onyx_journaux', [...allJournaux, ...seeded]);
  }
};

export const getPlanComptable = (tenantId) => {
  seedTenantAccounting(tenantId);
  return getStore('onyx_plan_comptable', []).filter(p => p.tenant_id === tenantId);
};

export const getJournaux = (tenantId) => {
  seedTenantAccounting(tenantId);
  return getStore('onyx_journaux', []).filter(j => j.tenant_id === tenantId);
};

// Autocomplétion : par numéro de compte OU par libellé
export const searchPlanComptable = (tenantId, query) => {
  const plan = getPlanComptable(tenantId);
  const q = (query || '').trim().toLowerCase();
  if (!q) return [];
  return plan
    .filter(c => c.numero_compte.startsWith(q) || c.libelle.toLowerCase().includes(q))
    .slice(0, 8);
};

// ─── Exercice comptable (Phase 1 : un exercice ouvert par année civile, par tenant) ──
export const getOrCreateExercice = (tenantId, date = new Date()) => {
  const allExercices = getStore('onyx_exercices', []);
  const year = date.getFullYear();
  let exercice = allExercices.find(e => e.tenant_id === tenantId && e.date_debut === `${year}-01-01`);
  if (!exercice) {
    exercice = {
      id: generateId('exo'),
      tenant_id: tenantId,
      date_debut: `${year}-01-01`,
      date_fin: `${year}-12-31`,
      statut: 'ouvert',
      cloture_le: null
    };
    setStore('onyx_exercices', [...allExercices, exercice]);
  }
  return exercice;
};

// ─── Écritures comptables ────────────────────────────────────────────────────
export const getEcritures = (tenantId) => {
  return getStore('onyx_ecritures', []).filter(e => e.tenant_id === tenantId);
};

export const getLignesEcritures = (tenantId, ecritureId = null) => {
  const allEcritureIds = new Set(getEcritures(tenantId).map(e => e.id));
  const lignes = getStore('onyx_lignes_ecritures', []).filter(l => allEcritureIds.has(l.ecriture_id));
  return ecritureId ? lignes.filter(l => l.ecriture_id === ecritureId) : lignes;
};

const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

/**
 * Règle d'intégrité non négociable de la partie double : rejette toute écriture
 * où la somme des débits ne correspond pas à la somme des crédits.
 */
export const createEcriture = (tenantId, { journalCode, numeroPiece, dateEcriture, libelle, sourceType = 'manuel', sourceId = null, lignes }) => {
  if (!lignes || lignes.length < 2) {
    throw new Error("Une écriture doit comporter au moins deux lignes.");
  }

  const totalDebit = round2(lignes.reduce((acc, l) => acc + (Number(l.debit) || 0), 0));
  const totalCredit = round2(lignes.reduce((acc, l) => acc + (Number(l.credit) || 0), 0));

  if (totalDebit !== totalCredit) {
    throw new Error(`Écriture déséquilibrée : Débit ${totalDebit} ≠ Crédit ${totalCredit}. Une écriture en partie double doit toujours être équilibrée.`);
  }
  if (totalDebit === 0) {
    throw new Error("Une écriture ne peut pas avoir un total de zéro.");
  }
  lignes.forEach(l => {
    if ((Number(l.debit) || 0) > 0 && (Number(l.credit) || 0) > 0) {
      throw new Error(`La ligne sur le compte ${l.numero_compte} ne peut être débitée ET créditée en même temps.`);
    }
  });

  const journaux = getJournaux(tenantId);
  const journal = journaux.find(j => j.code === journalCode) || journaux.find(j => j.code === 'OD');
  const exercice = getOrCreateExercice(tenantId, new Date(dateEcriture || Date.now()));

  const ecriture = {
    id: generateId('ec'),
    tenant_id: tenantId,
    journal_id: journal.id,
    journal_code: journal.code,
    numero_piece: numeroPiece,
    date_ecriture: dateEcriture || new Date().toISOString().split('T')[0],
    libelle,
    exercice_id: exercice.id,
    lettrage_statut: 'non_lettre',
    source_type: sourceType,
    source_id: sourceId,
    created_at: new Date().toISOString()
  };

  const savedLignes = lignes.map(l => ({
    id: generateId('le'),
    ecriture_id: ecriture.id,
    numero_compte: l.numero_compte,
    libelle: l.libelle || libelle,
    debit: Number(l.debit) || 0,
    credit: Number(l.credit) || 0,
    lettrage_code: l.lettrage_code || null
  }));

  const allEcritures = getStore('onyx_ecritures', []);
  setStore('onyx_ecritures', [...allEcritures, ecriture]);

  const allLignes = getStore('onyx_lignes_ecritures', []);
  setStore('onyx_lignes_ecritures', [...allLignes, ...savedLignes]);

  // Synchro best-effort vers Supabase (comme le reste de l'app)
  if (supabase) {
    supabase.from('ecritures').insert([ecriture]).then(({ error }) => {
      if (error) console.error("❌ Synchro Supabase (ecritures) :", error.message);
    });
    supabase.from('lignes_ecritures').insert(savedLignes).then(({ error }) => {
      if (error) console.error("❌ Synchro Supabase (lignes_ecritures) :", error.message);
    });
  }

  return { ecriture, lignes: savedLignes };
};

const hasEcritureForSource = (tenantId, sourceType, sourceId) => {
  return getEcritures(tenantId).some(e => e.source_type === sourceType && e.source_id === sourceId);
};

/**
 * Facture émise : Débit 411 (Clients) / Crédit 701 (Ventes) + 4431 (TVA facturée).
 * Idempotent : une seule écriture générée par facture.
 */
export const generateEcritureFromInvoiceIssued = (tenantId, invoice) => {
  if (hasEcritureForSource(tenantId, 'facture', invoice.id)) return null;

  const taxRate = invoice.tax_rate || 0;
  const montantHT = Math.round(invoice.amount / (1 + taxRate / 100));
  const montantTVA = invoice.amount - montantHT;

  const lignes = [
    { numero_compte: '411', libelle: `Facture ${invoice.number} - ${invoice.client_name}`, debit: invoice.amount, credit: 0 },
    { numero_compte: '701', libelle: `Vente - ${invoice.client_name}`, debit: 0, credit: montantHT }
  ];
  if (montantTVA > 0) {
    lignes.push({ numero_compte: '4431', libelle: `TVA facturée - ${invoice.number}`, debit: 0, credit: montantTVA });
  }

  return createEcriture(tenantId, {
    journalCode: 'VT',
    numeroPiece: invoice.number,
    dateEcriture: invoice.date,
    libelle: `Facture ${invoice.number} - ${invoice.client_name}`,
    sourceType: 'facture',
    sourceId: invoice.id,
    lignes
  });
};

/**
 * Encaissement d'une facture : Débit 512 (Banque) / Crédit 411 (Clients),
 * puis lettrage automatique avec l'écriture de facturation d'origine.
 */
export const generateEcritureFromPayment = (tenantId, invoice) => {
  if (hasEcritureForSource(tenantId, 'paiement', invoice.id)) return null;

  // Garantit que la vente a bien été comptabilisée avant l'encaissement (ex: facture
  // marquée payée sans être passée par l'étape d'émission), sinon le compte 411 se
  // retrouverait crédité sans contrepartie et afficherait un solde négatif absurde.
  if (!hasEcritureForSource(tenantId, 'facture', invoice.id)) {
    generateEcritureFromInvoiceIssued(tenantId, invoice);
  }

  const lettrageCode = generateId('lt');

  const result = createEcriture(tenantId, {
    journalCode: 'BQ',
    numeroPiece: `ENC-${invoice.number}`,
    dateEcriture: new Date().toISOString().split('T')[0],
    libelle: `Encaissement facture ${invoice.number} - ${invoice.client_name}`,
    sourceType: 'paiement',
    sourceId: invoice.id,
    lignes: [
      { numero_compte: '512', libelle: `Encaissement ${invoice.number}`, debit: invoice.amount, credit: 0 },
      { numero_compte: '411', libelle: `Solde ${invoice.number}`, debit: 0, credit: invoice.amount, lettrage_code: lettrageCode }
    ]
  });

  // Lettrage : on marque également la ligne 411 (débit) de l'écriture de facturation d'origine
  const factureEcriture = getEcritures(tenantId).find(e => e.source_type === 'facture' && e.source_id === invoice.id);
  if (factureEcriture) {
    const allLignes = getStore('onyx_lignes_ecritures', []);
    const updatedLignes = allLignes.map(l =>
      l.ecriture_id === factureEcriture.id && l.numero_compte === '411'
        ? { ...l, lettrage_code: lettrageCode }
        : l
    );
    setStore('onyx_lignes_ecritures', updatedLignes);

    const allEcritures = getStore('onyx_ecritures', []);
    const updatedEcritures = allEcritures.map(e =>
      (e.id === factureEcriture.id || e.id === result.ecriture.id)
        ? { ...e, lettrage_statut: 'lettre' }
        : e
    );
    setStore('onyx_ecritures', updatedEcritures);
  }

  return result;
};

// ─── Balance & agrégations (pour le Grand Livre, la Balance, et la Vue Dirigeant) ──
export const getBalance = (tenantId, { dateDebut, dateFin } = {}) => {
  const ecritures = getEcritures(tenantId).filter(e => {
    if (dateDebut && e.date_ecriture < dateDebut) return false;
    if (dateFin && e.date_ecriture > dateFin) return false;
    return true;
  });
  const ecritureIds = new Set(ecritures.map(e => e.id));
  const lignes = getStore('onyx_lignes_ecritures', []).filter(l => ecritureIds.has(l.ecriture_id));

  const parCompte = {};
  lignes.forEach(l => {
    if (!parCompte[l.numero_compte]) {
      parCompte[l.numero_compte] = { numero_compte: l.numero_compte, total_debit: 0, total_credit: 0 };
    }
    parCompte[l.numero_compte].total_debit += l.debit;
    parCompte[l.numero_compte].total_credit += l.credit;
  });

  return Object.values(parCompte)
    .map(c => ({ ...c, solde: round2(c.total_debit - c.total_credit) }))
    .sort((a, b) => a.numero_compte.localeCompare(b.numero_compte));
};

// Somme des soldes (débit - crédit) pour un ensemble de préfixes de compte
export const sumSoldeByPrefix = (balance, prefixes) => {
  return round2(
    balance
      .filter(c => prefixes.some(p => c.numero_compte.startsWith(p)))
      .reduce((acc, c) => acc + c.solde, 0)
  );
};

const currentMonthRange = () => {
  const now = new Date();
  const debut = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const fin = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
  return { dateDebut: debut, dateFin: fin };
};

/**
 * Calcule les 4 indicateurs de la Vue Dirigeant, sans aucun terme comptable technique.
 * Voir ONYX_GEST_MODULE_COMPTABILITE_COMPLET.md, Partie B.
 */
export const getIndicateursDirigeant = (tenantId) => {
  const balanceGlobale = getBalance(tenantId);
  const { dateDebut, dateFin } = currentMonthRange();
  const balanceMois = getBalance(tenantId, { dateDebut, dateFin });

  const argentDisponible = sumSoldeByPrefix(balanceGlobale, ['512', '571']);
  const onVousDoit = sumSoldeByPrefix(balanceGlobale, ['411']);
  const vousDevez = -sumSoldeByPrefix(balanceGlobale, ['401', '4441']);
  const produitsMois = -sumSoldeByPrefix(balanceMois, ['7']);
  const chargesMois = sumSoldeByPrefix(balanceMois, ['6']);
  const resteMois = round2(produitsMois - chargesMois);

  return {
    argentDisponible,
    onVousDoit,
    vousDevez,
    resteMois,
    produitsMois,
    chargesMois
  };
};
