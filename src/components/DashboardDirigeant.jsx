import React, { useState, useEffect } from 'react';
import { useTenant } from '../context/TenantContext';
import { supabaseSim } from '../utils/supabaseSim';
import { getIndicateursDirigeant } from '../utils/accounting';

// Vue Dirigeant : zéro jargon comptable, gros chiffres, une couleur = un sens.
// Voir ONYX_GEST_MODULE_COMPTABILITE_COMPLET.md, Partie B.
export const DashboardDirigeant = ({ onNavigateToRelances, onOpenComptabilite }) => {
  const { activeTenant } = useTenant();
  const [indicateurs, setIndicateurs] = useState({
    argentDisponible: 0, onVousDoit: 0, vousDevez: 0, resteMois: 0
  });
  const [creances, setCreances] = useState([]);
  const [openInfo, setOpenInfo] = useState(null);

  useEffect(() => {
    setIndicateurs(getIndicateursDirigeant(activeTenant.id));

    const invoices = supabaseSim.getInvoices(activeTenant.id);
    const dus = invoices
      .filter(inv => inv.type === 'facture' && (inv.status === 'officiel' || inv.status === 'en_retard'))
      .sort((a, b) => b.amount - a.amount);
    setCreances(dus);
  }, [activeTenant]);

  const formatFCFA = (amount) => {
    return new Intl.NumberFormat('fr-GA', {
      style: 'currency',
      currency: 'XAF',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const toggleInfo = (key) => setOpenInfo(openInfo === key ? null : key);

  const retardCount = creances.filter(c => c.status === 'en_retard').length;
  const retardAmount = creances.filter(c => c.status === 'en_retard').reduce((acc, c) => acc + c.amount, 0);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.headerRow}>
          <div>
            <h1 style={styles.title}>Tableau de Bord</h1>
            <p style={styles.subtitle}>{activeTenant.name} — {activeTenant.city}</p>
          </div>
          {onOpenComptabilite && (
            <button className="btn-secondary" style={styles.btnComptabilite} onClick={onOpenComptabilite}>
              🧮 Espace Comptable
            </button>
          )}
        </div>
      </div>

      {/* 4 cartes principales, toujours visibles */}
      <div style={styles.cardsGrid}>
        <div className="onyx-card" style={styles.card}>
          <div style={styles.cardLabel}>💰 Argent disponible aujourd'hui</div>
          <div className="data-mono" style={{ ...styles.cardValue, color: indicateurs.argentDisponible > 0 ? '#10B981' : '#EF4444' }}>
            {formatFCFA(indicateurs.argentDisponible)}
          </div>
          <div style={styles.cardFooter}>Banque + Caisse cumulées</div>
          <button style={styles.infoLink} onClick={() => toggleInfo('argent')}>Pourquoi ce chiffre ?</button>
          {openInfo === 'argent' && (
            <p style={styles.infoText}>C'est tout l'argent immédiatement disponible sur vos comptes bancaires et en caisse, aujourd'hui.</p>
          )}
        </div>

        <div className="onyx-card" style={styles.card}>
          <div style={styles.cardLabel}>📥 Ce qu'on vous doit</div>
          <div className="data-mono" style={{ ...styles.cardValue, color: '#FFFFFF' }}>
            {formatFCFA(indicateurs.onVousDoit)}
          </div>
          <div style={{ ...styles.cardFooter, color: retardCount > 0 ? '#EF4444' : 'var(--color-text-secondary)' }}>
            {retardCount > 0 ? `dont ${formatFCFA(retardAmount)} en retard` : 'Aucun retard'}
          </div>
          <button style={styles.infoLink} onClick={() => toggleInfo('doit')}>Pourquoi ce chiffre ?</button>
          {openInfo === 'doit' && (
            <p style={styles.infoText}>C'est le total des factures que vos clients n'ont pas encore payées.</p>
          )}
        </div>

        <div className="onyx-card" style={styles.card}>
          <div style={styles.cardLabel}>📤 Ce que vous devez</div>
          <div className="data-mono" style={{ ...styles.cardValue, color: indicateurs.vousDevez > 0 ? '#F59E0B' : '#10B981' }}>
            {formatFCFA(indicateurs.vousDevez)}
          </div>
          <div style={styles.cardFooter}>Fournisseurs et TVA à payer</div>
          <button style={styles.infoLink} onClick={() => toggleInfo('devez')}>Pourquoi ce chiffre ?</button>
          {openInfo === 'devez' && (
            <p style={styles.infoText}>C'est ce que vous devez à vos fournisseurs, plus la TVA à reverser à l'État ce mois-ci.</p>
          )}
        </div>

        <div className="onyx-card" style={styles.card}>
          <div style={styles.cardLabel}>📊 Ce qu'il vous reste ce mois</div>
          <div className="data-mono" style={{ ...styles.cardValue, color: indicateurs.resteMois >= 0 ? '#10B981' : '#EF4444' }}>
            {indicateurs.resteMois >= 0 ? '↑ ' : '↓ '}{formatFCFA(Math.abs(indicateurs.resteMois))}
          </div>
          <div style={styles.cardFooter}>Ce que vous avez gagné moins ce que ça vous a coûté</div>
          <button style={styles.infoLink} onClick={() => toggleInfo('reste')}>Pourquoi ce chiffre ?</button>
          {openInfo === 'reste' && (
            <p style={styles.infoText}>C'est la différence entre tout ce que vous avez facturé ce mois-ci et toutes vos dépenses sur la même période.</p>
          )}
        </div>
      </div>

      {/* Qui vous doit de l'argent, du plus urgent au moins urgent */}
      <div className="onyx-card" style={styles.listCard}>
        <h3 style={styles.listTitle}>Qui vous doit de l'argent, du plus urgent au moins urgent</h3>
        {creances.length > 0 ? (
          <div style={styles.list}>
            {creances.map(inv => (
              <div key={inv.id} style={styles.listRow}>
                <div style={styles.listRowLeft}>
                  <span style={{
                    ...styles.statusDot,
                    backgroundColor: inv.status === 'en_retard' ? '#EF4444' : '#10B981'
                  }} />
                  <span style={styles.clientName}>{inv.client_name}</span>
                </div>
                <div style={styles.listRowRight}>
                  <span className="data-mono" style={styles.amount}>{formatFCFA(inv.amount)}</span>
                  <span style={{ color: inv.status === 'en_retard' ? '#EF4444' : '#9CA3AF', fontSize: '0.8rem' }}>
                    {inv.status === 'en_retard' ? 'en retard' : `à échéance le ${inv.due_date}`}
                  </span>
                  {inv.status === 'en_retard' && (
                    <button className="btn-primary" style={styles.btnRelancer} onClick={() => onNavigateToRelances && onNavigateToRelances()}>
                      Relancer
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={styles.emptyState}>✅ Personne ne vous doit d'argent en ce moment.</div>
        )}
      </div>
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
    width: '100%'
  },
  header: {
    borderBottom: '1px solid rgba(59, 130, 246, 0.1)',
    paddingBottom: '16px'
  },
  headerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '16px',
    flexWrap: 'wrap'
  },
  btnComptabilite: {
    whiteSpace: 'nowrap'
  },
  title: {
    fontSize: '1.8rem',
    marginBottom: '4px'
  },
  subtitle: {
    fontSize: '0.9rem',
    color: 'var(--color-text-secondary)'
  },
  cardsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: '16px'
  },
  card: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    padding: '22px'
  },
  cardLabel: {
    fontSize: '0.9rem',
    color: 'var(--color-text-secondary)',
    fontWeight: '500'
  },
  cardValue: {
    fontSize: '1.9rem',
    fontWeight: '700',
    margin: '6px 0'
  },
  cardFooter: {
    fontSize: '0.82rem',
    color: 'var(--color-text-secondary)'
  },
  infoLink: {
    background: 'none',
    border: 'none',
    color: 'var(--color-accent-blue)',
    fontSize: '0.78rem',
    cursor: 'pointer',
    padding: 0,
    marginTop: '10px',
    alignSelf: 'flex-start',
    textDecoration: 'underline'
  },
  infoText: {
    fontSize: '0.82rem',
    color: 'var(--color-text-secondary)',
    marginTop: '8px',
    lineHeight: '1.4'
  },
  listCard: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  listTitle: {
    fontSize: '1.1rem',
    fontWeight: '600',
    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
    paddingBottom: '10px'
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px'
  },
  listRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 14px',
    background: 'rgba(255, 255, 255, 0.02)',
    border: '1px solid rgba(255, 255, 255, 0.05)',
    borderRadius: '6px'
  },
  listRowLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  statusDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    display: 'inline-block'
  },
  clientName: {
    fontSize: '0.9rem',
    color: '#FFFFFF',
    fontWeight: '500'
  },
  listRowRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px'
  },
  amount: {
    fontSize: '0.9rem',
    color: '#F59E0B',
    fontWeight: '600'
  },
  btnRelancer: {
    padding: '5px 12px',
    fontSize: '0.78rem'
  },
  emptyState: {
    textAlign: 'center',
    padding: '30px 0',
    color: 'var(--color-text-secondary)',
    fontSize: '0.9rem'
  }
};
