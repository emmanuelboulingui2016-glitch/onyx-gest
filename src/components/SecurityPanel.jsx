import React, { useState, useEffect } from 'react';
import { useTenant } from '../context/TenantContext';
import { supabaseSim, subscribeToRlsLogs } from '../utils/supabaseSim';

export const SecurityPanel = () => {
  const { activeTenant, tenants } = useTenant();
  const [rlsLogs, setRlsLogs] = useState([]);
  const [activeTab, setActiveTab] = useState('supabase'); // 'supabase' or 'tauri'

  useEffect(() => {
    const unsubscribe = subscribeToRlsLogs((logs) => {
      setRlsLogs(logs);
    });
    return unsubscribe;
  }, []);

  const triggerUnauthorizedAttack = () => {
    // Determine the other tenant's ID
    const otherTenant = tenants.find(t => t.id !== activeTenant.id);
    if (!otherTenant) return;

    alert(`SIMULATION D'ATTAQUE: Tentative de lecture des données du tenant '${otherTenant.name}' (${otherTenant.id}) avec les identifiants de '${activeTenant.name}' (${activeTenant.id}).`);

    try {
      supabaseSim.getUnauthorizedInvoices(activeTenant.id, otherTenant.id);
    } catch (err) {
      console.warn('Caught expected authorization error:', err.message);
    }
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Console de Sécurité & Architecture</h1>
      <p style={styles.subtitle}>Supervision de l'étanchéité des données et de l'intégration système native.</p>

      {/* Tabs */}
      <div style={styles.tabsRow}>
        <button 
          onClick={() => setActiveTab('supabase')} 
          style={{
            ...styles.tabButton,
            borderBottom: activeTab === 'supabase' ? '2px solid var(--color-accent-blue)' : '2px solid transparent',
            color: activeTab === 'supabase' ? 'var(--color-accent-blue)' : 'var(--color-text-secondary)'
          }}
        >
          ☁️ Supabase RLS & Multi-Tenancy
        </button>
        <button 
          onClick={() => setActiveTab('tauri')} 
          style={{
            ...styles.tabButton,
            borderBottom: activeTab === 'tauri' ? '2px solid var(--color-accent-blue)' : '2px solid transparent',
            color: activeTab === 'tauri' ? 'var(--color-accent-blue)' : 'var(--color-text-secondary)'
          }}
        >
          🖥️ Tauri Native Core (Desktop)
        </button>
      </div>

      <div style={styles.contentLayout}>
        {/* Info panel */}
        <div className="onyx-card" style={styles.infoCard}>
          {activeTab === 'supabase' ? (
            <div>
              <h3 style={styles.cardTitle}>Sécurisation Row Level Security (RLS)</h3>
              <p style={styles.paragraph}>
                Pour garantir une étanchéité totale des données de chaque entreprise gabonaise, Onyx Gest s'appuie sur le mécanisme natif <strong>Row Level Security (RLS)</strong> de PostgreSQL fourni par Supabase.
              </p>
              <p style={styles.paragraph}>
                Chaque table contient une colonne <code className="data-mono" style={styles.inlineCode}>tenant_id</code>. Les politiques RLS interceptent toutes les requêtes SQL et s'assurent que l'utilisateur connecté ne peut manipuler que les lignes associées à son entreprise.
              </p>
              <div style={styles.codeBlockHeader}>Politique de Sécurité SQL active :</div>
              <pre className="data-mono" style={styles.codeBlock}>
{`-- Activer la RLS sur la table des factures
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- Créer la politique d'isolation stricte par entreprise
CREATE POLICY tenant_isolation_policy ON invoices
    FOR ALL
    TO authenticated
    USING (tenant_id = auth.jwt() ->> 'tenant_id')
    WITH CHECK (tenant_id = auth.jwt() ->> 'tenant_id');`}
              </pre>
              <button 
                onClick={triggerUnauthorizedAttack} 
                className="btn-primary" 
                style={styles.btnAttack}
              >
                🚨 Simuler une Tentative d'Accès Non Autorisé (Exploit)
              </button>
            </div>
          ) : (
            <div>
              <h3 style={styles.cardTitle}>Intégration Desktop Native (Tauri v2)</h3>
              <p style={styles.paragraph}>
                L'application Onyx Gest est compilée en tant qu'application système native légère via <strong>Tauri</strong>. Le moteur utilise Rust pour communiquer avec le système d'exploitation et charge le frontend React.
              </p>
              <p style={styles.paragraph}>
                Cela permet des performances optimales, une sécurité renforcée (pas de serveur web local exposé), et l'accès direct aux périphériques (ex: imprimantes locales pour les devis et factures).
              </p>
              <div style={styles.codeBlockHeader}>Configuration Tauri (<code className="data-mono">tauri.conf.json</code>) :</div>
              <pre className="data-mono" style={styles.codeBlock}>
{`{
  "productName": "Onyx Gest",
  "version": "1.0.0",
  "identifier": "ga.onyx.gest",
  "build": {
    "frontendDist": "../dist"
  },
  "permissions": [
    "core:default",
    "shell:allow-open",
    "printer:allow-print"
  ]
}`}
              </pre>
            </div>
          )}
        </div>

        {/* Live console logs */}
        <div className="onyx-card" style={styles.consoleCard}>
          <h3 style={styles.cardTitle}>Journal d'Audit RLS Supabase (Temps Réel)</h3>
          <div style={styles.consoleLogsWrapper}>
            {rlsLogs.length > 0 ? (
              rlsLogs.map((log, idx) => (
                <div key={idx} style={styles.consoleLogItem}>
                  <div style={styles.logMeta}>
                    <span className="data-mono" style={styles.logTime}>{log.timestamp}</span>
                    <span 
                      style={{
                        ...styles.statusBadge,
                        backgroundColor: log.status === 'ALLOWED' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.15)',
                        color: log.status === 'ALLOWED' ? '#10B981' : '#F59E0B',
                        borderColor: log.status === 'ALLOWED' ? '#10B981' : '#F59E0B'
                      }}
                    >
                      {log.status}
                    </span>
                  </div>
                  <div className="data-mono" style={styles.logQuery}>{log.query}</div>
                  <div style={styles.logDetails}>{log.details}</div>
                </div>
              ))
            ) : (
              <div style={styles.emptyConsole}>En attente de requêtes SQL...</div>
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
  tabsRow: {
    display: 'flex',
    gap: '24px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.05)'
  },
  tabButton: {
    background: 'none',
    border: 'none',
    padding: '10px 4px',
    fontSize: '0.95rem',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'color 0.2s ease, border-color 0.2s ease'
  },
  contentLayout: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '24px'
  },
  infoCard: {
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
  paragraph: {
    fontSize: '0.9rem',
    lineHeight: '1.5',
    color: 'var(--color-text-secondary)'
  },
  inlineCode: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: '2px 6px',
    borderRadius: '4px',
    color: '#FFFFFF'
  },
  codeBlockHeader: {
    fontSize: '0.8rem',
    fontWeight: '600',
    textTransform: 'uppercase',
    color: 'var(--color-text-secondary)',
    marginTop: '10px'
  },
  codeBlock: {
    backgroundColor: '#050505',
    border: '1px solid rgba(255, 255, 255, 0.05)',
    borderRadius: '6px',
    padding: '14px',
    fontSize: '0.8rem',
    lineHeight: '1.4',
    overflowX: 'auto',
    color: '#A7F3D0' // Minty-green text for code look
  },
  btnAttack: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    color: '#EF4444',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '600',
    justifyContent: 'center',
    marginTop: '10px',
    padding: '12px'
  },
  consoleCard: {
    display: 'flex',
    flexDirection: 'column'
  },
  consoleLogsWrapper: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
    maxHeight: '500px',
    overflowY: 'auto',
    padding: '8px 0'
  },
  consoleLogItem: {
    backgroundColor: '#030712',
    border: '1px solid rgba(59, 130, 246, 0.1)',
    borderRadius: '6px',
    padding: '12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  logMeta: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  logTime: {
    fontSize: '0.75rem',
    color: 'var(--color-text-secondary)'
  },
  statusBadge: {
    padding: '1px 6px',
    borderRadius: '4px',
    fontSize: '0.7rem',
    fontWeight: '700',
    border: '1px solid'
  },
  logQuery: {
    fontSize: '0.8rem',
    color: '#3B82F6',
    fontWeight: '500',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-all'
  },
  logDetails: {
    fontSize: '0.8rem',
    color: '#9CA3AF'
  },
  emptyConsole: {
    textAlign: 'center',
    padding: '60px 0',
    color: 'var(--color-text-secondary)',
    fontFamily: 'var(--font-mono)',
    fontSize: '0.85rem'
  }
};
