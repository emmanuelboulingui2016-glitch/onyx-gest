import React, { useState } from 'react';
import { supabase } from '../utils/supabaseClient';

export const LoginAdmin = ({ onBack }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (!supabase) {
        throw new Error("Le service d'authentification Supabase n'est pas initialisé.");
      }

      // 1. Sign in via Supabase
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password
      });

      if (authError) throw authError;

      // 2. Query profile to check admin rights
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .maybeSingle();

      if (profileError) throw profileError;

      if (!profile || profile.role !== 'factory_admin') {
        // Sign out immediately if not admin
        await supabase.auth.signOut();
        throw new Error("Accès refusé : Ce compte n'a pas les droits d'administration de la plateforme.");
      }

      // Successful login will automatically trigger the App's auth listener
    } catch (err) {
      console.error("❌ Erreur de connexion Admin :", err);
      setError(err.message || "Identifiants incorrects ou droits insuffisants.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      {/* Background Orbs */}
      <div style={styles.glowRed}></div>
      <div style={styles.glowDark}></div>

      <div style={styles.loginCard}>
        <div style={styles.header}>
          <div style={styles.logoCircle}>🛡️</div>
          <h2 style={styles.title}>Onyx Gest</h2>
          <p style={styles.subtitle}>Portail de Supervision 241 Code Factory</p>
        </div>

        {error && (
          <div style={styles.errorBox}>
            <span style={styles.errorIcon}>🚨</span>
            <span style={styles.errorText}>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Adresse e-mail SuperAdmin</label>
            <input 
              type="email" 
              required
              placeholder="admin@241codefactory.ga"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={styles.input}
              autoComplete="username"
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Code d'accès sécurisé</label>
            <input 
              type="password" 
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={styles.input}
              autoComplete="current-password"
            />
          </div>

          <button 
            type="submit" 
            disabled={isLoading}
            style={{
              ...styles.btnSubmit,
              opacity: isLoading ? 0.7 : 1,
              cursor: isLoading ? 'not-allowed' : 'pointer'
            }}
          >
            {isLoading ? 'Authentification...' : 'Se connecter en mode SuperAdmin'}
          </button>
        </form>

        <div style={styles.divider}></div>

        <button onClick={onBack} style={styles.btnLink}>
          ← Retour au portail public
        </button>

        <footer style={styles.footer}>
          Accès restreint • Journalisation d'audit active
        </footer>
      </div>
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    backgroundColor: '#070303',
    padding: '20px',
    position: 'relative',
    overflow: 'hidden',
    fontFamily: "'Outfit', 'Inter', system-ui, -apple-system, sans-serif"
  },
  glowRed: {
    position: 'absolute',
    width: '400px',
    height: '400px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(239, 68, 68, 0.08) 0%, rgba(0,0,0,0) 70%)',
    top: '-10%',
    left: '-10%',
    zIndex: 1
  },
  glowDark: {
    position: 'absolute',
    width: '500px',
    height: '500px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(17, 24, 39, 0.2) 0%, rgba(0,0,0,0) 70%)',
    bottom: '-10%',
    right: '-10%',
    zIndex: 1
  },
  loginCard: {
    maxWidth: '420px',
    width: '100%',
    padding: '40px 30px',
    borderRadius: '16px',
    backgroundColor: 'rgba(15, 10, 10, 0.9)',
    backdropFilter: 'blur(20px)',
    border: '1px solid rgba(239, 68, 68, 0.1)',
    boxShadow: '0 20px 50px rgba(0, 0, 0, 0.8)',
    zIndex: 2,
    textAlign: 'center'
  },
  header: {
    marginBottom: '30px'
  },
  logoCircle: {
    width: '54px',
    height: '54px',
    borderRadius: '12px',
    backgroundColor: '#EF4444',
    color: '#FFFFFF',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: '800',
    fontSize: '1.6rem',
    marginBottom: '14px',
    boxShadow: '0 8px 24px rgba(239, 68, 68, 0.3)'
  },
  title: {
    color: '#FFFFFF',
    margin: 0,
    fontSize: '1.75rem',
    fontWeight: '700',
    letterSpacing: '-0.5px'
  },
  subtitle: {
    color: '#9CA3AF',
    fontSize: '0.9rem',
    marginTop: '6px'
  },
  errorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.2)',
    borderRadius: '8px',
    padding: '12px 14px',
    display: 'flex',
    alignItems: 'flex-start',
    gap: '10px',
    textAlign: 'left',
    marginBottom: '24px'
  },
  errorIcon: {
    fontSize: '1.1rem',
    lineHeight: 1
  },
  errorText: {
    color: '#F87171',
    fontSize: '0.85rem',
    lineHeight: '1.4'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    textAlign: 'left'
  },
  label: {
    fontSize: '0.75rem',
    color: '#9CA3AF',
    fontWeight: '600',
    letterSpacing: '0.5px',
    textTransform: 'uppercase'
  },
  input: {
    width: '100%',
    boxSizing: 'border-box',
    padding: '12px 14px',
    backgroundColor: '#0A0505',
    color: '#FFF',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '8px',
    fontSize: '0.95rem',
    outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s'
  },
  btnSubmit: {
    width: '100%',
    padding: '14px',
    fontWeight: '700',
    fontSize: '0.95rem',
    backgroundColor: '#EF4444',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '8px',
    boxShadow: '0 4px 15px rgba(239, 68, 68, 0.2)',
    cursor: 'pointer',
    transition: 'transform 0.15s, opacity 0.15s'
  },
  divider: {
    color: '#4B5563',
    height: '1px',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    margin: '20px 0'
  },
  btnLink: {
    background: 'none',
    border: 'none',
    color: '#9CA3AF',
    fontSize: '0.85rem',
    cursor: 'pointer',
    padding: '8px',
    transition: 'color 0.2s'
  },
  footer: {
    marginTop: '30px',
    fontSize: '0.75rem',
    color: '#4B5563',
    borderTop: '1px solid rgba(255, 255, 255, 0.05)',
    paddingTop: '20px'
  }
};
