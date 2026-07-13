# Cahier des charges — Module Comptabilité SYSCOHADA + Vue Simplifiée Dirigeant + Ergonomie Comptable

**Objectif** : transformer Onyx Gest d'un outil de *gestion commerciale* (devis, factures, relances) en un véritable outil *comptable*, conforme au référentiel SYSCOHADA révisé (obligatoire au Gabon, zone OHADA) — **tout en restant lisible et pilotable par un chef d'entreprise qui n'est pas comptable, ET rapide et agréable à utiliser au quotidien pour le comptable lui-même.**

**Principe directeur** : une seule base de données conforme SYSCOHADA, mais deux niveaux de lecture selon le rôle de l'utilisateur (déjà présents dans `TenantContext.jsx`), chacun optimisé pour son propre usage :
- **Rôle `comptable`** → module technique complet (journaux, écritures, plan comptable, grand livre, balance), mais pensé pour aller vite : saisie façon tableur, automatisations, modèles réutilisables — *pas* de jargon en moins (il le connaît et en a besoin), mais le moins de clics et de ressaisie possible
- **Rôle `client_manager`** (le dirigeant) → tableau de bord traduit en langage courant, zéro jargon

**Avertissement important** : ce document spécifie une architecture technique fonctionnellement alignée sur le SYSCOHADA. Il ne remplace pas la validation d'un expert-comptable agréé — la certification des comptes annuels et le dépôt de la DSF restent de son ressort. L'objectif est que l'outil produise des données fiables et conformes, que l'expert-comptable n'a plus qu'à valider plutôt qu'à ressaisir.

---

## PARTIE A — Le moteur comptable (SYSCOHADA)

### A.1 Principe fondamental : la partie double

Aujourd'hui, Onyx Gest enregistre des faits commerciaux (une facture, un statut "payé"). Une vraie comptabilité enregistre des **écritures en partie double** : chaque opération génère au moins une ligne au débit et une ligne au crédit, dont la somme est toujours égale.

> Exemple : facture de 590 000 FCFA TTC (500 000 HT + 90 000 TVA) émise à un client.
> - Débit 411 (Clients) : 590 000
> - Crédit 701 (Ventes) : 500 000
> - Crédit 4431 (État, TVA facturée sur ventes) : 90 000

C'est ce mécanisme qui manque entièrement à Onyx Gest aujourd'hui : la table `invoices` stocke un montant et un statut, mais ne génère aucune écriture comptable.

### A.2 Plan comptable SYSCOHADA — comptes à intégrer

