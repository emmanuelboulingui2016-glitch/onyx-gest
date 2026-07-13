import React, { useState, useEffect } from 'react';
import { useTenant } from '../context/TenantContext';
import { supabaseSim } from '../utils/supabaseSim';
import { translations } from '../utils/translations';

export const AdminConsole = () => {
  const { tenants, deleteTenantAccount, language } = useTenant();
  const [tenantStatuses, setTenantStatuses] = useState({});
  const [subscriptions, setSubscriptions] = useState({});
  const [metrics, setMetrics] = useState({
    uptime: '99.8%',
    apiLatency: '42 ms',
    totalStorage: '184 Go',
    failedLogins: 12
  });
  const [logs, setLogs] = useState([]);

  // Renewal Modal state
  const [renewModal, setRenewModal] = useState(null); // { tenantId, tenantName, currentEndDate }
  const [selectedMonths, setSelectedMonths] = useState(1);
  const [renewLoading, setRenewLoading] = useState(false);

  const t = (key, params = {}) => {
    let text = translations[language]?.[key] || translations['fr']?.[key] || key;
    Object.keys(params).forEach(k => {
      text = text.replace(`{${k}}`, params[k]);
    });
    return text;
  };

  useEffect(() => {
    loadAdminData();
  }, [tenants]);

  const loadAdminData = () => {
    setTenantStatuses(supabaseSim.getTenantStatuses());
    setSubscriptions(supabaseSim.getAllSubscriptions());
    setMetrics(supabaseSim.getPlatformMetrics());
    setLogs(supabaseSim.getDeploymentLogs());
  };

  const handleToggleStatus = (tenantId, tenantName) => {
    const currentStatus = tenantStatuses[tenantId] || 'actif';
    const msg = currentStatus === 'actif'
      ? `Suspendre l'accès pour "${tenantName}" ?`
      : `Réactiver l'accès pour "${tenantName}" ?`;

    if (window.confirm(msg)) {
      try {
        const nextStatus = supabaseSim.toggleTenantStatus(tenantId);
        setTenantStatuses(prev => ({ ...prev, [tenantId]: nextStatus }));
        loadAdminData();
      } catch (err) {
        alert(err.message);
      }
    }
  };

  const openRenewModal = (tenant, subData) => {
    setSelectedMonths(1);
    setRenewModal({
      tenantId: tenant.id,
      tenantName: tenant.name,
      currentEndDate: subData?.subscription_end_date || null,
      currentStatus: subData?.subscription_status || 'active'
    });
  };

  const handleConfirmRenew = () => {
    setRenewLoading(true);
    setTimeout(() => {
      supabaseSim.renewSubscription(renewModal.tenantId, selectedMonths);
      setSubscriptions(supabaseSim.getAllSubscriptions());
      setRenewLoading(false);
      setRenewModal(null);
    }, 500); // Short delay to simulate async call
  };

  const formatDate = (isoStr) => {
    if (!isoStr) return '—';
    return new Date(isoStr).toLocaleDateString('fr-GA', {
      day: '2-digit', month: '2-digit', year: 'numeric'
    });
  };

  const calcNewEndDate = (currentEndDate, months) => {
    if (!currentEndDate) return '—';
    const base = new Date(currentEndDate);
    const now = new Date();
    const diffDays = Math.ceil((base - now) / (1000 * 60 * 60 * 24));
    const startFrom = diffDays < -7 ? new Date() : base;
    startFrom.setMonth(startFrom.getMonth() + months);
    return startFrom.toLocaleDateString('fr-GA', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const getSubBadge = (subStatus) => {
    switch (subStatus) {
      case 'active':
        return { label: 'ACTIF', color: '#10B981', bg: 'rgba(16, 185, 129, 0.12)', border: '#10B981' };
      case 'grace_period':
        return { label: 'GRÂCE', color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.12)', border: '#F59E0B' };
      case 'suspended':
        return { label: 'SUSPENDU', color: '#EF4444', bg: 'rgba(239, 68, 68, 0.12)', border: '#EF4444' };
      default:
        return { label: 'INCONNU', color: '#9CA3AF', bg: 'rgba(156, 163, 175, 0.1)', border: '#9CA3AF' };
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Console de Supervision Technique</h1>
          <p style={styles.subtitle}>Supervision globale de l'infrastructure et gestion des accès plateforme — 241 Code Factory</p>
        </div>
        <div style={styles.goldBadge}>
          <span style={styles.goldDot}></span>
          Rôle : Administrateur Système
        </div>
      </div>

      {/* Technical KPIs Row */}
      <div style={styles.kpiGrid}>
        <div className="onyx-card" style={styles.kpiCard}>
          <div style={styles.kpiHeader}>
            <span style={styles.kpiLabel}>Disponibilité Infrastructure</span>
            <span style={{ color: '#10B981' }}>●</span>
          </div>
          <div className="data-mono" style={styles.kpiValue}>{metrics.uptime}</div>
          <div style={styles.kpiFooter}><span style={styles.kpiFooterText}>Uptime des instances de production</span></div>
        </div>

        <div className="onyx-card" style={styles.kpiCard}>
          <div style={styles.kpiHeader}>
            <span style={styles.kpiLabel}>Latence Requêtes API</span>
            <span style={{ color: '#D4AF37' }}>▲</span>
          </div>
          <div className="data-mono" style={styles.kpiValue}>{metrics.apiLatency}</div>
          <div style={styles.kpiFooter}><span style={styles.kpiFooterText}>Temps de réponse moyen BDD</span></div>
        </div>

        <div className="onyx-card" style={styles.kpiCard}>
          <div style={styles.kpiHeader}>
            <span style={styles.kpiLabel}>Stockage Global</span>
            <span style={{ color: 'var(--color-accent-blue)' }}>■</span>
          </div>
          <div className="data-mono" style={styles.kpiValue}>{metrics.totalStorage}</div>
          <div style={styles.kpiFooter}><span style={styles.kpiFooterText}>Volume de stockage Supabase utilisé</span></div>
        </div>

        <div className="onyx-card" style={styles.kpiCard}>
          <div style={styles.kpiHeader}>
            <span style={styles.kpiLabel}>Erreurs d'Authentification</span>
            <span style={{ color: '#EF4444' }}>⚡</span>
          </div>
          <div className="data-mono" style={{ ...styles.kpiValue, color: metrics.failedLogins > 5 ? '#EF4444' : '#FFFFFF' }}>
            {metrics.failedLogins}
          </div>
          <div style={styles.kpiFooter}><span style={styles.kpiFooterText}>Tentatives de connexion échouées (24h)</span></div>
        </div>
      </div>

      <div style={styles.splitSection}>
        {/* Subscription & Tenant Management Table */}
        <div className="onyx-card" style={styles.tableCard}>
          <div style={styles.tableCardHeader}>
            <h3 style={styles.cardTitle}>Gestion des Abonnements & Locataires</h3>
            <span style={styles.tableSubtitle}>{tenants.length} entreprise{tenants.length > 1 ? 's' : ''} enregistrée{tenants.length > 1 ? 's' : ''}</span>
          </div>
          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Entreprise Cliente</th>
                  <th style={styles.th}>Statut Abonnement</th>
                  <th style={styles.th}>Expiration</th>
                  <th style={styles.th}>Accès Plateforme</th>
                  <th style={{ ...styles.th, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {tenants.map(tenant => {
                  const accessStatus = tenantStatuses[tenant.id] || 'actif';
                  const sub = subscriptions[tenant.id];
                  // Re-compute current subscription status live
                  const liveSubData = supabaseSim.checkSubscriptionStatus(tenant.id);
                  const badge = getSubBadge(liveSubData.subscription_status);

                  return (
                    <tr key={tenant.id} style={styles.tr}>
                      <td style={styles.td}>
                        <div style={styles.tenantCell}>
                          <div style={styles.tenantAvatar}>{tenant.logoText || tenant.name[0]}</div>
                          <div>
                            <div style={{ color: '#FFFFFF', fontWeight: '600', fontSize: '0.9rem' }}>{tenant.name}</div>
                            <div className="data-mono" style={{ fontSize: '0.7rem', color: '#6B7280', marginTop: '2px' }}>{tenant.id}</div>
                          </div>
                        </div>
                      </td>

                      {/* Subscription Status Badge */}
                      <td style={styles.td}>
                        <span style={{
                          ...styles.statusBadge,
                          color: badge.color,
                          backgroundColor: badge.bg,
                          borderColor: badge.border
                        }}>
                          {badge.label}
                        </span>
                        {liveSubData.subscription_status === 'grace_period' && (
                          <div style={{ fontSize: '0.7rem', color: '#F59E0B', marginTop: '4px' }}>
                            {7 + liveSubData.daysUntilExpiry}j restants
                          </div>
                        )}
                      </td>

                      {/* Expiration Date */}
                      <td style={styles.td}>
                        <span className="data-mono" style={{
                          color: liveSubData.daysUntilExpiry < 0 ? '#EF4444' : liveSubData.daysUntilExpiry < 30 ? '#F59E0B' : '#9CA3AF',
                          fontSize: '0.85rem'
                        }}>
                          {formatDate(liveSubData.subscription_end_date)}
                        </span>
                      </td>

                      {/* Platform Access Toggle */}
                      <td style={styles.td}>
                        <button
                          onClick={() => handleToggleStatus(tenant.id, tenant.name)}
                          style={{
                            ...styles.btnState,
                            backgroundColor: accessStatus === 'actif' ? 'rgba(239, 68, 68, 0.08)' : 'rgba(16, 185, 129, 0.12)',
                            color: accessStatus === 'actif' ? '#EF4444' : '#10B981',
                            borderColor: accessStatus === 'actif' ? 'rgba(239, 68, 68, 0.25)' : 'rgba(16, 185, 129, 0.35)',
                          }}
                        >
                          {accessStatus === 'actif' ? '🔴 Suspendre' : '🟢 Activer'}
                        </button>
                      </td>

                      {/* Renewal & Deletion Actions */}
                      <td style={{ ...styles.td, textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '8px', justifyContent: 'flex-end' }}>
                          <button
                            onClick={() => openRenewModal(tenant, sub)}
                            style={styles.btnProlonger}
                            title="Prolonger l'abonnement"
                          >
                            📅 Prolonger
                          </button>
                          <button
                            onClick={async () => {
                              if (window.confirm(t('adm_delete_confirm', { name: tenant.name }))) {
                                if (window.confirm(language === 'en' ? 'FINAL WARNING: All database tables and auth users for this tenant will be permanently deleted. Proceed?' : 'ATTENTION FINALE : Toutes les tables et utilisateurs associés à ce locataire seront supprimés. Continuer ?')) {
                                  try {
                                    await deleteTenantAccount(tenant.id);
                                    alert(language === 'en' ? 'Tenant account successfully deleted.' : 'Espace locataire supprimé avec succès.');
                                  } catch (err) {
                                    alert(t('error_occurred') + ': ' + err.message);
                                  }
                                }
                              }
                            }}
                            style={{
                              ...styles.btnProlonger,
                              backgroundColor: 'rgba(239, 68, 68, 0.1)',
                              color: '#EF4444',
                              borderColor: 'rgba(239, 68, 68, 0.3)',
                              marginLeft: '8px'
                            }}
                            title="Supprimer définitivement l'espace et les utilisateurs"
                          >
                            🗑️ {t('delete')}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Platform deployment logs */}
        <div className="onyx-card" style={styles.logsCard}>
          <h3 style={styles.cardTitle}>Historique des Déploiements Système</h3>
          <div style={styles.logsContainer}>
            {logs.map((log, idx) => (
              <div key={idx} style={styles.logItem}>
                <div style={styles.logHeader}>
                  <span className="data-mono" style={styles.logDate}>{log.date}</span>
                  <span style={styles.systemBadge}>DEPLOY</span>
                </div>
                <p style={styles.logMessage}>{log.msg}</p>
                <div style={styles.logStatus}>
                  <span>Environnement : Production Cloud</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ─── Renewal Modal ─── */}
      {renewModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalCard}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>📅 Prolonger l'Abonnement</h3>
              <button onClick={() => setRenewModal(null)} style={styles.btnClose}>✕</button>
            </div>

            <div style={styles.modalTenantInfo}>
              <span style={styles.modalLabel}>Entreprise</span>
              <span style={styles.modalValue}>{renewModal.tenantName}</span>
            </div>

            <div style={styles.modalTenantInfo}>
              <span style={styles.modalLabel}>Expiration actuelle</span>
              <span style={{ ...styles.modalValue, color: '#EF4444' }}>{formatDate(renewModal.currentEndDate)}</span>
            </div>

            {/* Month Selector */}
            <div style={styles.monthSection}>
              <label style={styles.modalLabel}>Durée de prolongation</label>
              <div style={styles.monthGrid}>
                {[1, 2, 3, 6, 9, 12].map(m => (
                  <button
                    key={m}
                    onClick={() => setSelectedMonths(m)}
                    style={{
                      ...styles.monthBtn,
                      backgroundColor: selectedMonths === m ? '#D4AF37' : 'rgba(212, 175, 55, 0.06)',
                      color: selectedMonths === m ? '#0A0A0A' : '#D4AF37',
                      borderColor: selectedMonths === m ? '#D4AF37' : 'rgba(212, 175, 55, 0.2)',
                      fontWeight: selectedMonths === m ? '700' : '500',
                      transform: selectedMonths === m ? 'scale(1.04)' : 'scale(1)'
                    }}
                  >
                    {m} mois
                  </button>
                ))}
              </div>

              {/* Fine-grained input */}
              <div style={styles.monthInputRow}>
                <label style={{ ...styles.modalLabel, fontSize: '0.8rem' }}>Ou saisir un nombre exact (1–12)</label>
                <input
                  type="number"
                  min={1} max={12}
                  value={selectedMonths}
                  onChange={(e) => setSelectedMonths(Math.min(12, Math.max(1, parseInt(e.target.value) || 1)))}
                  className="onyx-input data-mono"
                  style={styles.monthInput}
                />
              </div>
            </div>

            {/* Auto-calculated New Expiry */}
            <div style={styles.newExpiryBox}>
              <span style={styles.modalLabel}>Nouvelle date d'expiration calculée</span>
              <span style={styles.newExpiryDate}>{calcNewEndDate(renewModal.currentEndDate, selectedMonths)}</span>
            </div>

            <div style={styles.modalSqlPreview}>
              <span style={{ color: '#6B7280', fontSize: '0.7rem' }}>SQL Supabase :</span>
              <code style={{ color: '#D4AF37', fontSize: '0.72rem', display: 'block', marginTop: '4px', lineHeight: '1.4' }}>
                UPDATE tenants SET subscription_status = 'active',<br/>
                subscription_end_date = '{calcNewEndDate(renewModal.currentEndDate, selectedMonths)}'<br/>
                WHERE id = '{renewModal.tenantId}'
              </code>
            </div>

            <button
              onClick={handleConfirmRenew}
              disabled={renewLoading}
              style={{ ...styles.btnRenewConfirm, opacity: renewLoading ? 0.7 : 1 }}
            >
              {renewLoading ? '⏳ Enregistrement en BDD...' : `✅ Valider le renouvellement (+${selectedMonths} mois)`}
            </button>
          </div>
        </div>
      )}
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
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '16px',
    borderBottom: '1px solid rgba(212, 175, 55, 0.2)',
    paddingBottom: '16px'
  },
  title: {
    fontSize: '1.8rem',
    marginBottom: '4px',
    color: '#D4AF37'
  },
  subtitle: {
    fontSize: '0.9rem',
    color: 'var(--color-text-secondary)'
  },
  goldBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    background: 'rgba(212, 175, 55, 0.08)',
    border: '1px solid rgba(212, 175, 55, 0.2)',
    padding: '6px 12px',
    borderRadius: '6px',
    fontSize: '0.85rem',
    color: '#D4AF37',
    fontWeight: '600'
  },
  goldDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: '#D4AF37',
    display: 'inline-block'
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
    padding: '20px',
    borderColor: 'rgba(212, 175, 55, 0.15)'
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
    margin: '12px 0 6px 0',
    color: '#FFFFFF'
  },
  kpiFooter: {
    fontSize: '0.8rem'
  },
  kpiFooterText: {
    color: 'var(--color-text-secondary)'
  },
  splitSection: {
    display: 'grid',
    gridTemplateColumns: '7fr 5fr',
    gap: '24px'
  },
  tableCard: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    borderColor: 'rgba(212, 175, 55, 0.15)'
  },
  tableCardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
    paddingBottom: '10px'
  },
  cardTitle: {
    fontSize: '1.1rem',
    fontWeight: '600',
    color: '#D4AF37',
    margin: 0
  },
  tableSubtitle: {
    fontSize: '0.78rem',
    color: '#6B7280',
    fontWeight: '500'
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
    padding: '10px 10px',
    fontSize: '0.75rem',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: 'var(--color-text-secondary)',
    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
    fontWeight: '500',
    whiteSpace: 'nowrap'
  },
  tr: {
    borderBottom: '1px solid rgba(255, 255, 255, 0.03)',
    transition: 'background 0.15s'
  },
  td: {
    padding: '14px 10px',
    fontSize: '0.85rem',
    color: 'var(--color-text-secondary)',
    verticalAlign: 'middle'
  },
  tenantCell: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  tenantAvatar: {
    width: '32px',
    height: '32px',
    borderRadius: '6px',
    backgroundColor: 'rgba(212, 175, 55, 0.12)',
    color: '#D4AF37',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.75rem',
    fontWeight: '700',
    flexShrink: 0
  },
  statusBadge: {
    display: 'inline-block',
    padding: '3px 8px',
    borderRadius: '4px',
    fontSize: '0.72rem',
    fontWeight: '700',
    border: '1px solid',
    letterSpacing: '0.06em'
  },
  btnState: {
    padding: '5px 10px',
    fontSize: '0.75rem',
    border: '1px solid',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    whiteSpace: 'nowrap'
  },
  btnProlonger: {
    padding: '5px 12px',
    fontSize: '0.8rem',
    backgroundColor: 'rgba(212, 175, 55, 0.08)',
    color: '#D4AF37',
    border: '1px solid rgba(212, 175, 55, 0.25)',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '600',
    transition: 'all 0.2s ease',
    whiteSpace: 'nowrap'
  },
  logsCard: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    borderColor: 'rgba(212, 175, 55, 0.15)'
  },
  logsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    maxHeight: '380px',
    overflowY: 'auto'
  },
  logItem: {
    background: 'rgba(255, 255, 255, 0.02)',
    border: '1px solid rgba(255, 255, 255, 0.05)',
    borderRadius: '6px',
    padding: '12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  logHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  logDate: {
    fontSize: '0.75rem',
    color: '#9CA3AF'
  },
  systemBadge: {
    fontSize: '0.65rem',
    backgroundColor: 'rgba(212, 175, 55, 0.1)',
    color: '#D4AF37',
    border: '1px solid rgba(212, 175, 55, 0.3)',
    borderRadius: '3px',
    padding: '1px 5px',
    fontWeight: '600'
  },
  logMessage: {
    fontSize: '0.85rem',
    color: '#FFFFFF',
    margin: 0
  },
  logStatus: {
    fontSize: '0.75rem',
    color: '#10B981',
    fontWeight: '500'
  },

  // ─── Renewal Modal ───
  modalOverlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '20px'
  },
  modalCard: {
    backgroundColor: '#111111',
    border: '1px solid rgba(212, 175, 55, 0.25)',
    borderRadius: '14px',
    padding: '28px',
    maxWidth: '480px',
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: '18px',
    boxShadow: '0 0 40px rgba(212, 175, 55, 0.08)'
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  modalTitle: {
    color: '#D4AF37',
    margin: 0,
    fontSize: '1.2rem'
  },
  btnClose: {
    background: 'none',
    border: 'none',
    color: '#6B7280',
    fontSize: '1.2rem',
    cursor: 'pointer',
    padding: '2px 6px',
    borderRadius: '4px'
  },
  modalTenantInfo: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    padding: '10px 14px',
    borderRadius: '6px',
    fontSize: '0.9rem'
  },
  modalLabel: {
    color: '#6B7280',
    fontSize: '0.85rem',
    marginBottom: '8px',
    display: 'block'
  },
  modalValue: {
    color: '#FFFFFF',
    fontWeight: '600'
  },
  monthSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  monthGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '8px'
  },
  monthBtn: {
    padding: '10px 6px',
    border: '1px solid',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '0.9rem',
    transition: 'all 0.15s ease',
    textAlign: 'center'
  },
  monthInputRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  },
  monthInput: {
    maxWidth: '140px',
    padding: '8px 12px',
    fontSize: '1rem',
    textAlign: 'center'
  },
  newExpiryBox: {
    backgroundColor: 'rgba(16, 185, 129, 0.06)',
    border: '1px solid rgba(16, 185, 129, 0.2)',
    borderRadius: '8px',
    padding: '14px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  newExpiryDate: {
    color: '#10B981',
    fontWeight: '700',
    fontSize: '1.1rem',
    fontFamily: 'monospace'
  },
  modalSqlPreview: {
    backgroundColor: '#0D0D0D',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: '6px',
    padding: '12px',
    fontFamily: 'monospace'
  },
  btnRenewConfirm: {
    backgroundColor: '#D4AF37',
    color: '#0A0A0A',
    border: 'none',
    borderRadius: '8px',
    padding: '13px 20px',
    fontSize: '1rem',
    fontWeight: '700',
    cursor: 'pointer',
    width: '100%',
    transition: 'opacity 0.2s ease'
  }
};
