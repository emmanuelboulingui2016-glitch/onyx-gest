import React, { useState } from 'react';
import { useTenant } from '../context/TenantContext';

export const Onboarding = () => {
  const { 
    onboardingStep, 
    onboardingUser, 
    simulatedRegister, 
    simulatedActivate, 
    simulatedSaveConfig,
    setOnboardingStep,
    resendActivationEmail
  } = useTenant();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [tenantCodeInput, setTenantCodeInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Config Form State
  const [companyName, setCompanyName] = useState('');
  const [managerName, setManagerName] = useState('');
  const [city, setCity] = useState('Libreville');
  const [address, setAddress] = useState('');
  const [nif, setNif] = useState('');
  const [rccm, setRccm] = useState('');
  const [phone, setPhone] = useState('');
  const [logoUploaded, setLogoUploaded] = useState(false);
  const [logoName, setLogoName] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  const handleResend = async () => {
    setIsResending(true);
    setErrorMsg('');
    setResendSuccess(false);
    try {
      await resendActivationEmail();
      setResendSuccess(true);
      setTimeout(() => setResendSuccess(false), 5000);
    } catch (err) {
      setErrorMsg("Impossible de renvoyer l'e-mail d'activation: " + (err.message || err));
    } finally {
      setIsResending(false);
    }
  };

  const validatePassword = (pwd) => {
    if (pwd.length < 12) {
      return "Le mot de passe doit contenir au moins 12 caractères.";
    }
    if (!/[A-Z]/.test(pwd)) {
      return "Le mot de passe doit inclure au moins une lettre majuscule.";
    }
    if (!/[a-z]/.test(pwd)) {
      return "Le mot de passe doit inclure au moins une lettre minuscule.";
    }
    if (!/[0-9]/.test(pwd)) {
      return "Le mot de passe doit inclure au moins un chiffre.";
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(pwd)) {
      return "Le mot de passe doit inclure au moins un caractère spécial (ex: @, #, $, etc.).";
    }
    return "";
  };

  const translateSupabaseError = (err) => {
    if (!err) return "⚠️ Une erreur inconnue est survenue.";

    let msg = "";
    if (typeof err === 'string') {
      msg = err;
    } else if (err.message) {
      msg = err.message;
    } else if (err.error_description) {
      msg = err.error_description;
    } else if (err.error) {
      msg = typeof err.error === 'string' ? err.error : JSON.stringify(err.error);
    } else {
      try {
        msg = JSON.stringify(err);
      } catch (e) {
        msg = String(err);
      }
    }

    // Si le message est vide, sérialisé en '{}' ou '[object Object]', on extrait toutes ses propriétés internes
    if (!msg || msg === "{}" || msg.includes("[object Object]")) {
      try {
        const props = [];
        for (const key in err) {
          props.push(`${key}: ${JSON.stringify(err[key])}`);
        }
        if (props.length > 0) {
          msg = props.join(" | ");
        } else {
          msg = `Détails techniques : ${String(err)} (Type: ${typeof err})`;
        }
      } catch (e) {
        msg = String(err);
      }
    }

    if (msg.includes("Invalid API key") || msg.includes("apikey")) {
      return "⚠️ Problème de connexion avec le serveur : Clé API invalide. Veuillez contacter l'administrateur de 241 Code Factory pour mettre à jour les clés de sécurité de l'application.";
    }
    if (msg.includes("User already registered") || msg.includes("already exists")) {
      return "⚠️ Cette adresse e-mail est déjà associée à un compte Onyx Gest. Veuillez utiliser une autre adresse ou retourner sur la page de connexion.";
    }
    if (msg.includes("Signup is disabled")) {
      return "⚠️ Les inscriptions libres sont désactivées sur cette plateforme. Veuillez demander à votre administrateur de vous inviter ou de vous créer un espace de travail.";
    }
    if (msg.includes("weak_password") || msg.includes("password should be")) {
      return "⚠️ Le mot de passe ne respecte pas les critères de complexité exigés par le serveur. Veuillez choisir un mot de passe plus fort (8 caractères, chiffres et symboles).";
    }
    if (msg.includes("Failed to fetch") || msg.includes("Network request failed")) {
      return "⚠️ Connexion réseau impossible. Veuillez vérifier que vous êtes bien connecté à Internet puis réessayez.";
    }
    if (msg.includes("Username and Password not accepted") || msg.includes("535") || msg.includes("SMTP")) {
      return "⚠️ Erreur de messagerie (SMTP 535) : Votre mot de passe d'application Gmail (SMTP_PASS) configuré dans les secrets Supabase n'est pas accepté par Google. Veuillez générer et enregistrer un mot de passe d'application valide.";
    }
    if (msg.includes("not configured") || msg.includes("SMTP_PASS")) {
      return "⚠️ Messagerie non configurée : Le mot de passe d'application GMail (SMTP_PASS) n'est pas renseigné dans les Secrets de votre console Supabase. Veuillez l'ajouter.";
    }
    return `⚠️ Erreur : ${msg}. Veuillez vérifier vos identifiants ou contacter l'assistance technique.`;
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setPasswordError('');
    
    if (!email || !password || !confirmPassword) {
      setPasswordError("Tous les champs sont obligatoires.");
      return;
    }

    if (password !== confirmPassword) {
      setPasswordError("Les deux mots de passe ne correspondent pas.");
      return;
    }

    // Validation stricte du mot de passe pour conformité OWASP / AST scanners
    if (password.length >= 12 && /[A-Z]/.test(password) && /[a-z]/.test(password) && /[0-9]/.test(password) && /[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      setIsRegistering(true);
      try {
        await simulatedRegister(email, password);
      } catch (err) {
        console.error("❌ Onboarding Registration Error:", err);
        setPasswordError(translateSupabaseError(err));
      } finally {
        setIsRegistering(false);
      }
    } else {
      if (password.length < 12) {
        setPasswordError("Le mot de passe doit contenir au moins 12 caractères.");
      } else if (!/[A-Z]/.test(password)) {
        setPasswordError("Le mot de passe doit inclure au moins une lettre majuscule.");
      } else if (!/[a-z]/.test(password)) {
        setPasswordError("Le mot de passe doit inclure au moins une lettre minuscule.");
      } else if (!/[0-9]/.test(password)) {
        setPasswordError("Le mot de passe doit inclure au moins un chiffre.");
      } else {
        setPasswordError("Le mot de passe doit inclure au moins un caractère spécial (ex: @, #, $, etc.).");
      }
    }
  };

  const handleActivateSubmit = (e) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      simulatedActivate(tenantCodeInput);
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  const [isSavingConfig, setIsSavingConfig] = useState(false);

  const handleConfigSubmit = async (e) => {
    e.preventDefault();
    if (!companyName || !address) {
      alert("Veuillez remplir tous les champs obligatoires.");
      return;
    }

    const configData = {
      name: companyName,
      managerName: managerName,
      city: city,
      address: address,
      nif: nif,
      rccm: rccm,
      phone: phone,
      logoText: companyName.slice(0, 3).toUpperCase()
    };

    setErrorMsg('');
    setIsSavingConfig(true);
    try {
      await simulatedSaveConfig(configData);
    } catch (err) {
      console.error("❌ Onboarding Config Error:", err);
      setErrorMsg(translateSupabaseError(err));
    } finally {
      setIsSavingConfig(false);
    }
  };

  const handleLogoUploadSim = (e) => {
    const file = e.target.files[0];
    if (file) {
      setLogoUploaded(true);
      setLogoName(file.name);
      // Log to virtual storage log
      console.log(`[Storage Sim] Uploaded logo file ${file.name} to bucket 'logos'`);
    }
  };

  return (
    <div style={styles.fullscreenBackground}>
      <div className="onyx-card" style={styles.container}>
        <div style={styles.logoBadge}>O</div>
        <h2 style={styles.title}>Onyx Gest</h2>
        <p style={styles.subtitle}>Création de votre compte commercial</p>

        {/* Etape 1: Inscription */}
        {onboardingStep === 'auth' && (
          <form onSubmit={handleRegisterSubmit} style={styles.form}>
            <div style={styles.stepIndicator}>Étape 1 : Identifiants de connexion</div>
            
            {passwordError && (
              <div style={{
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                color: '#EF4444',
                padding: '10px',
                borderRadius: '6px',
                fontSize: '0.8rem',
                textAlign: 'left'
              }}>
                ⚠️ {passwordError}
              </div>
            )}

            <div>
              <label className="onyx-label">Adresse Courriel</label>
              <input 
                type="email" 
                className="onyx-input" 
                placeholder="client@entreprise.ga" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required 
              />
            </div>
            <div>
              <label className="onyx-label">Mot de passe</label>
              <input 
                type="password" 
                className="onyx-input" 
                placeholder="••••••••" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required 
              />
            </div>
            <div>
              <label className="onyx-label">Confirmer le mot de passe</label>
              <input 
                type="password" 
                className="onyx-input" 
                placeholder="••••••••" 
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required 
              />
            </div>
             <button 
               type="submit" 
               className="btn-primary" 
               style={{ justifyContent: 'center' }}
               disabled={isRegistering}
             >
               {isRegistering ? "Création du compte..." : "Créer mon compte Onyx Gest"}
             </button>
            <button 
              type="button" 
              onClick={() => setOnboardingStep(null)} 
              className="btn-secondary" 
              style={{ justifyContent: 'center', marginTop: '4px' }}
            >
              Annuler
            </button>
          </form>
        )}

        {/* Etape 2: Activation Code */}
        {onboardingStep === 'activation' && (
          <div style={styles.form}>
            <div style={styles.stepIndicator}>Étape 2 : Activation de votre espace commercial</div>

            <p style={{
              fontSize: '0.9rem',
              color: '#9CA3AF',
              textAlign: 'center',
              lineHeight: '1.5',
              marginBottom: '16px'
            }}>
              Un e-mail contenant votre **code d'activation unique (tenant_id)** vient de vous être envoyé. 
              Veuillez consulter votre boîte de réception et le reporter ci-dessous.
            </p>

            <form onSubmit={handleActivateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label className="onyx-label">Code d'activation reçu par e-mail</label>
                <input 
                  type="text" 
                  className="onyx-input data-mono" 
                  placeholder="ex: tenant_auto_1234" 
                  value={tenantCodeInput}
                  onChange={(e) => setTenantCodeInput(e.target.value)}
                  required 
                />
              </div>

              {errorMsg && (
                <div style={styles.errorBox}>
                  <span>⚠️ {errorMsg}</span>
                </div>
              )}

              <button type="submit" className="btn-success" style={{ justifyContent: 'center' }}>
                Activer et sécuriser mon espace
              </button>

              <button 
                type="button" 
                onClick={handleResend}
                className="btn-secondary" 
                style={{ justifyContent: 'center', marginTop: '4px' }}
                disabled={isResending}
              >
                {isResending ? "Renvoi en cours..." : "Renvoyer l'e-mail d'activation"}
              </button>

              {resendSuccess && (
                <div style={{
                  backgroundColor: 'rgba(16, 185, 129, 0.1)',
                  border: '1px solid rgba(16, 185, 129, 0.2)',
                  color: '#10B981',
                  padding: '10px',
                  borderRadius: '6px',
                  fontSize: '0.85rem',
                  textAlign: 'center',
                  marginTop: '4px'
                }}>
                  ✅ E-mail d'activation renvoyé avec succès !
                </div>
              )}
            </form>
          </div>
        )}

        {/* Etape 3: Configuration Entreprise (UX/UI Page Config) */}
        {onboardingStep === 'config' && (
          <form onSubmit={handleConfigSubmit} style={styles.form}>
            <div style={styles.stepIndicator}>Étape 3 : Configuration de l'Entreprise</div>

            {errorMsg && (
              <div style={styles.errorBox}>
                <span>⚠️ {errorMsg}</span>
              </div>
            )}

            <div style={styles.row}>
              <div style={styles.col}>
                <label className="onyx-label">Nom de l'entreprise</label>
                <input 
                  type="text" 
                  className="onyx-input" 
                  placeholder="ex: Gabon Distribution S.A." 
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  required 
                />
              </div>
              <div style={styles.col}>
                <label className="onyx-label">Nom du Gérant</label>
                <input 
                  type="text" 
                  className="onyx-input" 
                  placeholder="ex: Jean Mba" 
                  value={managerName}
                  onChange={(e) => setManagerName(e.target.value)}
                  required 
                />
              </div>
            </div>

            <div style={styles.row}>
              <div style={styles.col}>
                <label className="onyx-label">Ville (Gabon)</label>
                <select 
                  className="onyx-select" 
                  value={city} 
                  onChange={(e) => setCity(e.target.value)}
                >
                  <option value="Libreville">Libreville</option>
                  <option value="Port-Gentil">Port-Gentil</option>
                  <option value="Franceville">Franceville</option>
                  <option value="Oyem">Oyem</option>
                  <option value="Moanda">Moanda</option>
                </select>
              </div>
              <div style={styles.col}>
                <label className="onyx-label">Téléphone Contact</label>
                <input 
                  type="text" 
                  className="onyx-input" 
                  placeholder="+241 077 00 00 00" 
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required 
                />
              </div>
            </div>

            <div>
              <label className="onyx-label">Adresse de l'établissement</label>
              <input 
                type="text" 
                className="onyx-input" 
                placeholder="Quartier, Avenue, Boulevard..." 
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                required 
              />
            </div>

            <div style={styles.row}>
              <div style={styles.col}>
                <label className="onyx-label">Numéro d'Identification Fiscale (NIF) (facultatif)</label>
                <input 
                  type="text" 
                  className="onyx-input data-mono" 
                  placeholder="ex: 078945A" 
                  value={nif}
                  onChange={(e) => setNif(e.target.value)}
                />
              </div>
              <div style={styles.col}>
                <label className="onyx-label">Registre de Commerce (RCCM) (facultatif)</label>
                <input 
                  type="text" 
                  className="onyx-input data-mono" 
                  placeholder="ex: RG-LBV-2026-B-11" 
                  value={rccm}
                  onChange={(e) => setRccm(e.target.value)}
                />
              </div>
            </div>

            {/* Storage Logo Upload Simulator */}
            <div>
              <label className="onyx-label">Logo de l'entreprise (Supabase Storage)</label>
              <div style={styles.uploadBox}>
                <input 
                  type="file" 
                  id="logo-file" 
                  onChange={handleLogoUploadSim} 
                  style={{ display: 'none' }}
                  accept="image/*"
                />
                <label htmlFor="logo-file" style={styles.uploadLabel}>
                  {logoUploaded ? (
                    <div style={{ color: '#10B981', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                      <span>✅ Logo téléversé avec succès !</span>
                      <span style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>{logoName}</span>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                      <span>📁 Choisir ou glisser une image logo</span>
                      <span style={{ fontSize: '0.7rem', color: '#9CA3AF' }}>PNG, JPG (max 2 Mo)</span>
                    </div>
                  )}
                </label>
              </div>
            </div>

            <button type="submit" className="btn-success" style={{ justifyContent: 'center', marginTop: '10px' }} disabled={isSavingConfig}>
              {isSavingConfig ? "Création de l'espace..." : "Finaliser et Créer l'Espace Onyx Gest"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

const styles = {
  fullscreenBackground: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#0A0A0A',
    background: 'radial-gradient(circle at center, #0A0A0A 0%, #051015 100%)',
    zIndex: 9999,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    overflowY: 'auto'
  },
  container: {
    width: '100%',
    maxWidth: '520px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '30px',
    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.6)'
  },
  logoBadge: {
    width: '40px',
    height: '40px',
    borderRadius: '8px',
    backgroundColor: 'var(--color-accent-blue)',
    color: '#FFFFFF',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: '800',
    fontSize: '1.4rem',
    boxShadow: '0 0 15px rgba(59, 130, 246, 0.4)',
    marginBottom: '16px'
  },
  title: {
    fontSize: '1.6rem',
    marginBottom: '2px'
  },
  subtitle: {
    fontSize: '0.85rem',
    color: 'var(--color-text-secondary)',
    marginBottom: '20px'
  },
  form: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  stepIndicator: {
    fontSize: '0.9rem',
    fontWeight: '600',
    color: 'var(--color-accent-blue)',
    borderBottom: '1px solid rgba(59, 130, 246, 0.2)',
    paddingBottom: '8px',
    marginBottom: '4px',
    textAlign: 'center'
  },
  inboxMock: {
    backgroundColor: '#1E1E1E',
    border: '1px solid #333',
    borderRadius: '6px',
    overflow: 'hidden',
    fontSize: '0.8rem',
    boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.5)'
  },
  inboxHeader: {
    backgroundColor: '#2D2D2D',
    padding: '6px 12px',
    borderBottom: '1px solid #333'
  },
  inboxTitle: {
    color: '#E5E7EB',
    fontWeight: '600'
  },
  inboxBody: {
    padding: '12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    color: '#D1D5DB'
  },
  inboxDivider: {
    height: '1px',
    backgroundColor: '#333',
    margin: '4px 0'
  },
  inboxCode: {
    alignSelf: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    color: 'var(--color-accent-yellow)',
    border: '1px dashed var(--color-accent-yellow)',
    borderRadius: '4px',
    padding: '8px 16px',
    fontSize: '1rem',
    fontWeight: '700',
    margin: '10px 0',
    letterSpacing: '0.05em'
  },
  errorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    borderRadius: '4px',
    padding: '10px',
    color: '#EF4444',
    fontSize: '0.85rem',
    textAlign: 'center'
  },
  row: {
    display: 'flex',
    gap: '12px'
  },
  col: {
    flex: 1
  },
  uploadBox: {
    border: '1px dashed var(--color-border)',
    borderRadius: '6px',
    padding: '20px',
    textAlign: 'center',
    cursor: 'pointer',
    backgroundColor: 'rgba(0,0,0,0.2)',
    transition: 'border-color 0.2s ease'
  },
  uploadLabel: {
    cursor: 'pointer',
    display: 'block',
    fontSize: '0.85rem'
  }
};
