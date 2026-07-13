import React, { useState } from 'react';
import { useTenant } from '../context/TenantContext';

export const SubscriptionGuard = ({ children }) => {
  const {
    activeTenant,
    subscriptionStatus,
    subscriptionEndDate,
    daysUntilExpiry,
    renewSubscription,
    currentUser
  } = useTenant();

  const [renewModalOpen, setRenewModalOpen] = useState(false);

  // Admins always bypass the guard
  const isAdmin = currentUser.role === 'factory_admin';
  if (isAdmin) return children;

  // Format dates
  const formatDate = (isoStr) => {
    if (!isoStr) return '—';
    return new Date(isoStr).toLocaleDateString('fr-GA', {
      day: 'numeric', month: 'long', year: 'numeric'
    });
  };

  const handleRenew = () => {
    setRenewModalOpen(false);
    alert(`Votre demande de renouvellement est prise en compte. Elle sera activée dès réception de votre virement sur notre compte. Merci !`);
  };

  // ───────────────────────────────────────────────
  // SUSPENDED MODE — Full page intercept
  // ───────────────────────────────────────────────
  if (subscriptionStatus === 'suspended') {
    return (
      <div style={styles.suspendedOverlay}>
        {/* Animated Background Grid */}
        <div style={styles.gridBg}></div>

        <div style={styles.suspendedCard}>
          {/* 241 Code Factory Brand */}
          <div style={styles.factoryHeader}>
            <span style={styles.factoryDot}></span>
            <span style={styles.factoryLabel}>241 Code Factory · Système d'Abonnement</span>
          </div>

          {/* Lock Icon */}
          <div style={styles.lockIcon}>🔐</div>

          <h1 style={styles.suspendedTitle}>Accès Restreint</h1>
          <p style={styles.suspendedSubtitle}>
            L'accès à votre espace Onyx Gest a été suspendu suite à l'expiration de votre abonnement.
          </p>

          {/* Status Details */}
          <div style={styles.statusBox}>
            <div style={styles.statusRow}>
              <span style={styles.statusLabel}>Entreprise</span>
              <span style={styles.statusValue}>{activeTenant?.name}</span>
            </div>
            <div style={styles.statusRow}>
              <span style={styles.statusLabel}>Date d'expiration</span>
              <span style={{ ...styles.statusValue, color: '#EF4444' }}>{formatDate(subscriptionEndDate)}</span>
            </div>
            <div style={styles.statusRow}>
              <span style={styles.statusLabel}>Jours de dépassement</span>
              <span style={{ ...styles.statusValue, color: '#EF4444' }}>{Math.abs(daysUntilExpiry)} jours</span>
            </div>
            <div style={styles.statusRow}>
              <span style={styles.statusLabel}>Statut</span>
              <span style={styles.suspendedBadge}>SUSPENDU</span>
            </div>
          </div>

          {/* Note: Data Preserved */}
          <div style={styles.dataNote}>
            <span>🛡️</span>
            <span>Vos données (factures, clients, devis) sont intactes et sécurisées. Le renouvellement rétablit immédiatement l'accès complet.</span>
          </div>

          {/* Actions */}
          <div style={styles.actionRow}>
            <button onClick={() => setRenewModalOpen(true)} style={styles.btnRenew}>
              🔄 Renouveler mon abonnement
            </button>
            <a
              href="mailto:contact@241codefactory.ga?subject=Renouvellement abonnement Onyx Gest"
              style={styles.btnContact}
            >
              ✉️ Contacter 241 Code Factory
            </a>
          </div>
        </div>

        {/* Renewal Confirmation Modal with Mobile Money Payments */}
        {renewModalOpen && (
          <div style={styles.modalOverlay}>
            <div style={{ ...styles.modalCard, maxWidth: '520px' }}>
              <h3 style={styles.modalTitle}>📲 Renouvellement par Mobile Money</h3>
              
              <p style={styles.modalInstruction}>
                Veuillez effectuer votre virement au numéro correspondant à votre opérateur, puis cliquez sur le bouton Valider ci-dessous pour confirmer votre paiement.
              </p>

              <div style={styles.paymentGrid}>
                {/* Airtel Money */}
                <div style={styles.operatorCard}>
                  <div style={styles.operatorHeader}>
                    <span style={styles.operatorLogoAirtel}>A</span>
                    <span style={styles.operatorName}>Airtel Money</span>
                  </div>
                  <div style={styles.phoneBox}>
                    <span style={styles.phoneNumber}>+241 07 41 61 60 7</span>
                  </div>
                  <div style={styles.ownerText}>
                    Titulaire : <span style={{ color: '#E0E0E0' }}>BOULINGUI MBEMBO GASTON EMMANUEL</span>
                  </div>
                </div>

                {/* Moov Money */}
                <div style={styles.operatorCard}>
                  <div style={styles.operatorHeader}>
                    <span style={styles.operatorLogoMoov}>M</span>
                    <span style={styles.operatorName}>Moov Money</span>
                  </div>
                  <div style={styles.phoneBox}>
                    <span style={styles.phoneNumber}>+241 06 62 64 14 4</span>
                  </div>
                  <div style={styles.ownerText}>
                    Titulaire : <span style={{ color: '#E0E0E0' }}>BOULINGUI MBEMBO GASTON EMMANUEL</span>
                  </div>
                </div>
              </div>

              <div style={styles.modalActions}>
                <button onClick={handleRenew} style={styles.btnRenewConfirm}>
                  Valider le paiement
                </button>
                <button onClick={() => setRenewModalOpen(false)} style={styles.btnCancel}>
                  Annuler
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ───────────────────────────────────────────────
  // GRACE PERIOD MODE — Non-blocking warning banner
  // ───────────────────────────────────────────────
  const graceBanner = subscriptionStatus === 'grace_period' ? (
    <div style={styles.graceBanner}>
      <div style={styles.graceContent}>
        <span style={styles.graceIcon}>⏳</span>
        <div>
          <strong style={{ color: '#1A1A1A' }}>
            Période de Grâce — Votre abonnement a expiré il y a {Math.abs(daysUntilExpiry)} jour{Math.abs(daysUntilExpiry) > 1 ? 's' : ''}.
          </strong>
          <span style={styles.graceSubtext}>
            {' '}Il vous reste {7 + daysUntilExpiry} jour{7 + daysUntilExpiry > 1 ? 's' : ''} avant la suspension totale de votre espace.
            Expiration initiale : {formatDate(subscriptionEndDate)}.
          </span>
        </div>
      </div>
      <button onClick={() => setRenewModalOpen(true)} style={styles.btnRenewSmall}>
        Renouveler maintenant
      </button>

      {renewModalOpen && (
        <div style={styles.modalOverlay}>
          <div style={{ ...styles.modalCard, maxWidth: '520px' }}>
            <h3 style={styles.modalTitle}>📲 Renouvellement par Mobile Money</h3>
            
            <p style={styles.modalInstruction}>
              Veuillez effectuer votre virement au numéro correspondant à votre opérateur, puis cliquez sur le bouton Valider ci-dessous pour confirmer votre paiement.
            </p>

            <div style={styles.paymentGrid}>
              {/* Airtel Money */}
              <div style={styles.operatorCard}>
                <div style={styles.operatorHeader}>
                  <span style={styles.operatorLogoAirtel}>A</span>
                  <span style={styles.operatorName}>Airtel Money</span>
                </div>
                <div style={styles.phoneBox}>
                  <span style={styles.phoneNumber}>+241 07 41 61 60 7</span>
                </div>
                <div style={styles.ownerText}>
                  Titulaire : <span style={{ color: '#E0E0E0' }}>BOULINGUI MBEMBO GASTON EMMANUEL</span>
                </div>
              </div>

              {/* Moov Money */}
              <div style={styles.operatorCard}>
                <div style={styles.operatorHeader}>
                  <span style={styles.operatorLogoMoov}>M</span>
                  <span style={styles.operatorName}>Moov Money</span>
                </div>
                <div style={styles.phoneBox}>
                  <span style={styles.phoneNumber}>+241 06 62 64 14 4</span>
                </div>
                <div style={styles.ownerText}>
                  Titulaire : <span style={{ color: '#E0E0E0' }}>BOULINGUI MBEMBO GASTON EMMANUEL</span>
                </div>
              </div>
            </div>

            <div style={styles.modalActions}>
              <button onClick={handleRenew} style={styles.btnRenewConfirm}>
                Valider le paiement
              </button>
              <button onClick={() => setRenewModalOpen(false)} style={styles.btnCancel}>
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  ) : null;

  // ───────────────────────────────────────────────
  // ACTIVE MODE — Fully transparent pass-through
  // ───────────────────────────────────────────────
  return (
    <div style={styles.guardWrapper}>
      {graceBanner}
      {children}
    </div>
  );
};

// Context hook to allow any child component to check write permissions
export const useSubscriptionWritable = () => {
  const { subscriptionStatus, currentUser } = useTenant();
  const isAdmin = currentUser.role === 'factory_admin';
  // Admin always writable; clients only writable when active or in grace_period
  const canWrite = isAdmin || subscriptionStatus === 'active' || subscriptionStatus === 'grace_period';
  const isSuspended = !isAdmin && subscriptionStatus === 'suspended';
  return { canWrite, isSuspended, subscriptionStatus };
};

const styles = {
  guardWrapper: {
    display: 'flex',
    flexDirection: 'column',
    width: '100%'
  },

  // ─── Grace Period Banner ───
  graceBanner: {
    backgroundColor: '#D4AF37',
    color: '#1A1A1A',
    padding: '12px 24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: '12px',
    fontSize: '0.9rem',
    boxShadow: '0 2px 10px rgba(212, 175, 55, 0.3)',
    position: 'relative',
    zIndex: 50
  },
  graceContent: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  graceIcon: {
    fontSize: '1.4rem'
  },
  graceSubtext: {
    fontWeight: '400',
    color: '#3D3000'
  },
  btnRenewSmall: {
    backgroundColor: '#1A1A1A',
    color: '#D4AF37',
    border: 'none',
    borderRadius: '6px',
    padding: '6px 14px',
    fontSize: '0.85rem',
    fontWeight: '700',
    cursor: 'pointer',
    whiteSpace: 'nowrap'
  },

  // ─── Suspended Full Page ───
  suspendedOverlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: '#0A0A0A',
    background: 'radial-gradient(ellipse at center, #0E0E0E 0%, #051015 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    padding: '20px',
    overflowY: 'auto'
  },
  gridBg: {
    position: 'absolute',
    inset: 0,
    backgroundImage: 'linear-gradient(rgba(212, 175, 55, 0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(212, 175, 55, 0.04) 1px, transparent 1px)',
    backgroundSize: '40px 40px',
    pointerEvents: 'none'
  },
  suspendedCard: {
    position: 'relative',
    backgroundColor: '#111111',
    border: '1px solid rgba(212, 175, 55, 0.2)',
    borderRadius: '16px',
    padding: '40px',
    maxWidth: '520px',
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '20px',
    textAlign: 'center',
    boxShadow: '0 0 60px rgba(212, 175, 55, 0.08)'
  },
  factoryHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '0.8rem',
    color: '#D4AF37',
    fontWeight: '600'
  },
  factoryDot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    backgroundColor: '#D4AF37',
    display: 'inline-block'
  },
  factoryLabel: {
    letterSpacing: '0.05em'
  },
  lockIcon: {
    fontSize: '3.5rem',
    filter: 'drop-shadow(0 0 20px rgba(239, 68, 68, 0.5))'
  },
  suspendedTitle: {
    fontSize: '2rem',
    color: '#FFFFFF',
    margin: 0
  },
  suspendedSubtitle: {
    fontSize: '0.95rem',
    color: '#9CA3AF',
    lineHeight: '1.6',
    margin: 0
  },
  statusBox: {
    width: '100%',
    backgroundColor: '#1A1A1A',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: '8px',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px'
  },
  statusRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '0.9rem'
  },
  statusLabel: {
    color: '#6B7280'
  },
  statusValue: {
    color: '#FFFFFF',
    fontWeight: '600'
  },
  suspendedBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    color: '#EF4444',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    borderRadius: '4px',
    padding: '2px 8px',
    fontSize: '0.75rem',
    fontWeight: '700',
    letterSpacing: '0.08em'
  },
  dataNote: {
    display: 'flex',
    gap: '10px',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(16, 185, 129, 0.05)',
    border: '1px solid rgba(16, 185, 129, 0.15)',
    borderRadius: '8px',
    padding: '12px',
    fontSize: '0.82rem',
    color: '#9CA3AF',
    textAlign: 'left',
    lineHeight: '1.5'
  },
  actionRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    width: '100%'
  },
  btnRenew: {
    backgroundColor: '#D4AF37',
    color: '#0A0A0A',
    border: 'none',
    borderRadius: '8px',
    padding: '12px 20px',
    fontSize: '1rem',
    fontWeight: '700',
    cursor: 'pointer',
    width: '100%',
    transition: 'opacity 0.2s ease'
  },
  btnContact: {
    display: 'block',
    backgroundColor: 'rgba(212, 175, 55, 0.06)',
    color: '#D4AF37',
    border: '1px solid rgba(212, 175, 55, 0.2)',
    borderRadius: '8px',
    padding: '10px 20px',
    fontSize: '0.9rem',
    fontWeight: '600',
    cursor: 'pointer',
    width: '100%',
    textDecoration: 'none',
    boxSizing: 'border-box',
    textAlign: 'center'
  },

  // ─── Renewal Confirmation Modal ───
  modalOverlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.8)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10000,
    padding: '20px'
  },
  modalCard: {
    backgroundColor: '#0A0A0A',
    border: '1px solid rgba(212, 175, 55, 0.25)',
    borderRadius: '12px',
    padding: '28px',
    maxWidth: '420px',
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.6)'
  },
  modalTitle: {
    color: '#D4AF37',
    margin: 0,
    fontSize: '1.25rem',
    fontWeight: '700',
    textAlign: 'center'
  },
  modalInstruction: {
    color: '#9CA3AF',
    fontSize: '0.85rem',
    lineHeight: '1.5',
    margin: '0 0 8px 0',
    textAlign: 'center'
  },
  paymentGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px'
  },
  operatorCard: {
    backgroundColor: '#111111',
    border: '1px solid rgba(255,255,255,0.04)',
    borderRadius: '8px',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  operatorHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  operatorLogoAirtel: {
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    backgroundColor: '#FF0000',
    color: '#FFFFFF',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.75rem',
    fontWeight: '800'
  },
  operatorLogoMoov: {
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    backgroundColor: '#00B0FF',
    color: '#FFFFFF',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.75rem',
    fontWeight: '800'
  },
  operatorName: {
    fontWeight: '700',
    color: '#FFFFFF',
    fontSize: '0.9rem'
  },
  phoneBox: {
    border: '1px solid #D4AF37',
    borderRadius: '6px',
    padding: '10px',
    textAlign: 'center',
    backgroundColor: 'rgba(212, 175, 55, 0.03)',
    margin: '4px 0'
  },
  phoneNumber: {
    fontFamily: 'monospace',
    color: '#D4AF37',
    fontSize: '1.2rem',
    fontWeight: '700'
  },
  ownerText: {
    fontSize: '0.75rem',
    color: '#6B7280'
  },
  modalActions: {
    display: 'flex',
    gap: '10px',
    marginTop: '8px'
  },
  btnRenewConfirm: {
    flex: 2,
    backgroundColor: '#D4AF37',
    color: '#0A0A0A',
    border: 'none',
    borderRadius: '6px',
    padding: '12px',
    cursor: 'pointer',
    fontSize: '0.9rem',
    fontWeight: '700',
    transition: 'opacity 0.2s ease'
  },
  btnCancel: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    color: '#9CA3AF',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '6px',
    padding: '12px',
    cursor: 'pointer',
    fontSize: '0.9rem',
    fontWeight: '600'
  }
};