Le plan comptable complet SYSCOHADA compte plusieurs centaines de comptes répartis en 8 classes obligatoires (+ 1 classe 9 facultative d'analytique). Pour une PME commerciale/services comme celles ciblées par Onyx Gest, voici le socle minimal viable (extensible ensuite) :

| Classe | Rôle | Comptes clés pour Onyx Gest |
|---|---|---|
| 1 | Ressources durables | 101 Capital, 121 Résultat net |
| 2 | Actif immobilisé | 2183 Matériel informatique, 2841 Amortissements |
| 3 | Stocks | 31 Marchandises (si applicable) |
| 4 | Comptes de tiers | **411** Clients, **401** Fournisseurs, **4431** TVA facturée sur ventes, **4432** TVA facturée sur services, **4451/4452** TVA récupérable, **4441** TVA due, **421-422** Personnel |
| 5 | Trésorerie | **512** Banques, **571** Caisse |
| 6 | Charges | 601-608 Achats, 622 Locations, 628 Services extérieurs, 641 Impôts et taxes, 66 Charges de personnel |
| 7 | Produits | **701** Ventes de marchandises, **706** Services vendus, **707** Produits accessoires |
| 8 | Charges/produits HAO | 81/82 (hors activités ordinaires — rare pour une PME) |

**Table `plan_comptable`** (Supabase) :
```sql
create table plan_comptable (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id),
  numero_compte varchar(8) not null,       -- ex: '4111', '701'
  libelle text not null,
  classe smallint not null,                -- 1 à 8
  type_compte varchar(20) not null,        -- 'actif' | 'passif' | 'charge' | 'produit'
  compte_parent varchar(8),                -- pour la hiérarchie (411 -> 4111)
  actif boolean default true,
  unique(tenant_id, numero_compte)
);
```
Le plan comptable est pré-rempli à la création de chaque tenant (seed standard), avec possibilité pour le comptable d'ajouter des sous-comptes par client (ex: `4111-MBAFILS` pour un compte client auxiliaire, pratique courante en SYSCOHADA).

### A.3 Journaux comptables

Toute écriture doit appartenir à un journal. Les journaux minimums :

| Code | Journal | Alimenté par |
|---|---|---|
| VT | Journal des ventes | Facturation.jsx (création facture) |
| BQ | Journal de banque | Encaissements/décaissements bancaires |
| CA | Journal de caisse | Encaissements espèces |
| OD | Opérations diverses | Écritures manuelles (régularisations, à-nouveaux) |
| AC | Journal des achats | Dépenses/fournisseurs (module à créer si absent) |

**Table `journaux`** :
```sql
create table journaux (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id),
  code varchar(4) not null,        -- 'VT', 'BQ', 'CA', 'OD', 'AC'
  libelle text not null,
  unique(tenant_id, code)
);
```

### A.4 Écritures comptables — cœur du module

**Table `ecritures`** (l'en-tête d'une écriture) :
```sql
create table ecritures (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id),
  journal_id uuid not null references journaux(id),
  numero_piece varchar(30) not null,      -- ex: 'FAC-2026-0001'
  date_ecriture date not null,
  libelle text not null,
  exercice_id uuid not null references exercices_comptables(id),
  lettrage_statut varchar(10) default 'non_lettre',
  source_type varchar(20),                -- 'facture' | 'paiement' | 'manuel'
  source_id uuid,                         -- FK vers invoices.id si généré automatiquement
  created_at timestamptz default now()
);

create table lignes_ecritures (
  id uuid primary key default gen_random_uuid(),
  ecriture_id uuid not null references ecritures(id) on delete cascade,
  numero_compte varchar(8) not null,
  libelle text,
  debit numeric(15,2) default 0,
  credit numeric(15,2) default 0,
  lettrage_code varchar(10),              -- pour rapprocher facture <-> règlement
  check (debit = 0 or credit = 0)          -- une ligne ne peut être débit ET crédit
);
```

**Règle d'intégrité non négociable** : à l'enregistrement, vérifier `SUM(debit) = SUM(credit)` sur toutes les lignes d'une écriture. Rejeter toute écriture déséquilibrée — c'est la règle la plus fondamentale de toute comptabilité en partie double, et actuellement rien dans Onyx Gest ne l'impose.

**Génération automatique depuis l'existant** — le point fort : `Facturation.jsx` a déjà toutes les données nécessaires (montant HT, TVA, client). Il suffit de générer l'écriture automatiquement :

- **Facture créée** (statut `brouillon` → `envoyee`) : générer l'écriture Débit 411 / Crédit 701+4431 (voir exemple A.1)
- **Facture marquée payée** : générer l'écriture Débit 512 (ou 571) / Crédit 411, et lettrer automatiquement avec l'écriture de facturation d'origine

C'est la connexion la plus importante à faire, et celle qui apporte le plus de valeur immédiatement : le comptable de ton client n'a plus besoin de ressaisir chaque facture dans un tableur externe.

### A.5 Grand livre et balance

- **Grand livre** : liste chronologique de toutes les écritures, regroupées par compte.
- **Balance générale** : pour chaque compte, total débit / total crédit / solde, sur une période — le document que tout comptable demandera en premier pour vérifier la cohérence de tes chiffres.

```sql
-- Exemple de requête balance (simplifié)
select numero_compte,
       sum(debit) as total_debit,
       sum(credit) as total_credit,
       sum(debit) - sum(credit) as solde
from lignes_ecritures le
join ecritures e on e.id = le.ecriture_id
where e.tenant_id = :tenant_id and e.date_ecriture between :debut and :fin
group by numero_compte
order by numero_compte;
```

### A.6 États financiers obligatoires

Le SYSCOHADA impose la production de : **Bilan**, **Compte de résultat**, **TAFIRE** (tableau des flux de trésorerie), et des **notes annexes**. Pour une PME (système allégé, sous les seuils du système normal), certains éléments peuvent être simplifiés — à valider avec l'expert-comptable selon le chiffre d'affaires réel du client.

- **Bilan** : Actif (classes 2, 3, 4 débiteurs, 5 débiteurs) = Passif (classe 1, 4 créditeurs, résultat)
- **Compte de résultat** : Produits (classe 7) − Charges (classe 6) = Résultat net
- **TAFIRE** : variation de trésorerie sur la période, ventilée par activité opérationnelle/investissement/financement

Ces trois documents sont des agrégations de la balance, pas des saisies supplémentaires — générables automatiquement une fois la balance fiabilisée.

### A.7 Clôture d'exercice

**Table `exercices_comptables`** :
```sql
create table exercices_comptables (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id),
  date_debut date not null,
  date_fin date not null,
  statut varchar(10) default 'ouvert',   -- 'ouvert' | 'cloture'
  cloture_le timestamptz
);
```
Une fois un exercice clôturé, **aucune écriture ne doit plus pouvoir être modifiée ou ajoutée** dessus (contrainte à faire respecter côté base via une vraie policy Supabase, pas juste côté interface — cf. audit initial sur les dangers de la sécurité simulée côté client).

### A.8 Export DSF et FEC

- **DSF** (Déclaration Statistique et Fiscale) : générer le format normalisé exigé par la DGI Gabon à partir du Bilan/Compte de résultat/TAFIRE.
- **FEC** (Fichier des Écritures Comptables) : format d'export standard que la plupart des cabinets comptables demandent pour importer tes écritures dans leur propre logiciel — un export CSV structuré des tables `ecritures` + `lignes_ecritures` suffit dans un premier temps.

---

## PARTIE B — La Vue Simplifiée Dirigeant

### B.1 Principe de conception : "zéro jargon, gros chiffres, une couleur = un sens"

Règles à respecter partout dans la vue Dirigeant :

- **Jamais** les mots : débit, crédit, écriture, journal, compte, lettrage, TAFIRE, exercice comptable
- **Toujours** une phrase complète en français courant plutôt qu'un libellé technique
- **3 couleurs maximum**, sens fixe : vert = bonne santé / à jour, orange = à surveiller, rouge = action requise maintenant
- **Un chiffre par carte**, gros, une ligne de contexte maximum — pas de tableaux denses
- Toujours répondre à une question que le dirigeant se pose réellement, jamais afficher une donnée "parce qu'elle existe"

### B.2 Table de traduction — jargon comptable → langage dirigeant

| Terme comptable (Partie A) | Ce qu'affiche la Vue Dirigeant |
|---|---|
| Solde du compte 411 (Clients) | **"Ce qu'on vous doit"** |
| Solde du compte 401 (Fournisseurs) | **"Ce que vous devez"** |
| Solde compte 4441 (TVA due) | **"TVA à payer ce mois"** |
| Solde comptes 512 + 571 (Banque + Caisse) | **"Argent disponible aujourd'hui"** |
| Total classe 7 (Produits) sur la période | **"Ce que vous avez encaissé / facturé"** |
| Total classe 6 (Charges) sur la période | **"Ce que ça vous a coûté"** |
| Résultat net (Produits − Charges) | **"Ce qu'il vous reste à la fin"** |
| Compte 416 (Clients douteux) | **"Factures en retard de plus de 30 jours"** |
| Balance âgée | **"Qui vous doit de l'argent, et depuis combien de temps"** |
| Bilan / Compte de résultat | Bouton discret : **"Voir le rapport complet pour mon comptable"** |

### B.3 Structure du tableau de bord Dirigeant

**En haut — 4 cartes principales (toujours visibles, sans scroll)**

1. **💰 Argent disponible aujourd'hui** — banque + caisse cumulées (comptes 512+571)
2. **📥 Ce qu'on vous doit** — factures non payées (compte 411), sous-texte "dont X FCFA en retard"
3. **📤 Ce que vous devez** — fournisseurs + TVA à payer (comptes 401+4441), échéance la plus proche
4. **📊 Ce qu'il vous reste ce mois** — résultat net simplifié, flèche verte ↑ ou rouge ↓ vs mois dernier

**Au milieu — Une seule question à la fois, pas un tableau**

> **Qui vous doit de l'argent, du plus urgent au moins urgent**
> - SOGARA S.A. — 4 366 000 FCFA — en retard de 12 jours 🔴 [Relancer]
> - Établissements Mba & Fils — 0 FCFA — à jour ✅

Chaque ligne a une action directe (Relancer, Voir la facture) — pas juste une donnée à lire.

**En bas — Une explication à la demande, pas imposée**

Un lien discret **"Pourquoi ce chiffre ?"** sous chaque carte, ouvrant une explication en une phrase (ex: sous TVA à payer → *"C'est la différence entre la TVA que vous avez facturée à vos clients et celle que vous avez payée à vos fournisseurs."*).

### B.4 Ce que la Vue Dirigeant ne montre JAMAIS par défaut

- Le plan comptable et les numéros de compte
- Le détail des écritures ligne par ligne
- Le grand livre et les journaux comptables
- Le vocabulaire de clôture d'exercice

Ces éléments restent accessibles derrière un bouton séparé ("Espace Comptable"), réservé au rôle `comptable`/`factory_admin`.

### B.5 Où brancher l'IA existante (ChatGemini.jsx)

Le composant de chat IA déjà présent dans le projet est l'endroit naturel pour absorber la complexité restante : au lieu de multiplier les tooltips, le dirigeant peut demander *"Pourquoi je dois autant de TVA ce mois ?"* ou *"Est-ce que je peux me permettre d'embaucher quelqu'un ?"* — l'IA traduit les vraies données comptables (tables `ecritures`/`lignes_ecritures` de la Partie A) en réponse en langage naturel.

---

## PARTIE C — Simplifier l'usage quotidien pour le Comptable

Ici, le problème n'est pas le jargon (le comptable le maîtrise et en a besoin pour parler avec la DGI ou un confrère) — c'est la **friction** : trop de clics, trop de ressaisie, pas assez d'automatismes. Un comptable qui a l'habitude d'Excel ou de Sage attend une saisie rapide au clavier, pas des formulaires web lents à remplir un champ à la fois.

### C.1 Saisie rapide façon tableur

Remplacer tout formulaire classique (un champ, un clic, un champ suivant) par une **grille de saisie type tableur** pour les écritures manuelles (journal OD) :

- Navigation au clavier (Tab / Entrée / flèches) entre les colonnes Compte / Libellé / Débit / Crédit, sans toucher la souris
- Autocomplétion du numéro de compte dès les 2-3 premiers caractères tapés (numéro **ou** libellé — taper "client" doit proposer 411)
- **L'écart débit/crédit s'affiche en temps réel** en haut de la grille, en rouge tant qu'il n'est pas à zéro — le bouton "Enregistrer" reste désactivé tant que l'écriture n'est pas équilibrée. Le comptable voit son erreur immédiatement, pas après soumission.

### C.2 Automatisation intelligente

- **Suggestion de contrepartie basée sur l'historique** : si les 5 dernières écritures sur le compte 613 (locations) ont toujours pour contrepartie le compte 512 (banque), le proposer par défaut
- **Modèles d'écritures récurrentes** : un "modèle" enregistré une fois (ex: loyer mensuel, salaires) et rejouable en un clic chaque mois, avec juste le montant à ajuster si besoin
- Comme précisé en Partie A.4, la génération automatique des écritures de vente/encaissement depuis `Facturation.jsx` retire déjà l'essentiel de la saisie manuelle — le comptable **valide et complète**, il ne ressaisit pas

### C.3 Grand livre et balance consultables sans friction

- Recherche/filtre simple en haut de chaque vue (par compte, par tiers, par période) plutôt qu'un écran unique de 500 lignes
- Un clic sur un solde dans la balance ouvre directement le détail des écritures de ce compte (drill-down), au lieu de changer d'écran et re-filtrer manuellement

### C.4 Checklist de clôture visuelle

Avant de clôturer un exercice (Partie A.7), afficher une simple liste à cocher plutôt qu'un mur de vérifications techniques :

> ☐ 3 écritures non équilibrées à corriger
> ☐ 12 factures encaissées non lettrées
> ☑ Toutes les factures ont une écriture correspondante

Le comptable voit en un coup d'œil ce qui bloque la clôture, sans avoir à interroger la base lui-même.

### C.5 Rapprochement bancaire assisté

Plutôt que de pointer manuellement chaque ligne de relevé bancaire contre chaque écriture, proposer un **rapprochement automatique suggéré** (montant + date proches) que le comptable valide en un clic ou corrige si le rapprochement automatique se trompe — il reste décisionnaire, mais ne fait plus le travail de recherche.

### C.6 Principe général d'ergonomie

- Un seul point d'entrée clair : "Saisie rapide" plutôt que des écritures dispersées dans plusieurs menus
- Pas de double confirmation inutile sur les actions courantes (enregistrer une écriture équilibrée ne devrait jamais demander "êtes-vous sûr ?")
- Réserver les confirmations et avertissements aux actions réellement irréversibles (clôture d'exercice, suppression)

---

## PARTIE D — Phasage recommandé

| Phase | Contenu | Valeur | Partie |
|---|---|---|---|
| **1 — MVP** | Plan comptable + journaux + génération auto d'écritures depuis Facturation | Le comptable a enfin des écritures en partie double, plus de ressaisie manuelle | A |
| **2** | Grand livre + Balance générale + **saisie rapide type tableur** (C.1) | Le comptable peut vérifier/justifier chaque solde, sans friction de saisie | A + C |
| **3** | **Tableau de bord Dirigeant** (4 cartes + traduction) | Le chef d'entreprise pilote son activité sans jargon | B |
| **4** | Bilan + Compte de résultat + **modèles d'écritures récurrentes** (C.2) | États de synthèse de base disponibles, moins de ressaisie mensuelle | A + C |
| **5** | Lettrage automatique + clôture d'exercice + **checklist de clôture** (C.4) | Fiabilité et intégrité dans la durée, visible en un coup d'œil | A + C |
| **6** | TAFIRE + export DSF/FEC + **rapprochement bancaire assisté** (C.5) | Conformité complète, prêt pour dépôt DGI | A + C |

Je recommande toujours de démarrer par la **Phase 1** : c'est la base sur laquelle tout le reste s'appuie, y compris la Vue Dirigeant (Phase 3) et l'ergonomie comptable (Partie C), qui n'ont de sens que si les écritures sous-jacentes existent déjà.

---

## Prompt Antigravity — pour démarrer (Phase 1 + aperçu Phase 3)

```
Dans Onyx Gest, ajoute le module comptable SYSCOHADA suivant :

1. Crée les tables Supabase : plan_comptable, journaux, ecritures, 
   lignes_ecritures, exercices_comptables (schéma détaillé dans ce document, 
   Partie A). Pré-remplis plan_comptable et journaux avec le socle standard 
   (Partie A.2 et A.3) à la création de chaque tenant.

2. Modifie la logique de création/paiement de facture dans Facturation.jsx 
   et supabaseSim.js pour générer automatiquement une écriture équilibrée 
   (débit = crédit) à chaque changement de statut de facture (Partie A.4).

3. Ajoute une contrainte qui rejette toute écriture où la somme des débits 
   ne correspond pas à la somme des crédits.

Ensuite, crée un composant `DashboardDirigeant.jsx` qui remplace l'affichage 
de Dashboard.jsx quand currentUser.role === 'client_manager' : 4 cartes 
(Argent disponible, Ce qu'on vous doit, Ce que vous devez, Ce qu'il vous 
reste ce mois — Partie B.3), calculées à partir des tables comptables 
ci-dessus, SANS jamais afficher de terme comptable technique (pas de 
"débit/crédit/compte/écriture" — table de traduction en Partie B.2).

Utilise la palette de couleurs existante du dashboard admin (bleu/blanc). 
Ajoute un bouton discret "Voir le rapport comptable complet" visible 
uniquement si role === 'comptable' ou 'factory_admin'.

Enfin, pour le rôle 'comptable', crée un composant `SaisieRapideEcritures.jsx` :
une grille de saisie type tableur (Partie C.1) avec navigation clavier Tab/Entrée 
entre les colonnes Compte/Libellé/Débit/Crédit, autocomplétion du compte dès 
2-3 caractères tapés (numéro ou libellé), et un total débit/crédit affiché en 
temps réel en haut de la grille (rouge si déséquilibré, le bouton Enregistrer 
reste désactivé tant que le total n'est pas à zéro).
```

---

## Ce qu'il faudra valider avec ton comptable avant la Phase 1

- Le régime fiscal exact du/des client(s) qui utiliseront Onyx Gest (système normal vs système allégé vs SMT — ça change les états financiers exigés)
- La liste précise des comptes du plan comptable à activer pour leur secteur d'activité
- Le format d'export DSF attendu (le document officiel DGI Gabon existe et peut servir de référence structurelle)

**Pour aller plus loin** : je peux te faire un mockup visuel du tableau de bord Dirigeant (Partie B.3) si tu veux voir à quoi ça ressemble avant de lancer le développement.
