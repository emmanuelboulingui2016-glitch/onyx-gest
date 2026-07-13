import React from 'react';

export const LandingPage = ({ onStartOnboarding, onEnterDemo, onLogin }) => {
  
  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div style={styles.landingContainer}>
      {/* Animated Glowing Orbs */}
      <div style={styles.glowGreen}></div>
      <div style={styles.glowBlue}></div>

      {/* Header / Nav */}
      <header style={styles.header}>
        <div style={styles.brand} onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} style={{ ...styles.brand, cursor: 'pointer' }}>
          <div style={styles.logoCircle}>O</div>
          <span style={styles.brandText}>Onyx Gest</span>
        </div>
        <div style={styles.navLinks}>
          <span onClick={() => scrollToSection('features')} style={styles.navLink}>Fonctionnalités</span>
          <span onClick={() => scrollToSection('security')} style={styles.navLink}>Sécurité RLS</span>
          <span onClick={() => scrollToSection('pricing')} style={styles.navLink}>Tarification</span>
          <button onClick={onLogin} style={styles.btnNavDemo}>
            Connexion
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section style={styles.heroSection}>
        <div style={styles.heroTextCol}>
          <div style={styles.tagline}>
            <span style={styles.tagDot}></span>
            PROPULSÉ AU CŒUR DE L'AFRIQUE CENTRALE
          </div>
          <h1 style={styles.heroTitle}>
            L'excellence de la <br />
            <span style={styles.highlightText}>gestion commerciale</span> <br />
            gabonaise.
          </h1>
          <p style={styles.heroSubtitle}>
            Concevez, gérez et suivez vos devis et factures en toute sécurité. Une solution de niveau entreprise, conçue pour la conformité réglementaire (NIF, RCCM) et la souveraineté numérique.
          </p>
          <div style={styles.ctaRow}>
            <button onClick={onStartOnboarding} style={styles.btnSignUp}>
              S'inscrire à Onyx Gest
            </button>
            <button onClick={onEnterDemo} style={styles.btnDemo}>
              Tester l'Application
            </button>
          </div>
        </div>

        {/* Right Column: Premium Application Screenshot */}
        <div style={styles.heroVisualCol}>
          <div style={styles.consoleCard}>
            <div style={styles.consoleHeader}>
              <div style={styles.windowDots}>
                <span style={{ ...styles.winDot, backgroundColor: '#EF4444' }}></span>
                <span style={{ ...styles.winDot, backgroundColor: '#F59E0B' }}></span>
                <span style={{ ...styles.winDot, backgroundColor: '#00C853' }}></span>
              </div>
              <span style={styles.consoleTitle}>Aperçu : Espace Client & Tableau de Bord</span>
            </div>

            <div style={styles.appPreviewContainer}>
              <img 
                src="/app_preview.png" 
                alt="Aperçu du logiciel de gestion commerciale Onyx Gest" 
                style={styles.appPreviewImage} 
                onError={(e) => {
                  // Fallback if image doesn't exist yet
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'flex';
                }}
              />
              <div style={styles.fallbackVisual}>
                <div style={styles.simulatedChart}>
                  <div style={{ ...styles.simBar, height: '40%' }}></div>
                  <div style={{ ...styles.simBar, height: '65%', backgroundColor: '#00C853' }}></div>
                  <div style={{ ...styles.simBar, height: '90%' }}></div>
                  <div style={{ ...styles.simBar, height: '50%' }}></div>
                </div>
                <div style={styles.simText}>Console de Facturation Active</div>
              </div>
              <div style={styles.previewBadgeOverlay}>
                <span style={styles.previewPulse}></span>
                Interface Active
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 1. FEATURES SECTION */}
      <section id="features" style={styles.section}>
        <div style={styles.sectionHeader}>
          <h2 style={styles.sectionTitle}>Une suite d'outils complète pour votre business</h2>
          <p style={styles.sectionSubtitle}>Optimisez votre comptabilité et accélérez votre croissance grâce à des modules natifs puissants.</p>
        </div>

        <div style={styles.grid}>
          <div style={styles.card}>
            <div style={{ ...styles.cardIcon, color: '#00B0FF' }}>📄</div>
            <h3 style={styles.cardTitle}>Factures & Devis</h3>
            <p style={styles.cardDescription}>Émettez des documents professionnels respectant les taux de TVA locaux et exportez-les au format PDF haute fidélité.</p>
          </div>

          <div style={styles.card}>
            <div style={{ ...styles.cardIcon, color: '#00C853' }}>👥</div>
            <h3 style={styles.cardTitle}>Gestion Clientèle</h3>
            <p style={styles.cardDescription}>Suivez vos clients, visualisez l'historique de leurs règlements et pilotez vos relances depuis une interface unifiée.</p>
          </div>

          <div style={styles.card}>
            <div style={{ ...styles.cardIcon, color: '#D4AF37' }}>✨</div>
            <h3 style={styles.cardTitle}>Assistant IA Gemini</h3>
            <p style={styles.cardDescription}>Générez des rapports financiers automatisés et préparez vos emails de relance grâce à notre intelligence artificielle intégrée.</p>
          </div>

          <div style={styles.card}>
            <div style={{ ...styles.cardIcon, color: '#EF4444' }}>📈</div>
            <h3 style={styles.cardTitle}>Statistiques en Direct</h3>
            <p style={styles.cardDescription}>Visualisez vos indicateurs clés (chiffre d'affaires, créances, factures impayées) en temps réel avec des graphiques clairs.</p>
          </div>
        </div>
      </section>

      {/* 2. SECURITY SECTION */}
      <section id="security" style={styles.securitySection}>
        <div style={styles.glowBlueCenter}></div>
        <div style={styles.securityCard}>
          <div style={styles.securityBadge}>CLOISONNEMENT STRICT</div>
          <h2 style={styles.securityTitle}>Vos données sont isolées et souveraines</h2>
          <p style={styles.securityText}>
            Onyx Gest utilise la technologie **Row Level Security (RLS)** intégrée à PostgreSQL. Cela garantit un cloisonnement hermétique : les factures et clients de votre entreprise sont inaccessibles aux autres utilisateurs de la plateforme, offrant une confidentialité de niveau bancaire.
          </p>
          <div style={styles.securityFeatures}>
            <div style={styles.securityItem}>🛡️ Isolation par tenant unique (Tenant ID)</div>
            <div style={styles.securityItem}>🔑 Journalisation complète des actions d'audit</div>
            <div style={styles.securityItem}>🌐 Hébergement cloud souverain et conforme</div>
          </div>
        </div>
      </section>

      {/* 3. PRICING SECTION */}
      <section id="pricing" style={styles.section}>
        <div style={styles.sectionHeader}>
          <h2 style={styles.sectionTitle}>Une tarification transparente et adaptée</h2>
          <p style={styles.sectionSubtitle}>Choisissez le plan qui convient à la taille de votre entreprise.</p>
        </div>

        <div style={styles.grid}>
          {/* Plan 1 */}
          <div style={styles.pricingCard}>
            <h3 style={styles.priceName}>Standard Comptable</h3>
            <div style={styles.priceContainer}>
              <span style={styles.price}>15 000 FCFA</span>
              <span style={styles.pricePeriod}>/ mois</span>
            </div>
            <p style={styles.priceDesc}>Idéal pour les auto-entrepreneurs et prestataires de services indépendants.</p>
            <ul style={styles.priceFeatures}>
              <li>✓ Factures et Devis illimités</li>
              <li>✓ Export PDF</li>
              <li>✓ 1 utilisateur</li>
              <li>✓ Support e-mail standard</li>
            </ul>
            <button onClick={onStartOnboarding} style={styles.btnPriceSelect}>Démarrer l'essai</button>
          </div>

          {/* Plan 2 - Pop */}
          <div style={{ ...styles.pricingCard, border: '1px solid #00B0FF', transform: 'scale(1.03)', boxShadow: '0 10px 30px rgba(0, 176, 255, 0.15)' }}>
            <div style={styles.popularBadge}>LE PLUS POPULAIRE</div>
            <h3 style={styles.priceName}>Entreprise Pro</h3>
            <div style={styles.priceContainer}>
              <span style={styles.price}>35 000 FCFA</span>
              <span style={styles.pricePeriod}>/ mois</span>
            </div>
            <p style={styles.priceDesc}>Parfait pour les PME en pleine croissance ayant besoin de flexibilité.</p>
            <ul style={styles.priceFeatures}>
              <li>✓ Factures et Devis illimités</li>
              <li>✓ Assistant IA Gemini inclus</li>
              <li>✓ Relances automatiques</li>
              <li>✓ Jusqu'à 5 utilisateurs</li>
              <li>✓ Support technique prioritaire</li>
            </ul>
            <button onClick={onStartOnboarding} style={{ ...styles.btnPriceSelect, backgroundColor: '#00B0FF', color: '#000000' }}>Démarrer l'essai</button>
          </div>

          {/* Plan 3 */}
          <div style={styles.pricingCard}>
            <h3 style={styles.priceName}>Solution Sur-Mesure</h3>
            <div style={styles.priceContainer}>
              <span style={styles.price}>Sur devis</span>
            </div>
            <p style={styles.priceDesc}>Pour les grands comptes et réseaux de distribution complexes.</p>
            <ul style={styles.priceFeatures}>
              <li>✓ Nombre d'utilisateurs illimité</li>
              <li>✓ Intégration API personnalisée</li>
              <li>✓ Hébergement dédié possible</li>
              <li>✓ Conseiller technique dédié</li>
            </ul>
            <button onClick={onStartOnboarding} style={styles.btnPriceSelect}>Contacter le support</button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={styles.footer}>
        <div>Propulsé par <strong>241 Code Factory</strong>. L'excellence au service du développement digital.</div>
        <div style={{ fontSize: '0.78rem', color: '#6B7280', marginTop: '6px' }}>
          Tous droits réservés © 2026. Sécurité RLS et isolation multi-tenant certifiée.
        </div>
      </footer>
    </div>
  );
};

