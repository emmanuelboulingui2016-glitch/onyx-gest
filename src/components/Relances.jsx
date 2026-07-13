import React, { useState, useEffect } from 'react';
import { useTenant } from '../context/TenantContext';
import { supabaseSim } from '../utils/supabaseSim';

export const Relances = () => {
  const { activeTenant } = useTenant();
  const [lateInvoices, setLateInvoices] = useState([]);
  const [logs, setLogs] = useState([]);
  const [sendingId, setSendingId] = useState(null);

  useEffect(() => {
    loadData();
  }, [activeTenant]);

  const loadData = () => {
    const invoices = supabaseSim.getInvoices(activeTenant.id);
    const unpaid = invoices.filter(inv => inv.type === 'facture' && inv.status === 'en_retard');
    setLateInvoices(unpaid);

    const dunningLogs = supabaseSim.getDunningLogs(activeTenant.id);
    setLogs(dunningLogs);
  };

  const handleSendReminder = (invoice, type) => {
    setSendingId(`${invoice.id}_${type}`);

    // Simulate sending network request (email/SMS gateway)
    setTimeout(() => {
      const message = type === 'email' 
        ? `Relance courriel formelle envoyée à ${invoice.client_email} pour le recouvrement de la facture ${invoice.number} (${formatFCFA(invoice.amount)}).`
        : `Alerte SMS de rappel envoyée au contact de ${invoice.client_name} pour la facture ${invoice.number}.`;

      const newLog = {
        tenant_id: activeTenant.id,
        invoice_id: invoice.id,
        invoice_number: invoice.number,
        date: new Date().toISOString().replace('T', ' ').slice(0, 16),
        type: type,
        status: 'succes',
        message: message
      };

      try {
        supabaseSim.createDunningLog(activeTenant.id, newLog);
        
        // Optionally update status to shown as relancé
        supabaseSim.updateInvoiceStatus(activeTenant.id, invoice.id, 'en_retard'); // remains en_retard but logs added
        
        alert(`Relance par ${type.toUpperCase()} transmise avec succès !`);
        loadData();
      } catch (err) {
        alert(err.message);
      } finally {
        setSendingId(null);
      }
    }, 1200);
  };

  const formatFCFA = (amount) => {
    return new Intl.NumberFormat('fr-GA', {
      style: 'currency',
      currency: 'XAF',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Système de Relance Automatique</h1>
      <p style={styles.subtitle}>Supervision et automatisation du recouvrement des factures en souffrance.</p>

      <div style={styles.splitLayout}>
        {/* Unpaid invoices list */}
        <div className="onyx-card" style={styles.card}>
          <h3 style={styles.cardTitle}>Factures en Retard de Paiement</h3>
          
          {lateInvoices.length > 0 ? (
            <div style={styles.lateList}>
              {lateInvoices.map(inv => {
                // Calculate simulated overdue days
                const days = inv.id === 'inv_102' ? 4 : inv.id === 'inv_202' ? 8 : 5;
                return (
                  <div key={inv.id} style={styles.lateItem}>
                    <div style={styles.lateItemHeader}>
                      <span className="data-mono" style={styles.invNumber}>{inv.number}</span>
                      <span style={styles.overdueBadge}>{days} jours de retard</span>
                    </div>
                    
                    <div style={styles.lateItemBody}>
                      <p><strong>Client:</strong> {inv.client_name}</p>
                      <p><strong>Montant dû:</strong> <span className="data-mono" style={{ color: '#F59E0B', fontWeight: '600' }}>{formatFCFA(inv.amount)}</span></p>
                      <p><strong>Échéance:</strong> {inv.due_date}</p>
                    </div>

                    <div style={styles.lateItemActions}>
                      <button 
                        onClick={() => handleSendReminder(inv, 'email')} 
                        className="btn-primary"
                        disabled={sendingId !== null}
                        style={styles.btnAction}
                      >
                        {sendingId === `${inv.id}_email` ? 'Envoi...' : '✉️ Relancer par Email'}
                      </button>
                      <button 
                        onClick={() => handleSendReminder(inv, 'sms')} 
                        className="btn-secondary"
                        disabled={sendingId !== null}
                        style={styles.btnAction}
                      >
                        {sendingId === `${inv.id}_sms` ? 'Envoi...' : '📱 Relancer par SMS'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={styles.emptyState}>
              <svg width="48" height="48" fill="none" viewBox="0 0 24 24" stroke="#10B981" style={{ marginBottom: '12px' }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p style={{ color: '#10B981', fontWeight: '600' }}>Aucun retard de paiement détecté !</p>
              <p style={{ fontSize: '0.85rem', marginTop: '4px' }}>Toutes les factures de ce tenant sont réglées.</p>
            </div>
          )}
        </div>

        {/* History of reminders */}
        <div className="onyx-card" style={styles.card}>
          <h3 style={styles.cardTitle}>Journal d'Audit des Relances</h3>
          
          <div style={styles.logContainer}>
            {logs.length > 0 ? (
              logs.map(log => (
                <div key={log.id} style={styles.logItem}>
                  <div style={styles.logItemHeader}>
                    <span className="data-mono" style={styles.logTime}>{log.date}</span>
                    <span style={{
                      ...styles.logBadge,
                      color: log.type === 'email' ? 'var(--color-accent-blue)' : 'var(--color-accent-yellow)',
                      borderColor: log.type === 'email' ? 'rgba(59, 130, 246, 0.4)' : 'rgba(245, 158, 11, 0.4)'
                    }}>
                      {log.type.toUpperCase()}
                    </span>
                  </div>
                  <p style={styles.logMessage}>{log.message}</p>
                  <div style={styles.logStatusRow}>
                    <span style={styles.statusLabel}>Statut :</span>
                    <span style={styles.statusValue}>Transmis (Passerelle Gabon Telecom)</span>
                  </div>
                </div>
              ))
            ) : (
              <div style={styles.emptyState}>Aucune relance effectuée pour le moment.</div>
            )}
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
  title: {
    fontSize: '1.8rem',
    marginBottom: '4px'
  },
  subtitle: {
    fontSize: '0.9rem',
    color: 'var(--color-text-secondary)',
    borderBottom: '1px solid rgba(59, 130, 246, 0.1)',
    paddingBottom: '16px'
  },
  splitLayout: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '24px'
  },
  card: {
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
  lateList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  lateItem: {
    background: 'rgba(255, 255, 255, 0.01)',
    border: '1px solid rgba(245, 158, 11, 0.2)',
    borderRadius: '6px',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  lateItemHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  invNumber: {
    color: 'var(--color-accent-blue)',
    fontWeight: '600',
    fontSize: '0.95rem'
  },
  overdueBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    color: 'var(--color-accent-yellow)',
    border: '1px solid rgba(245, 158, 11, 0.3)',
    borderRadius: '4px',
    padding: '2px 8px',
    fontSize: '0.75rem',
    fontWeight: '600'
  },
  lateItemBody: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    fontSize: '0.9rem'
  },
  lateItemActions: {
    display: 'flex',
    gap: '10px',
    marginTop: '4px'
  },
  btnAction: {
    flex: 1,
    justifyContent: 'center',
    padding: '8px 12px',
    fontSize: '0.85rem'
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '50px 0',
    color: 'var(--color-text-secondary)',
    textAlign: 'center'
  },
  logContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    maxHeight: '400px',
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
  logItemHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  logTime: {
    fontSize: '0.8rem',
    color: 'var(--color-text-secondary)'
  },
  logBadge: {
    display: 'inline-block',
    padding: '1px 6px',
    borderRadius: '3px',
    fontSize: '0.7rem',
    fontWeight: '600',
    border: '1px solid'
  },
  logMessage: {
    fontSize: '0.85rem',
    color: '#FFFFFF',
    lineHeight: '1.4'
  },
  logStatusRow: {
    display: 'flex',
    gap: '6px',
    fontSize: '0.75rem'
  },
  statusLabel: {
    color: 'var(--color-text-secondary)'
  },
  statusValue: {
    color: 'var(--color-accent-green)',
    fontWeight: '500'
  }
};
