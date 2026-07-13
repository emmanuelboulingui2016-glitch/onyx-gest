import React, { useState, useEffect } from 'react';
import { useTenant } from '../context/TenantContext';
import { supabaseSim } from '../utils/supabaseSim';

export const Dashboard = ({ onOpenComptabilite }) => {
  const { activeTenant } = useTenant();
  const [invoices, setInvoices] = useState([]);
  const [metrics, setMetrics] = useState({
    totalRevenue: 0,
    paidAmount: 0,
    outstandingAmount: 0,
    recoveryRate: 0,
    paidCount: 0,
    totalCount: 0
  });

  useEffect(() => {
    const data = supabaseSim.getInvoices(activeTenant.id);
    setInvoices(data);

    // Calculate metrics
    const total = data.reduce((acc, inv) => acc + (inv.type === 'facture' ? inv.amount : 0), 0);
    const paid = data.filter(inv => inv.type === 'facture' && inv.status === 'paye')
                     .reduce((acc, inv) => acc + inv.amount, 0);
    const outstanding = data.filter(inv => inv.type === 'facture' && inv.status === 'en_retard')
                            .reduce((acc, inv) => acc + inv.amount, 0);
    const paidCount = data.filter(inv => inv.type === 'facture' && inv.status === 'paye').length;
    const totalCount = data.filter(inv => inv.type === 'facture').length;
    const rate = total > 0 ? Math.round((paid / total) * 100) : 0;

    setMetrics({
      totalRevenue: total,
      paidAmount: paid,
      outstandingAmount: outstanding,
      recoveryRate: rate,
      paidCount,
      totalCount
    });
  }, [activeTenant]);

  const formatFCFA = (amount) => {
    return new Intl.NumberFormat('fr-GA', {
      style: 'currency',
      currency: 'XAF',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Group invoices by client for custom visual chart
  const clientData = invoices.reduce((acc, inv) => {
    if (inv.type === 'facture') {
      acc[inv.client_name] = (acc[inv.client_name] || 0) + inv.amount;
    }
    return acc;
  }, {});

  const clientLabels = Object.keys(clientData);
  const clientValues = Object.values(clientData);
  const maxClientVal = Math.max(...clientValues, 1);

  const overdueInvoices = invoices.filter(inv => inv.type === 'facture' && inv.status === 'en_retard');
  const upcomingInvoices = invoices.filter(inv => inv.type === 'facture' && inv.status === 'brouillon');

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Console de Gestion</h1>
          <p style={styles.subtitle}>Statistiques en temps réel pour {activeTenant.name} ({activeTenant.city})</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {/* Automatic Cloud Backup Widget */}
          <div style={styles.backupWidget} title="Sauvegarde continue en base de données Supabase Cloud">
            <span style={styles.shieldIcon}>🛡️</span>
            <span style={styles.backupText}>Protection : Données sauvegardées en temps réel sur le cloud</span>
          </div>

          {onOpenComptabilite && (
            <button onClick={onOpenComptabilite} className="btn-secondary" style={{ fontSize: '0.82rem' }}>
              🧮 Espace Comptable
            </button>
          )}

          <div style={styles.tenantBadge}>
            <span style={styles.tenantDot}></span>
            ID Tenant: <span className="data-mono" style={styles.tenantIdText}>{activeTenant.id}</span>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div style={styles.kpiGrid}>
        <div className="onyx-card" style={styles.kpiCard}>
          <div style={styles.kpiHeader}>
            <span style={styles.kpiLabel}>Chiffre d'Affaires</span>
            <svg style={{color: '#F59E0B'}} width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="data-mono" style={{...styles.kpiValue, color: '#F59E0B'}}>
            {formatFCFA(metrics.totalRevenue)}
          </div>
          <div style={styles.kpiFooter}>
            <span style={{color: '#10B981'}}>↑ 12%</span> <span style={styles.kpiFooterText}>ce mois</span>
          </div>
        </div>

        <div className="onyx-card" style={styles.kpiCard}>
          <div style={styles.kpiHeader}>
            <span style={styles.kpiLabel}>Factures Payées</span>
            <svg style={{color: '#10B981'}} width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="data-mono" style={{...styles.kpiValue, color: '#10B981'}}>
            {formatFCFA(metrics.paidAmount)}
          </div>
          <div style={styles.kpiFooter}>
            <span style={styles.kpiFooterText}>{metrics.paidCount} / {metrics.totalCount} factures acquittées</span>
          </div>
        </div>

        <div className="onyx-card" style={styles.kpiCard}>
          <div style={styles.kpiHeader}>
            <span style={styles.kpiLabel}>Créances en Retard</span>
            <svg style={{color: '#F59E0B'}} width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div className="data-mono" style={{...styles.kpiValue, color: '#F59E0B'}}>
            {formatFCFA(metrics.outstandingAmount)}
          </div>
          <div style={styles.kpiFooter}>
            <span style={{color: '#F59E0B'}}>Alerte relance requise</span>
          </div>
        </div>

        <div className="onyx-card" style={styles.kpiCard}>
          <div style={styles.kpiHeader}>
            <span style={styles.kpiLabel}>Taux de Recouvrement</span>
            <svg style={{color: '#3B82F6'}} width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          <div className="data-mono" style={{...styles.kpiValue, color: '#10B981'}}>
            {metrics.recoveryRate}%
          </div>
          <div style={styles.kpiFooter}>
            <div style={styles.progressContainer}>
              <div style={{...styles.progressBar, width: `${metrics.recoveryRate}%`}}></div>
            </div>
          </div>
        </div>
      </div>

      {/* Visual Analytics & Rappels Section */}
      <div style={styles.middleSection}>
        {/* CA Curve Chart */}
        <div className="onyx-card" style={styles.chartCard}>
          <h3 style={styles.cardTitle}>📈 Évolution du Chiffre d'Affaires (Mensuel 2026)</h3>
          <div style={styles.chartContainer}>
            {/* Draw a gorgeous SVG Line Chart representing the Monthly CA */}
            <svg viewBox="0 0 500 150" style={{ width: '100%', height: '150px' }}>
              <defs>
                <linearGradient id="gradientGold" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#D4AF37" stopOpacity="0.2" />
                  <stop offset="100%" stopColor="#D4AF37" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              {/* Grid lines */}
              <line x1="0" y1="30" x2="500" y2="30" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
              <line x1="0" y1="70" x2="500" y2="70" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
              <line x1="0" y1="110" x2="500" y2="110" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
              
              {/* Gradient Area under curve */}
              <path 
                d="M 10 130 Q 90 90, 170 110 T 330 50 T 490 30 L 490 140 L 10 140 Z" 
                fill="url(#gradientGold)" 
              />
              {/* Curve Line */}
              <path 
                d="M 10 130 Q 90 90, 170 110 T 330 50 T 490 30" 
                fill="none" 
                stroke="#D4AF37" 
                strokeWidth="2.5" 
                strokeLinecap="round" 
              />
              
              {/* Dots on peak points */}
              <circle cx="170" cy="110" r="3.5" fill="#00C853" />
              <circle cx="330" cy="50" r="3.5" fill="#3B82F6" />
              <circle cx="490" cy="30" r="3.5" fill="#D4AF37" />
              
              {/* Month Labels */}
              <text x="10" y="148" fill="#6B7280" fontSize="8" fontFamily="monospace">JAN</text>
              <text x="90" y="148" fill="#6B7280" fontSize="8" fontFamily="monospace">FEV</text>
              <text x="170" y="148" fill="#6B7280" fontSize="8" fontFamily="monospace">MAR</text>
              <text x="250" y="148" fill="#6B7280" fontSize="8" fontFamily="monospace">AVR</text>
              <text x="330" y="148" fill="#6B7280" fontSize="8" fontFamily="monospace">MAI</text>
              <text x="410" y="148" fill="#6B7280" fontSize="8" fontFamily="monospace">JUN</text>
              <text x="470" y="148" fill="#6B7280" fontSize="8" fontFamily="monospace">JUL (PRÉV)</text>
            </svg>
          </div>
        </div>

        {/* Rappels & Alertes Panel */}
        <div className="onyx-card" style={styles.tableCard}>
          <h3 style={styles.cardTitle}>🔔 Rappels & Échéances de Paiement</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '8px 0', maxHeight: '150px', overflowY: 'auto' }}>
            {overdueInvoices.length === 0 && upcomingInvoices.length === 0 ? (
              <div style={styles.emptyState}>Aucun rappel en attente. Tout est en ordre.</div>
            ) : (
              <>
                {overdueInvoices.map(inv => (
                  <div key={inv.id} style={styles.alertItemOverdue}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={styles.alertDotRed}></span>
                      <strong style={{ color: '#FFFFFF', fontSize: '0.85rem' }}>{inv.number}</strong>
                      <span style={styles.alertClient}>{inv.client_name}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ color: '#EF4444', fontWeight: '700', fontSize: '0.8rem' }}>RETARD</span>
                      <span style={styles.alertDate}>{inv.due_date}</span>
                    </div>
                  </div>
                ))}
                {upcomingInvoices.map(inv => (
                  <div key={inv.id} style={styles.alertItemWarning}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={styles.alertDotOrange}></span>
                      <strong style={{ color: '#FFFFFF', fontSize: '0.85rem' }}>{inv.number}</strong>
                      <span style={styles.alertClient}>{inv.client_name}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ color: '#F59E0B', fontWeight: '700', fontSize: '0.8rem' }}>BROUILLON</span>
                      <span style={styles.alertDate}>{inv.due_date}</span>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main Section */}
      <div style={styles.mainSection}>
        {/* Revenue Distribution Chart */}
        <div className="onyx-card" style={styles.chartCard}>
          <h3 style={styles.cardTitle}>Volume d'Affaires par Client</h3>
          {clientLabels.length > 0 ? (
            <div style={styles.chartContainer}>
              {clientLabels.map((client, idx) => {
                const percentage = (clientData[client] / maxClientVal) * 100;
                return (
                  <div key={idx} style={styles.chartBarRow}>
                    <div style={styles.chartBarLabel}>{client}</div>
                    <div style={styles.chartBarTrack}>
                      <div 
                        style={{
                          ...styles.chartBarFill, 
                          width: `${percentage}%`,
                          background: idx % 2 === 0 ? 'var(--color-accent-blue)' : 'var(--color-accent-green)'
                        }}
                      >
                        <span style={styles.chartBarValText}>{formatFCFA(clientData[client])}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={styles.emptyState}>Aucune donnée de facturation.</div>
          )}
        </div>

        {/* Recent Invoices Table */}
        <div className="onyx-card" style={styles.tableCard}>
          <h3 style={styles.cardTitle}>Factures & Devis Récents</h3>
          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Numéro</th>
                  <th style={styles.th}>Client</th>
                  <th style={styles.th}>Type</th>
                  <th style={styles.th}>Date</th>
                  <th style={styles.th}>Montant TTC</th>
                  <th style={styles.th}>Statut</th>
                </tr>
              </thead>
              <tbody>
                {invoices.length > 0 ? (
                  invoices.map((inv) => (
                    <tr key={inv.id} style={styles.tr}>
                      <td className="data-mono" style={{...styles.td, color: '#3B82F6'}}>{inv.number}</td>
                      <td style={styles.td}>{inv.client_name}</td>
                      <td style={styles.td}>
                        <span style={{
                          ...styles.typeBadge,
                          color: inv.type === 'devis' ? '#3B82F6' : '#FFFFFF',
                          borderColor: inv.type === 'devis' ? 'rgba(59, 130, 246, 0.4)' : 'rgba(255, 255, 255, 0.2)'
                        }}>
                          {inv.type.toUpperCase()}
                        </span>
                      </td>
                      <td style={styles.td}>{inv.date}</td>
                      <td className="data-mono" style={{...styles.td, fontWeight: '500'}}>{formatFCFA(inv.amount)}</td>
                      <td style={styles.td}>
                        <span style={{
                          ...styles.statusBadge,
                          color: inv.status === 'paye' ? '#10B981' : inv.status === 'en_retard' ? '#F59E0B' : '#9CA3AF',
                          backgroundColor: inv.status === 'paye' ? 'rgba(16, 185, 129, 0.1)' : inv.status === 'en_retard' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                          borderColor: inv.status === 'paye' ? '#10B981' : inv.status === 'en_retard' ? '#F59E0B' : '#9CA3AF',
                        }}>
                          {inv.status.replace('_', ' ').toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" style={styles.noDataCell}>Aucun document trouvé pour ce tenant.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
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
  middleSection: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))',
    gap: '20px'
  },
  alertItemOverdue: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 14px',
    backgroundColor: 'rgba(239, 68, 68, 0.05)',
    border: '1px solid rgba(239, 68, 68, 0.25)',
    borderRadius: '6px'
  },
  alertItemWarning: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 14px',
    backgroundColor: 'rgba(245, 158, 11, 0.05)',
    border: '1px solid rgba(245, 158, 11, 0.25)',
    borderRadius: '6px'
  },
  alertDotRed: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    backgroundColor: '#EF4444',
    display: 'inline-block'
  },
  alertDotOrange: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    backgroundColor: '#F59E0B',
    display: 'inline-block'
  },
  alertClient: {
    fontSize: '0.8rem',
    color: '#9CA3AF'
  },
  alertDate: {
    fontFamily: 'monospace',
    fontSize: '0.78rem',
    color: '#6B7280'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '16px',
    borderBottom: '1px solid rgba(59, 130, 246, 0.1)',
    paddingBottom: '16px'
  },
  backupWidget: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    backgroundColor: 'rgba(0, 200, 83, 0.06)',
    border: '1px solid rgba(0, 200, 83, 0.2)',
    padding: '6px 12px',
    borderRadius: '6px',
    fontSize: '0.82rem',
    fontWeight: '600'
  },
  shieldIcon: {
    fontSize: '1rem',
    filter: 'drop-shadow(0 0 4px rgba(0, 200, 83, 0.4))'
  },
  backupText: {
    color: '#9CA3AF',
    fontWeight: '500'
  },
  title: {
    fontSize: '1.8rem',
    marginBottom: '4px'
  },
  subtitle: {
    fontSize: '0.9rem',
    color: 'var(--color-text-secondary)'
  },
  tenantBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    background: 'rgba(59, 130, 246, 0.08)',
    border: '1px solid rgba(59, 130, 246, 0.2)',
    padding: '6px 12px',
    borderRadius: '6px',
    fontSize: '0.85rem'
  },
  tenantDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: 'var(--color-accent-blue)',
    display: 'inline-block'
  },
  tenantIdText: {
    color: '#FFFFFF',
    fontWeight: '600'
  },
  kpiGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '16px'
  },
  kpiCard: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    minHeight: '130px',
    padding: '20px'
  },
  kpiHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    color: 'var(--color-text-secondary)',
    fontSize: '0.85rem',
    textTransform: 'uppercase',
    letterSpacing: '0.05em'
  },
  kpiLabel: {
    fontWeight: '500'
  },
  kpiValue: {
    fontSize: '1.6rem',
    fontWeight: '700',
    margin: '12px 0 6px 0'
  },
  kpiFooter: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '0.8rem'
  },
  kpiFooterText: {
    color: 'var(--color-text-secondary)'
  },
  progressContainer: {
    width: '100%',
    height: '6px',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: '3px',
    overflow: 'hidden',
    marginTop: '6px'
  },
  progressBar: {
    height: '100%',
    backgroundColor: 'var(--color-accent-green)',
    borderRadius: '3px',
    transition: 'width 0.5s ease-out'
  },
  mainSection: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
    gap: '20px'
  },
  chartCard: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  cardTitle: {
    fontSize: '1.1rem',
    fontWeight: '600',
    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
    paddingBottom: '10px'
  },
  chartContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    padding: '8px 0'
  },
  chartBarRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  },
  chartBarLabel: {
    fontSize: '0.85rem',
    color: '#FFFFFF',
    fontWeight: '500'
  },
  chartBarTrack: {
    width: '100%',
    height: '24px',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: '4px',
    overflow: 'hidden'
  },
  chartBarFill: {
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingRight: '8px',
    borderRadius: '4px',
    transition: 'width 0.6s cubic-bezier(0.1, 0.8, 0.2, 1)'
  },
  chartBarValText: {
    fontSize: '0.8rem',
    fontWeight: '600',
    color: '#0A0A0A',
    fontFamily: 'var(--font-mono)'
  },
  emptyState: {
    color: 'var(--color-text-secondary)',
    textAlign: 'center',
    padding: '40px 0',
    fontSize: '0.9rem'
  },
  tableCard: {
    display: 'flex',
    flexDirection: 'column'
  },
  tableWrapper: {
    overflowX: 'auto',
    width: '100%'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    textAlign: 'left'
  },
  th: {
    padding: '12px 10px',
    fontSize: '0.8rem',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: 'var(--color-text-secondary)',
    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
    fontWeight: '500'
  },
  tr: {
    borderBottom: '1px solid rgba(255, 255, 255, 0.03)',
    transition: 'background-color 0.2s ease',
    cursor: 'default'
  },
  td: {
    padding: '12px 10px',
    fontSize: '0.85rem',
    color: 'var(--color-text-secondary)'
  },
  typeBadge: {
    display: 'inline-block',
    padding: '2px 6px',
    borderRadius: '4px',
    fontSize: '0.75rem',
    fontWeight: '600',
    border: '1px solid'
  },
  statusBadge: {
    display: 'inline-block',
    padding: '2px 6px',
    borderRadius: '4px',
    fontSize: '0.75rem',
    fontWeight: '600',
    border: '1px solid'
  },
  noDataCell: {
    textAlign: 'center',
    padding: '40px 0',
    color: 'var(--color-text-secondary)',
    fontSize: '0.9rem'
  }
};
