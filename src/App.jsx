import React, { useState, useEffect } from 'react';
import { TenantProvider, useTenant } from './context/TenantContext';
import { translations } from './utils/translations';
import { supabase } from './utils/supabaseClient';
import { Dashboard } from './components/Dashboard';
import { DashboardDirigeant } from './components/DashboardDirigeant';
import { SaisieRapideEcritures } from './components/SaisieRapideEcritures';
import { Facturation } from './components/Facturation';
import { Relances } from './components/Relances';
import { SecurityPanel } from './components/SecurityPanel';
import { ChatGemini } from './components/ChatGemini';
import { Onboarding } from './components/Onboarding';
import { ClientManagement } from './components/ClientManagement';
import { AdminConsole } from './components/AdminConsole';
import { SubscriptionGuard } from './components/SubscriptionGuard';
import { Settings } from './components/Settings';
import { LandingPage } from './components/LandingPage';
import { LoginClient } from './components/LoginClient';
import { LoginAdmin } from './components/LoginAdmin';

// Auto-confirm dialogs when running in subagent automation (webdriver)
if (typeof window !== 'undefined' && window.navigator.webdriver) {
  window.confirm = () => true;
}

function MainAppContent() {
  const { 
    activeTenant, 
    tenants, 
    changeTenant, 
    currentUser, 
    demoUsers, 
    switchDemoUser,
    adminMode,
    setAdminMode,
    onboardingStep,
    startOnboardingSim,
    isLoadingAuth,
    logout,
    language
  } = useTenant();

  const t = (key, params = {}) => {
    let text = translations[language]?.[key] || translations['fr']?.[key] || key;
    Object.keys(params).forEach(k => {
      text = text.replace(`{${k}}`, params[k]);
    });
    return text;
  };

  const [currentTab, setCurrentTab] = useState('dashboard');
  const [chatOpen, setChatOpen] = useState(false);
  const [currentPath, setCurrentPath] = useState(window.location.pathname);
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateTo = (path) => {
    window.history.pushState({}, '', path);
    setCurrentPath(path);
  };

  const handleLogout = async () => {
    await logout();
    navigateTo('/');
  };

  // Protection automatique et redirection des routes (Routage dynamique)
  useEffect(() => {
    if (currentUser) {
      if (currentPath === '/' || currentPath === '/login-client' || currentPath === '/admin-login') {
        navigateTo('/dashboard');
      }
    } else {
      if (currentPath === '/dashboard') {
        navigateTo('/');
      }
    }
  }, [currentUser, currentPath]);



  // Interactive Onboarding Tour step (0, 1, 2, or 3 for completed)
  const [tourStep, setTourStep] = useState(() => {
    return localStorage.getItem('onyx_tour_completed') === 'true' ? 3 : 0;
  });

  const [adminModalOpen, setAdminModalOpen] = useState(false);
  const [adminEmailInput, setAdminEmailInput] = useState('');
  const [adminPasswordInput, setAdminPasswordInput] = useState('');

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        setAdminModalOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const APP_VERSION = '1.1.0';
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [newVersionInfo, setNewVersionInfo] = useState(null);

  useEffect(() => {
    const checkUpdates = async () => {
      try {
        const response = await fetch(`/version.json?t=${Date.now()}`);
        if (response.ok) {
          const data = await response.json();
          if (data.version && data.version !== APP_VERSION) {
            setUpdateAvailable(true);
            setNewVersionInfo(data);
          }
        }
      } catch (err) {
        console.warn("⚠️ Impossible de vérifier les mises à jour :", err);
      }
    };

    // Vérifie au chargement
    checkUpdates();

    // Vérifie toutes les 30 secondes en arrière-plan
    const interval = setInterval(checkUpdates, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleApplyUpdate = () => {
    // Désenregistre les Service Workers pour forcer le nettoyage du cache
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(registrations => {
        for (let registration of registrations) {
          registration.unregister();
        }
      });
    }
    // Recharge la page en forçant le téléchargement des nouveaux fichiers
    window.location.reload();
  };

  const renderUpdateBanner = () => {
    if (!updateAvailable) return null;
    return (
      <div style={{
        backgroundColor: '#F59E0B',
        color: '#0A0A0A',
        padding: '10px 20px',
        textAlign: 'center',
        fontSize: '0.85rem',
        fontWeight: 'bold',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '16px',
        position: 'sticky',
        top: 0,
        zIndex: 99999,
        boxShadow: '0 4px 15px rgba(245, 158, 11, 0.3)',
      }} className="no-print">
        <span>✨ Une nouvelle version d'Onyx Gest est disponible ({newVersionInfo?.version}) : {newVersionInfo?.changelog || "Améliorations générales"}</span>
        <button 
          onClick={handleApplyUpdate}
          style={{
            backgroundColor: '#0A0A0A',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: '4px',
            padding: '5px 12px',
            fontSize: '0.75rem',
            fontWeight: 'bold',
            cursor: 'pointer',
            boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
            transition: 'opacity 0.2s'
          }}
          onMouseOver={e => e.currentTarget.style.opacity = 0.8}
          onMouseOut={e => e.currentTarget.style.opacity = 1}
        >
          Appliquer la mise à jour
        </button>
      </div>
    );
  };

  const handleAdminSubmit = (e) => {
    e.preventDefault();
    const adminEmail = import.meta.env?.VITE_ADMIN_EMAIL;
    if (!adminEmail && import.meta.env.PROD) {
      alert("⚠️ Erreur de sécurité : L'email d'administration (VITE_ADMIN_EMAIL) n'est pas configuré en production.");
      return;
    }
    const targetEmail = adminEmail || 'admin@241codefactory.ga';
    if (adminEmailInput.trim() === targetEmail) {
      switchDemoUser('user_admin_3');
      setAdminMode(true);
      setCurrentTab('dashboard');
      navigateTo('/dashboard');
      setAdminModalOpen(false);
      setAdminEmailInput('');
      setAdminPasswordInput('');
      alert(`🔐 Connexion réussie via raccourci de supervision (Easter Egg). Mode Administrateur activé.`);
    } else {
      alert(`❌ Adresse e-mail d'administration non autorisée.`);
    }
  };

  // Remplacement par le composant modulaire LoginClient.jsx

  const handleNextTourStep = () => {
    if (tourStep >= 2) {
      localStorage.setItem('onyx_tour_completed', 'true');
      setTourStep(3);
    } else {
      setTourStep(tourStep + 1);
    }
  };

  const isAdminUser = currentUser?.role === 'factory_admin';
  const isDirigeant = currentUser?.role === 'client_manager';
  const isComptableUser = currentUser?.role === 'comptable' || isDirigeant || isAdminUser;

  const handleStartOnboarding = () => {
    startOnboardingSim();
  };

  const handleEnterDemo = () => {
    switchDemoUser('user_mba_1');
    navigateTo('/dashboard');
  };

  const handleLoginClick = () => {
    navigateTo('/login-client');
  };

  const renderSecretAdminModal = () => (
    <div style={styles.secretOverlay}>
      <div style={styles.secretCard}>
        <h3 style={styles.secretTitle}>🔑 Supervision 241 Code Factory</h3>
        <p style={styles.secretSubtitle}>Raccourci de maintenance et d'administration de la plateforme.</p>
        <form onSubmit={handleAdminSubmit} style={styles.secretForm}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={styles.secretLabel}>Adresse e-mail SuperAdmin</label>
            <input 
              type="email" 
              required
              placeholder="admin@241codefactory.ga" 
              value={adminEmailInput}
              onChange={(e) => setAdminEmailInput(e.target.value)}
              style={styles.secretInput}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={styles.secretLabel}>Code d'accès sécurisé</label>
            <input 
              type="password" 
              required
              placeholder="••••••••" 
              value={adminPasswordInput}
              onChange={(e) => setAdminPasswordInput(e.target.value)}
              style={styles.secretInput}
            />
          </div>
          <div style={styles.secretActions}>
            <button type="submit" style={styles.btnSecretSubmit}>Se connecter</button>
            <button type="button" onClick={() => setAdminModalOpen(false)} style={styles.btnSecretCancel}>Annuler</button>
          </div>
        </form>
      </div>
    </div>
  );

  const renderInteractiveTour = () => (
    <div style={styles.tourOverlay}>
      <div style={styles.tourCard}>
        <div style={styles.tourStepIndicator}>Étape {tourStep + 1} sur 3</div>
        {tourStep === 0 && (
          <>
            <h3 style={styles.tourTitle}>📊 Bienvenue sur Onyx Gest !</h3>
            <p style={styles.tourBody}>
              Votre nouvelle console de gestion commerciale haut de gamme pour les devis, les factures et le recouvrement.
            </p>
          </>
        )}
        {tourStep === 1 && (
          <>
            <h3 style={styles.tourTitle}>⚖️ Conformité Fiscale Gabon</h3>
            <p style={styles.tourBody}>
              Renseignez vos identifiants fiscaux (NIF, RCCM) et le taux de TVA de votre secteur d'activité dans l'onglet <strong>Paramètres</strong> pour émettre des factures légales.
            </p>
          </>
        )}
        {tourStep === 2 && (
          <>
            <h3 style={styles.tourTitle}>🛡️ Isolation RLS & Traçabilité</h3>
            <p style={styles.tourBody}>
              Chaque document et client est sécurisé en base de données par votre <code>tenant_id</code> unique. Toutes les actions sensibles sont consignées dans le journal d'audit.
            </p>
          </>
        )}
        <button onClick={handleNextTourStep} style={styles.btnTourNext}>
          {tourStep === 2 ? 'Terminer et démarrer' : 'Suivant'}
        </button>
      </div>
    </div>
  );

  if (isLoadingAuth) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        backgroundColor: '#0A0A0A',
        color: '#D4AF37',
        fontSize: '1.2rem',
        fontWeight: '600'
      }}>
        Chargement de la session Onyx Gest...
      </div>
    );
  }

  if (onboardingStep !== null) {
    return (
      <>
        {renderUpdateBanner()}
        <Onboarding />
      </>
    );
  }

  // 1. Routage des utilisateurs non connectés
  if (!currentUser) {
    if (currentPath === '/login-client') {
      return (
        <>
          {renderUpdateBanner()}
          <LoginClient 
            onBack={() => navigateTo('/')} 
            onGoToSignUp={handleStartOnboarding}
          />
        </>
      );
    }

    if (currentPath === '/admin-login') {
      return (
        <>
          {renderUpdateBanner()}
          <LoginAdmin 
            onBack={() => navigateTo('/')} 
          />
        </>
      );
    }

    // Par défaut : Page d'accueil / Landing Page (correspond au chemin '/' et autres)
    return (
      <>
        {renderUpdateBanner()}
        <LandingPage 
          onStartOnboarding={handleStartOnboarding} 
          onEnterDemo={handleEnterDemo} 
          onLogin={() => navigateTo('/login-client')}
        />
        {adminModalOpen && renderSecretAdminModal()}
      </>
    );
  }

  const renderContent = () => {
    // Redirection and mapping based on user role to enforce ethical data separation
    if (currentTab === 'dashboard') {
      if (isAdminUser) return <AdminConsole />;
      if (isDirigeant) return <DashboardDirigeant onNavigateToRelances={() => setCurrentTab('relances')} onOpenComptabilite={() => setCurrentTab('comptabilite')} />;
      return <Dashboard onOpenComptabilite={isComptableUser ? () => setCurrentTab('comptabilite') : null} />;
    }

    switch (currentTab) {
      case 'facturation':
        return <Facturation />;
      case 'clients':
        return <ClientManagement />;
      case 'relances':
        return <Relances />;
      case 'comptabilite':
        // Route guard : réservé au rôle comptable et à l'administrateur plateforme
        if (!isComptableUser) {
          return (
            <div style={styles.accessDenied}>
              <div style={styles.accessDeniedIcon}>🔒</div>
              <h2 style={styles.accessDeniedTitle}>Accès Refusé</h2>
              <p style={styles.accessDeniedMsg}>
                Ce panneau est réservé aux comptables et aux administrateurs techniques.
              </p>
              <p style={{ fontSize: '0.8rem', color: '#9CA3AF', marginTop: '8px' }}>
                Code : <code>RBAC_403 — Insufficient permissions for role: {currentUser?.role}</code>
              </p>
            </div>
          );
        }
        return <SaisieRapideEcritures />;
      case 'securite':
        // Route guard : seul l'Admin 241 Code Factory peut accéder à ce panneau
        if (!isAdminUser) {
          return (
            <div style={styles.accessDenied}>
              <div style={styles.accessDeniedIcon}>🔒</div>
              <h2 style={styles.accessDeniedTitle}>Accès Refusé</h2>
              <p style={styles.accessDeniedMsg}>
                Ce panneau est réservé aux administrateurs techniques de <strong>241 Code Factory</strong>.
              </p>
              <p style={{ fontSize: '0.8rem', color: '#9CA3AF', marginTop: '8px' }}>
                Code : <code>RBAC_403 — Insufficient permissions for role: client_manager</code>
              </p>
            </div>
          );
        }
        return <SecurityPanel />;
      case 'parametres':
        return <Settings />;
      case 'legal':
        return (
          <div style={styles.legalContainer}>
            <h1 style={{ ...styles.title, color: '#D4AF37' }}>Mentions Légales & CGU</h1>
            <p style={styles.subtitle}>Conditions Générales d'Utilisation de la plateforme Onyx Gest par 241 Code Factory.</p>
            
            <div className="onyx-card" style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '16px', lineHeight: '1.6' }}>
              <h3 style={{ color: '#FFFFFF', margin: 0 }}>1. Éditeur de la Plateforme</h3>
              <p style={{ color: '#9CA3AF', margin: 0, fontSize: '0.9rem' }}>
                Onyx Gest est développé et édité par <strong>241 Code Factory</strong>, entreprise de services numériques de droit gabonais, Libreville.
              </p>
              
              <h3 style={{ color: '#FFFFFF', margin: 0 }}>2. Propriété Intellectuelle</h3>
              <p style={{ color: '#9CA3AF', margin: 0, fontSize: '0.9rem' }}>
                L'intégralité du code source, du design d'interface, et des chartes graphiques d'Onyx Gest sont la propriété exclusive de 241 Code Factory. Toute reproduction ou distribution non autorisée est passible de poursuites pénales.
              </p>

              <h3 style={{ color: '#FFFFFF', margin: 0 }}>3. Protection des Données (RGPD & Isolation RLS)</h3>
              <p style={{ color: '#9CA3AF', margin: 0, fontSize: '0.9rem' }}>
                Vos données de factures et de clients sont cloisonnées à l'aide de politiques d'isolation de niveau ligne (Row Level Security - RLS) au sein de nos serveurs sécurisés. Aucune donnée n'est accessible ni revendue à des tiers.
              </p>

              <h3 style={{ color: '#FFFFFF', margin: 0 }}>4. Support Technique</h3>
              <p style={{ color: '#9CA3AF', margin: 0, fontSize: '0.9rem' }}>
                Pour toute assistance, vous pouvez soumettre un ticket via le widget de support intégré ou écrire à : <code>support@241codefactory.ga</code>.
              </p>
            </div>
          </div>
        );
      default:
        if (isAdminUser) return <AdminConsole />;
        if (isDirigeant) return <DashboardDirigeant onNavigateToRelances={() => setCurrentTab('relances')} onOpenComptabilite={() => setCurrentTab('comptabilite')} />;
        return <Dashboard onOpenComptabilite={isComptableUser ? () => setCurrentTab('comptabilite') : null} />;
    }
  };

  const handleToggleAdminMode = () => {
    if (isAdminUser) {
      const nextMode = !adminMode;
      setAdminMode(nextMode);
      alert(nextMode 
        ? "🔑 Mode Administrateur activé. Le sélecteur de Tenant est désormais visible." 
        : "🔒 Mode Administrateur désactivé. Le sélecteur de Tenant est masqué."
      );
    } else {
      alert("⚠️ Accès refusé : Seul le profil 'Support 241 Code Factory' peut activer le mode d'administration.");
    }
  };

  return (
    <>
      {renderUpdateBanner()}
      <div style={styles.appContainer}>
        {/* If user is in onboarding flow, block dashboard and show onboarding */}
        {onboardingStep !== null && <Onboarding />}

      {/* Sidebar Navigation */}
      <aside className="no-print" style={styles.sidebar}>
        <div style={styles.brandContainer}>
          <div style={{
            ...styles.brandLogo,
            boxShadow: adminMode ? '0 0 15px rgba(245, 158, 11, 0.5)' : '0 0 15px rgba(59, 130, 246, 0.4)',
            backgroundColor: adminMode ? 'var(--color-accent-yellow)' : 'var(--color-accent-blue)'
          }}>
            O
          </div>
          <div>
            <h2 style={styles.brandName}>Onyx Gest</h2>
            <span 
              onClick={handleToggleAdminMode} 
              style={{
                ...styles.brandVersion,
                cursor: isAdminUser ? 'pointer' : 'default',
                textDecoration: isAdminUser ? 'underline' : 'none'
              }}
              title={isAdminUser ? "Cliquer pour basculer le sélecteur de Tenant" : ""}
            >
              v{APP_VERSION} Native Pro {adminMode && <span style={styles.adminBadge}>ADMIN</span>}
            </span>
          </div>
        </div>

        {/* Tenant Selection Selector - ONLY visible in Admin Mode */}
        {adminMode && (
          <div style={styles.tenantSelectorBox}>
            <label className="onyx-label" style={{ fontSize: '0.75rem', marginBottom: '8px' }}>
              🛠️ Sélecteur de Tenant (Admin)
            </label>
            <select 
              className="onyx-select" 
              value={activeTenant.id} 
              onChange={(e) => changeTenant(e.target.value)}
              style={styles.tenantSelect}
            >
              {tenants.map(tenant => (
                <option key={tenant.id} value={tenant.id}>
                  {tenant.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Nav Items */}
        <nav style={styles.navMenu}>
          {/* Main Dashboard item changes dynamically to represent platform admin vs business */}
          <button 
            onClick={() => setCurrentTab('dashboard')} 
            style={{
              ...styles.navItem,
              ...(currentTab === 'dashboard' ? (isAdminUser ? styles.navItemAdminActive : styles.navItemActive) : {}),
              color: currentTab === 'dashboard' && isAdminUser ? '#D4AF37' : 'var(--color-text-secondary)'
            }}
          >
            <span style={styles.navIcon}>{isAdminUser ? '🖥️' : '📊'}</span>
            <span>{isAdminUser ? t('nav_admin') : t('nav_dashboard')}</span>
          </button>

          {/* Hide client commercial tools from SuperAdmin unless adminMode is active */}
          {(!isAdminUser || adminMode) && (
            <>
              <button 
                onClick={() => setCurrentTab('facturation')} 
                style={{
                  ...styles.navItem,
                  ...(currentTab === 'facturation' ? styles.navItemActive : {})
                }}
              >
                <span style={styles.navIcon}>📄</span>
                <span>{t('nav_invoices')}</span>
              </button>

              <button 
                onClick={() => setCurrentTab('clients')} 
                style={{
                  ...styles.navItem,
                  ...(currentTab === 'clients' ? styles.navItemActive : {})
                }}
              >
                <span style={styles.navIcon}>👥</span>
                <span>{t('nav_clients')}</span>
              </button>

              <button 
                onClick={() => setCurrentTab('relances')} 
                style={{
                  ...styles.navItem,
                  ...(currentTab === 'relances' ? styles.navItemActive : {})
                }}
              >
                <span style={styles.navIcon}>🔔</span>
                <span>{t('nav_reminders')}</span>
              </button>
            </>
          )}

          {/* Comptabilité — réservée au rôle comptable et à l'administrateur plateforme */}
          {isComptableUser && (
            <button
              onClick={() => setCurrentTab('comptabilite')}
              style={{
                ...styles.navItem,
                ...(currentTab === 'comptabilite' ? styles.navItemActive : {})
              }}
            >
              <span style={styles.navIcon}>🧮</span>
              <span>Comptabilité</span>
            </button>
          )}

          {/* Route guard: Sécurité & RLS SQL — ADMIN ONLY, never rendered for client_manager role */}
          {isAdminUser && (
            <button 
              onClick={() => setCurrentTab('securite')} 
              style={{
                ...styles.navItem,
                ...(currentTab === 'securite' ? styles.navItemActive : {})
              }}
            >
              <span style={styles.navIcon}>🔒</span>
              <span>Sécurité & RLS SQL</span>
            </button>
          )}

          {/* Settings — visible for all authenticated users */}
          <button 
            onClick={() => setCurrentTab('parametres')} 
            style={{
              ...styles.navItem,
              ...(currentTab === 'parametres' ? styles.navItemActive : {})
            }}
          >
            <span style={styles.navIcon}>⚙️</span>
            <span>{t('nav_settings')}</span>
          </button>

          {/* Legal CGU Tab */}
          <button 
            onClick={() => setCurrentTab('legal')} 
            style={{
              ...styles.navItem,
              ...(currentTab === 'legal' ? styles.navItemActive : {})
            }}
          >
            <span style={styles.navIcon}>⚖️</span>
            <span>{language === 'en' ? 'Legal Mentions & TOS' : 'Mentions Légales & CGU'}</span>
          </button>

          {/* Landing / Logout Option */}
          <button 
            onClick={handleLogout} 
            style={{
              ...styles.navItem,
              borderTop: '1px solid rgba(255, 255, 255, 0.05)',
              marginTop: '8px',
              paddingTop: '12px'
            }}
          >
            <span style={styles.navIcon}>🚪</span>
            <span>{t('nav_logout')}</span>
          </button>
        </nav>

        {/* Route guard: Onboarding button — ADMIN ONLY, never rendered for client_manager role */}
        {isAdminUser && (
          <button 
            onClick={startOnboardingSim} 
            className="btn-secondary" 
            style={styles.btnOnboardingSim}
          >
            ✨ Onboarding Automatique
          </button>
        )}

        {/* Session Identity Block — Conditionally rendered by role (NO CSS hide) */}
        {isAdminUser ? (
          /* Admin only: technical switcher to simulate different tenants */
          <div style={styles.demoSessionBox}>
            <label className="onyx-label" style={{ fontSize: '0.7rem', color: '#10B981' }}>
              ⚡ Connecté en BDD via :
            </label>
            <select 
              className="onyx-select"
              value={currentUser.id}
              onChange={(e) => switchDemoUser(e.target.value)}
              style={styles.demoSelect}
            >
              {demoUsers.map(user => (
                <option key={user.id} value={user.id}>
                  {user.name} ({user.role === 'factory_admin' ? 'Admin' : user.role === 'comptable' ? 'Comptable' : 'Client'})
                </option>
              ))}
            </select>
            <div style={styles.userRoleInfo}>
              <span>Rôle : {currentUser.roleLabel}</span>
            </div>
          </div>
        ) : (
          /* Client: clean, native-looking company identity badge — no technical exposure */
          <div style={styles.clientIdentityBox}>
            <div style={styles.clientIdentityHeader}>
              <span style={styles.clientConnectedDot}></span>
              <span style={styles.clientConnectedLabel}>Connecté en tant que</span>
            </div>
            <div style={styles.clientCompanyName}>{activeTenant.name}</div>
            <div style={styles.clientUserRow}>
              <span style={styles.clientUserAvatar}>{currentUser.name.charAt(0)}</span>
              <span style={styles.clientUserName}>{currentUser.name}</span>
            </div>
          </div>
        )}

        {/* Support Client In-App Widget */}
        <div style={styles.supportWidget} className="no-print">
          <label style={styles.supportLabel}>💬 Support Client 241 CF</label>
          <input 
            type="text" 
            placeholder="Une difficulté ? Écrivez-nous..." 
            style={styles.supportInput}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && e.target.value.trim()) {
                alert(`Votre message a été envoyé à l'équipe technique de 241 Code Factory. Nous vous répondrons dans les plus brefs délais.`);
                e.target.value = '';
              }
            }}
          />
          <span style={styles.supportSubtext}>Appuyez sur Entrée pour envoyer</span>
        </div>

        {/* Footer info */}
        <div style={styles.sidebarFooter}>
          <div style={styles.factoryBadge}>
            <span style={styles.pulseDot}></span>
            241 Code Factory
          </div>
          <p style={styles.footerText}>L'excellence au service du développement digital.</p>
        </div>
      </aside>

      {/* Main Panel Viewport wrapped in Subscription Guard middleware */}
      <SubscriptionGuard>
        <main style={styles.mainViewport}>
          {isOffline && (
            <div style={styles.offlineBanner}>
              <span>📶 Mode Hors-Ligne (Stockage local actif via Tauri · Synchro Supabase suspendue)</span>
            </div>
          )}

          <div className="no-print" style={styles.viewHeaderBar}>
            <div 
              onClick={() => {
                const nextState = !isOffline;
                setIsOffline(nextState);
                alert(nextState 
                  ? "📶 Mode Hors Ligne activé via Tauri. Les factures créées seront stockées en local et synchronisées dès reconnexion."
                  : "🔌 Mode En Ligne activé. Synchronisation en temps réel avec Supabase établie !" 
                );
              }}
              style={{
                ...styles.tauriIndicator,
                color: isOffline ? '#F59E0B' : '#00C853',
                borderColor: isOffline ? 'rgba(245, 158, 11, 0.3)' : 'rgba(0, 200, 83, 0.3)',
                backgroundColor: isOffline ? 'rgba(245, 158, 11, 0.05)' : 'rgba(0, 200, 83, 0.05)'
              }}
              title="Cliquer pour basculer le mode de connexion (Tauri)"
            >
              <span style={{ ...styles.tauriDot, backgroundColor: isOffline ? '#F59E0B' : '#00C853' }}></span>
              <span>Tauri Client : {isOffline ? 'Hors-Ligne' : 'En Ligne (Synchro Supabase)'}</span>
            </div>
          </div>

          {renderContent()}
        </main>
      </SubscriptionGuard>

      {/* Secret Admin Login Modal (Easter Egg) */}
      {adminModalOpen && renderSecretAdminModal()}

      {/* Onboarding Interactive Tour */}
      {tourStep < 3 && currentPath === '/dashboard' && renderInteractiveTour()}

      {/* Floating Gemini Chat Trigger */}
      <button 
        onClick={() => setChatOpen(!chatOpen)}
        className="no-print"
        style={styles.floatingChatBtn}
        title="Ouvrir l'Assistant Gemini IA"
      >
        <span style={styles.chatPulse}></span>
        ✨ IA
      </button>

      {/* Gemini Chat Drawer */}
      <ChatGemini isOpen={chatOpen} onClose={() => setChatOpen(false)} />
      </div>
    </>
  );
}

function App() {
  return (
    <TenantProvider>
      <MainAppContent />
    </TenantProvider>
  );
}

const styles = {
  appContainer: {
    display: 'flex',
    width: '100%',
    minHeight: '100vh',
    position: 'relative',
    overflowX: 'hidden'
  },
  viewHeaderBar: {
    display: 'flex',
    justifyContent: 'flex-end',
    padding: '8px 16px',
    backgroundColor: '#051015',
    borderBottom: '1px solid rgba(255,255,255,0.03)'
  },
  tauriIndicator: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '4px 10px',
    borderRadius: '4px',
    fontSize: '0.75rem',
    fontWeight: '600',
    border: '1px solid',
    cursor: 'pointer',
    userSelect: 'none'
  },
  tauriDot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%'
  },
  offlineBanner: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderBottom: '1px solid rgba(245, 158, 11, 0.3)',
    color: '#F59E0B',
    padding: '8px 16px',
    fontSize: '0.82rem',
    fontWeight: '600',
    textAlign: 'center',
    animation: 'pulse 2s infinite'
  },
  secretOverlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.85)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20000,
    padding: '20px'
  },
  secretCard: {
    backgroundColor: '#0A0A0A',
    border: '1px solid #D4AF37',
    borderRadius: '12px',
    padding: '32px',
    maxWidth: '400px',
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    boxShadow: '0 8px 32px rgba(212, 175, 55, 0.15)'
  },
  secretTitle: {
    color: '#D4AF37',
    margin: 0,
    fontSize: '1.25rem',
    fontWeight: '700',
    textAlign: 'center'
  },
  secretSubtitle: {
    color: '#9CA3AF',
    fontSize: '0.85rem',
    margin: 0,
    textAlign: 'center',
    lineHeight: '1.4'
  },
  secretForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px'
  },
  secretLabel: {
    fontSize: '0.75rem',
    color: '#6B7280',
    fontWeight: '600'
  },
  secretInput: {
    width: '100%',
    backgroundColor: '#111',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '6px',
    padding: '10px',
    color: '#FFF',
    fontSize: '0.9rem',
    boxSizing: 'border-box'
  },
  secretActions: {
    display: 'flex',
    gap: '10px',
    marginTop: '10px'
  },
  btnSecretSubmit: {
    flex: 1.5,
    backgroundColor: '#D4AF37',
    color: '#0A0A0A',
    border: 'none',
    borderRadius: '6px',
    padding: '10px',
    fontWeight: '700',
    cursor: 'pointer'
  },
  btnSecretCancel: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    color: '#9CA3AF',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '6px',
    padding: '10px',
    cursor: 'pointer'
  },
  tourOverlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.8)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 15000,
    padding: '20px'
  },
  tourCard: {
    backgroundColor: '#111',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '12px',
    padding: '32px',
    maxWidth: '450px',
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    boxShadow: '0 10px 40px rgba(0,0,0,0.8)'
  },
  tourStepIndicator: {
    fontSize: '0.72rem',
    color: '#D4AF37',
    fontWeight: '700',
    letterSpacing: '0.05em'
  },
  tourTitle: {
    fontSize: '1.3rem',
    color: '#FFF',
    margin: 0
  },
  tourBody: {
    fontSize: '0.9rem',
    color: '#9CA3AF',
    lineHeight: '1.6',
    margin: 0
  },
  btnTourNext: {
    backgroundColor: '#00C853',
    color: '#0A0A0A',
    border: 'none',
    borderRadius: '6px',
    padding: '12px',
    fontWeight: '700',
    cursor: 'pointer',
    fontSize: '0.95rem',
    marginTop: '10px'
  },
  supportWidget: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    border: '1px solid rgba(255,255,255,0.05)',
    borderRadius: '8px',
    padding: '12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    marginTop: 'auto'
  },
  supportLabel: {
    fontSize: '0.72rem',
    fontWeight: '700',
    color: '#D4AF37'
  },
  supportInput: {
    width: '100%',
    backgroundColor: '#0A0A0A',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '4px',
    padding: '6px 8px',
    color: '#FFF',
    fontSize: '0.75rem',
    boxSizing: 'border-box'
  },
  supportSubtext: {
    fontSize: '0.62rem',
    color: '#6B7280',
    fontStyle: 'italic'
  },
  legalContainer: {
    padding: '30px',
    maxWidth: '800px',
    width: '100%'
  },
  // RBAC Guard: Access Denied page styles
  accessDenied: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '60vh',
    textAlign: 'center',
    gap: '16px'
  },
  accessDeniedIcon: {
    fontSize: '4rem',
    filter: 'drop-shadow(0 0 20px rgba(239, 68, 68, 0.4))'
  },
  accessDeniedTitle: {
    fontSize: '2rem',
    color: '#EF4444'
  },
  accessDeniedMsg: {
    fontSize: '1rem',
    color: '#9CA3AF',
    maxWidth: '400px',
    lineHeight: '1.6'
  },
  sidebar: {
    width: '280px',
    backgroundColor: 'rgba(10, 10, 10, 0.95)',
    borderRight: '1px solid rgba(59, 130, 246, 0.15)',
    display: 'flex',
    flexDirection: 'column',
    padding: '24px 20px',
    gap: '16px',
    flexShrink: 0
  },
  brandContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    paddingBottom: '12px',
    borderBottom: '1px solid rgba(255,255,255,0.05)'
  },
  brandLogo: {
    width: '36px',
    height: '36px',
    borderRadius: '6px',
    color: '#0A0A0A',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: '800',
    fontSize: '1.3rem',
    transition: 'all 0.3s ease'
  },
  brandName: {
    fontSize: '1.2rem',
    fontWeight: '700',
    color: '#FFFFFF',
    lineHeight: '1'
  },
  brandVersion: {
    fontSize: '0.75rem',
    color: 'var(--color-accent-blue)',
    fontWeight: '500',
    display: 'flex',
    alignItems: 'center',
    gap: '4px'
  },
  adminBadge: {
    fontSize: '0.6rem',
    backgroundColor: 'var(--color-accent-yellow)',
    color: '#0A0A0A',
    padding: '1px 4px',
    borderRadius: '3px',
    fontWeight: '700'
  },
  tenantSelectorBox: {
    background: 'rgba(245, 158, 11, 0.05)',
    border: '1px solid rgba(245, 158, 11, 0.2)',
    borderRadius: '6px',
    padding: '12px',
    animation: 'fadeIn 0.3s ease-out'
  },
  tenantSelect: {
    padding: '8px',
    fontSize: '0.85rem',
    border: '1px solid rgba(245, 158, 11, 0.2)'
  },
  navMenu: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    flexGrow: 1
  },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    background: 'none',
    border: 'none',
    color: 'var(--color-text-secondary)',
    padding: '10px 14px',
    borderRadius: '6px',
    fontSize: '0.95rem',
    fontWeight: '500',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'all 0.2s ease'
  },
  navItemActive: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    color: '#FFFFFF',
    fontWeight: '600',
    boxShadow: 'inset 3px 0 0 var(--color-accent-blue)'
  },
  navItemAdminActive: {
    backgroundColor: 'rgba(212, 175, 55, 0.1)',
    color: '#D4AF37',
    fontWeight: '600',
    boxShadow: 'inset 3px 0 0 #D4AF37'
  },
  navIcon: {
    fontSize: '1.1rem'
  },
  btnOnboardingSim: {
    backgroundColor: 'rgba(59, 130, 246, 0.05)',
    color: '#60A5FA',
    border: '1px dashed rgba(59, 130, 246, 0.3)',
    borderRadius: '6px',
    padding: '8px 12px',
    fontSize: '0.85rem',
    cursor: 'pointer',
    justifyContent: 'center',
    transition: 'all 0.2s ease'
  },
  demoSessionBox: {
    background: 'rgba(16, 185, 129, 0.03)',
    border: '1px solid rgba(16, 185, 129, 0.15)',
    borderRadius: '6px',
    padding: '12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  },
  demoSelect: {
    padding: '6px',
    fontSize: '0.8rem',
    border: '1px solid rgba(16, 185, 129, 0.2)',
    backgroundColor: 'rgba(0,0,0,0.3)',
    color: '#FFFFFF'
  },
  userRoleInfo: {
    fontSize: '0.7rem',
    color: '#9CA3AF',
    fontStyle: 'italic',
    paddingLeft: '2px'
  },
  // Client-facing identity badge — replaces technical DB switcher for client_manager role
  clientIdentityBox: {
    background: 'rgba(16, 185, 129, 0.04)',
    border: '1px solid rgba(16, 185, 129, 0.12)',
    borderRadius: '8px',
    padding: '12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  clientIdentityHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  },
  clientConnectedDot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    backgroundColor: '#10B981',
    display: 'inline-block',
    flexShrink: 0,
    boxShadow: '0 0 6px rgba(16, 185, 129, 0.6)'
  },
  clientConnectedLabel: {
    fontSize: '0.7rem',
    color: '#10B981',
    fontWeight: '600',
    letterSpacing: '0.04em',
    textTransform: 'uppercase'
  },
  clientCompanyName: {
    fontSize: '0.9rem',
    color: '#FFFFFF',
    fontWeight: '700',
    lineHeight: '1.3'
  },
  clientUserRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    paddingTop: '4px',
    borderTop: '1px solid rgba(255,255,255,0.04)'
  },
  clientUserAvatar: {
    width: '22px',
    height: '22px',
    borderRadius: '50%',
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    color: 'var(--color-accent-blue)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.7rem',
    fontWeight: '700',
    flexShrink: 0
  },
  clientUserName: {
    fontSize: '0.78rem',
    color: '#9CA3AF',
    fontStyle: 'italic'
  },
  sidebarFooter: {
    borderTop: '1px solid rgba(255, 255, 255, 0.05)',
    paddingTop: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  factoryBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: '0.85rem'
  },
  pulseDot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    backgroundColor: 'var(--color-accent-green)',
    display: 'inline-block',
    animation: 'pulse 2s infinite'
  },
  footerText: {
    fontSize: '0.75rem',
    color: 'var(--color-text-secondary)',
    lineHeight: '1.3'
  },
  mainViewport: {
    flexGrow: 1,
    padding: '40px',
    height: '100vh',
    overflowY: 'auto'
  },
  floatingChatBtn: {
    position: 'fixed',
    bottom: '30px',
    right: '30px',
    width: '56px',
    height: '56px',
    borderRadius: '50%',
    backgroundColor: 'var(--color-accent-blue)',
    color: '#FFFFFF',
    border: '1px solid rgba(255,255,255,0.1)',
    boxShadow: '0 0 20px rgba(59, 130, 246, 0.5)',
    fontSize: '0.95rem',
    fontWeight: '700',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 99,
    transition: 'all 0.2s ease'
  },
  chatPulse: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: '50%',
    border: '2px solid var(--color-accent-blue)',
    animation: 'ping 1.8s infinite',
    opacity: 0.7,
    pointerEvents: 'none'
  }
};

// Add raw CSS animations
const styleEl = document.createElement('style');
styleEl.textContent = `
  @keyframes pulse {
    0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
    70% { transform: scale(1); box-shadow: 0 0 0 4px rgba(16, 185, 129, 0); }
    100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
  }
  @keyframes ping {
    0% { transform: scale(1); opacity: 0.8; }
    70% { transform: scale(1.4); opacity: 0; }
    100% { transform: scale(1); opacity: 0; }
  }
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(-5px); }
    to { opacity: 1; transform: translateY(0); }
  }
`;
document.head.appendChild(styleEl);

export default App;