const styles = {
  landingContainer: {
    display: 'flex',
    flexDirection: 'column',
    minHeight: '100vh',
    width: '100vw',
    backgroundColor: '#050505',
    background: 'radial-gradient(ellipse at center, #0B0F19 0%, #030508 100%)',
    color: '#E0E0E0',
    fontFamily: "'Outfit', 'Inter', system-ui, -apple-system, sans-serif",
    position: 'relative',
    overflowX: 'hidden'
  },
  glowGreen: {
    position: 'absolute',
    width: '350px',
    height: '350px',
    borderRadius: '50%',
    backgroundColor: 'rgba(0, 200, 83, 0.03)',
    filter: 'blur(100px)',
    top: '15%',
    left: '5%',
    pointerEvents: 'none',
    zIndex: 1
  },
  glowBlue: {
    position: 'absolute',
    width: '400px',
    height: '400px',
    borderRadius: '50%',
    backgroundColor: 'rgba(0, 176, 255, 0.03)',
    filter: 'blur(120px)',
    bottom: '40%',
    right: '5%',
    pointerEvents: 'none',
    zIndex: 1
  },
  glowBlueCenter: {
    position: 'absolute',
    width: '600px',
    height: '300px',
    borderRadius: '50%',
    backgroundColor: 'rgba(0, 176, 255, 0.02)',
    filter: 'blur(140px)',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    pointerEvents: 'none',
    zIndex: 1
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 80px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
    backdropFilter: 'blur(20px)',
    position: 'sticky',
    top: 0,
    zIndex: 100,
    backgroundColor: 'rgba(5, 5, 5, 0.75)'
  },
  brand: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  logoCircle: {
    width: '36px',
    height: '36px',
    borderRadius: '8px',
    backgroundColor: '#00B0FF',
    color: '#0A0A0A',
    fontWeight: '800',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1.2rem',
    boxShadow: '0 0 15px rgba(0, 176, 255, 0.3)'
  },
  brandText: {
    fontSize: '1.25rem',
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: '-0.5px'
  },
  navLinks: {
    display: 'flex',
    alignItems: 'center',
    gap: '32px'
  },
  navLink: {
    fontSize: '0.9rem',
    color: '#9CA3AF',
    cursor: 'pointer',
    transition: 'color 0.2s',
    fontWeight: '500'
  },
  btnNavDemo: {
    backgroundColor: 'transparent',
    color: '#FFFFFF',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: '6px',
    padding: '8px 18px',
    fontSize: '0.85rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  heroSection: {
    display: 'grid',
    gridTemplateColumns: '1.1fr 0.9fr',
    alignItems: 'center',
    padding: '80px 80px 100px 80px',
    gap: '64px',
    maxWidth: '1200px',
    margin: '0 auto',
    zIndex: 5,
    minHeight: '80vh'
  },
  heroTextCol: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px'
  },
  tagline: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    backgroundColor: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.05)',
    padding: '6px 12px',
    borderRadius: '20px',
    fontSize: '0.72rem',
    color: '#9CA3AF',
    fontWeight: '700',
    letterSpacing: '0.08em',
    alignSelf: 'flex-start'
  },
  tagDot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    backgroundColor: '#00C853'
  },
  heroTitle: {
    fontSize: '3.5rem',
    lineHeight: '1.1',
    color: '#FFFFFF',
    fontWeight: '800',
    margin: 0,
    letterSpacing: '-1.5px'
  },
  highlightText: {
    background: 'linear-gradient(90deg, #00B0FF 0%, #00C853 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent'
  },
  heroSubtitle: {
    fontSize: '1.05rem',
    color: '#9CA3AF',
    lineHeight: '1.65',
    margin: 0
  },
  ctaRow: {
    display: 'flex',
    gap: '16px',
    marginTop: '8px'
  },
  btnSignUp: {
    backgroundColor: '#00C853',
    color: '#0A0A0A',
    border: 'none',
    borderRadius: '8px',
    padding: '14px 28px',
    fontSize: '0.98rem',
    fontWeight: '700',
    cursor: 'pointer',
    boxShadow: '0 8px 24px rgba(0, 200, 83, 0.2)',
    transition: 'transform 0.15s, box-shadow 0.15s'
  },
  btnDemo: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    color: '#FFFFFF',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '8px',
    padding: '14px 28px',
    fontSize: '0.98rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background-color 0.2s'
  },
  heroVisualCol: {
    display: 'flex',
    justifyContent: 'center'
  },
  consoleCard: {
    width: '100%',
    maxWidth: '460px',
    backgroundColor: 'rgba(15, 18, 25, 0.6)',
    border: '1px solid rgba(255,255,255,0.05)',
    borderRadius: '12px',
    overflow: 'hidden',
    boxShadow: '0 25px 60px rgba(0,0,0,0.6)',
    backdropFilter: 'blur(20px)'
  },
  consoleHeader: {
    display: 'flex',
    alignItems: 'center',
    padding: '12px 16px',
    backgroundColor: '#080A0F',
    borderBottom: '1px solid rgba(255,255,255,0.04)'
  },
  windowDots: {
    display: 'flex',
    gap: '6px'
  },
  winDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%'
  },
  consoleTitle: {
    marginLeft: '16px',
    fontSize: '0.72rem',
    color: '#4B5563',
    fontFamily: 'monospace'
  },
  appPreviewContainer: {
    width: '100%',
    height: '280px',
    backgroundColor: '#0A0A0A',
    position: 'relative',
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  appPreviewImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    objectPosition: 'top left',
    opacity: 0.85
  },
  fallbackVisual: {
    display: 'none',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '24px',
    width: '100%',
    height: '100%',
    background: 'linear-gradient(135deg, #0A0F1D 0%, #03050A 100%)'
  },
  simulatedChart: {
    display: 'flex',
    alignItems: 'flex-end',
    gap: '14px',
    height: '120px',
    width: '200px'
  },
  simBar: {
    flex: 1,
    backgroundColor: '#00B0FF',
    borderRadius: '4px 4px 0 0',
    opacity: 0.85
  },
  simText: {
    fontSize: '0.85rem',
    color: '#9CA3AF',
    fontWeight: '500'
  },
  previewBadgeOverlay: {
    position: 'absolute',
    bottom: '12px',
    right: '12px',
    backgroundColor: 'rgba(0, 200, 83, 0.85)',
    color: '#0A0A0A',
    padding: '4px 10px',
    borderRadius: '4px',
    fontSize: '0.72rem',
    fontWeight: '700',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    boxShadow: '0 4px 12px rgba(0, 200, 83, 0.3)'
  },
  previewPulse: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    backgroundColor: '#0A0A0A',
    display: 'inline-block',
    animation: 'pulse 1.5s infinite'
  },
  section: {
    padding: '100px 80px',
    maxWidth: '1200px',
    margin: '0 auto',
    width: '100%',
    boxSizing: 'border-box'
  },
  sectionHeader: {
    textAlign: 'center',
    marginBottom: '60px'
  },
  sectionTitle: {
    fontSize: '2.25rem',
    color: '#FFFFFF',
    fontWeight: '800',
    margin: 0,
    letterSpacing: '-0.5px'
  },
  sectionSubtitle: {
    fontSize: '1rem',
    color: '#9CA3AF',
    marginTop: '12px',
    maxWidth: '600px',
    marginLeft: 'auto',
    marginRight: 'auto'
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '30px',
    width: '100%'
  },
  card: {
    padding: '30px',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    border: '1px solid rgba(255,255,255,0.04)',
    borderRadius: '12px',
    transition: 'transform 0.2s, background-color 0.2s',
    cursor: 'default'
  },
  cardIcon: {
    fontSize: '2rem',
    marginBottom: '16px'
  },
  cardTitle: {
    color: '#FFFFFF',
    fontSize: '1.25rem',
    fontWeight: '700',
    margin: '0 0 10px 0'
  },
  cardDescription: {
    color: '#9CA3AF',
    fontSize: '0.9rem',
    margin: 0,
    lineHeight: '1.6'
  },
  securitySection: {
    padding: '100px 80px',
    width: '100%',
    boxSizing: 'border-box',
    position: 'relative',
    display: 'flex',
    justifyContent: 'center'
  },
  securityCard: {
    maxWidth: '900px',
    width: '100%',
    padding: '50px',
    backgroundColor: 'rgba(10, 15, 25, 0.6)',
    border: '1px solid rgba(0, 176, 255, 0.1)',
    borderRadius: '16px',
    boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
    backdropFilter: 'blur(20px)',
    textAlign: 'center',
    zIndex: 2
  },
  securityBadge: {
    display: 'inline-block',
    backgroundColor: 'rgba(0, 176, 255, 0.1)',
    color: '#00B0FF',
    padding: '6px 14px',
    borderRadius: '20px',
    fontSize: '0.72rem',
    fontWeight: '700',
    letterSpacing: '0.06em',
    marginBottom: '20px'
  },
  securityTitle: {
    fontSize: '2.25rem',
    color: '#FFFFFF',
    fontWeight: '800',
    margin: '0 0 16px 0',
    letterSpacing: '-0.5px'
  },
  securityText: {
    fontSize: '1.05rem',
    color: '#9CA3AF',
    lineHeight: '1.7',
    maxWidth: '700px',
    margin: '0 auto 30px auto'
  },
  securityFeatures: {
    display: 'flex',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: '24px'
  },
  securityItem: {
    fontSize: '0.9rem',
    color: '#E0E0E0',
    fontWeight: '600'
  },
  pricingCard: {
    padding: '40px 30px',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    border: '1px solid rgba(255,255,255,0.04)',
    borderRadius: '12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    position: 'relative',
    transition: 'transform 0.2s'
  },
  popularBadge: {
    position: 'absolute',
    top: '-12px',
    left: '50%',
    transform: 'translateX(-50%)',
    backgroundColor: '#00B0FF',
    color: '#0A0A0A',
    padding: '4px 12px',
    borderRadius: '20px',
    fontSize: '0.7rem',
    fontWeight: '700',
    letterSpacing: '0.05em'
  },
  priceName: {
    color: '#FFFFFF',
    fontSize: '1.35rem',
    fontWeight: '700',
    margin: 0
  },
  priceContainer: {
    display: 'flex',
    alignItems: 'baseline',
    gap: '6px'
  },
  price: {
    fontSize: '2.25rem',
    color: '#FFFFFF',
    fontWeight: '800',
    letterSpacing: '-1px'
  },
  pricePeriod: {
    color: '#9CA3AF',
    fontSize: '0.9rem'
  },
  priceDesc: {
    color: '#9CA3AF',
    fontSize: '0.85rem',
    margin: 0,
    lineHeight: '1.5'
  },
  priceFeatures: {
    listStyle: 'none',
    padding: 0,
    margin: '10px 0',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    textAlign: 'left'
  },
  btnPriceSelect: {
    width: '100%',
    padding: '12px',
    fontWeight: '700',
    fontSize: '0.9rem',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    color: '#FFFFFF',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '8px',
    cursor: 'pointer',
    marginTop: 'auto',
    transition: 'all 0.2s'
  },
  footer: {
    textAlign: 'center',
    padding: '40px',
    borderTop: '1px solid rgba(255, 255, 255, 0.05)',
    fontSize: '0.85rem',
    color: '#4B5563'
  }
};
