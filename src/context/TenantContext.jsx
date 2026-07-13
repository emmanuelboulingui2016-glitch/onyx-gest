import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabaseSim } from '../utils/supabaseSim';
import { supabase } from '../utils/supabaseClient';
import { getTenantUUID } from '../utils/cryptoHelpers';

const TenantContext = createContext(null);

export const INITIAL_TENANTS = [
  {
    id: 'tenant_onyx_dist_1',
    name: 'Onyx Distribution Gabon S.A.',
    city: 'Libreville',
    rccm: 'RG-LBV-2026-B-8910',
    nif: '078129K',
    phone: '+241 011 76 54 32',
    email: 'contact@onyxdist.ga',
    logoText: 'ODG'
  },
  {
    id: 'tenant_btp_gabon_2',
    name: 'BTP Gabon SARL',
    city: 'Port-Gentil',
    rccm: 'RG-POG-2026-B-1412',
    nif: '098152L',
    phone: '+241 077 88 99 00',
    email: 'contact@btpgabon.ga',
    logoText: 'BTPG'
  }
];

export const INITIAL_DEMO_USERS = [
  {
    id: 'user_mba_1',
    name: 'Emmanuel Mba',
    role: 'client_manager',
    roleLabel: 'Gestionnaire Client',
    tenant_id: 'tenant_onyx_dist_1'
  },
  {
    id: 'user_ndong_2',
    name: 'Jean-Pierre Ndong',
    role: 'client_manager',
    roleLabel: 'Gestionnaire Client',
    tenant_id: 'tenant_btp_gabon_2'
  },
  {
    id: 'user_admin_3',
    name: 'Support 241 Code Factory',
    role: 'factory_admin',
    roleLabel: 'Administrateur Plateforme',
    tenant_id: 'tenant_onyx_dist_1'
  },
  {
    id: 'user_comptable_4',
    name: 'Alain Bongo',
    role: 'comptable',
    roleLabel: 'Comptable',
    tenant_id: 'tenant_onyx_dist_1'
  }
];

export const TenantProvider = ({ children }) => {
  const [tenants, setTenants] = useState(() => {
    return getLocalStore('onyx_tenants_list', INITIAL_TENANTS);
  });

  const [demoUsers, setDemoUsers] = useState(() => {
    return getLocalStore('onyx_users_list', INITIAL_DEMO_USERS);
  });

  const [currentUser, setCurrentUser] = useState(null);
  const [activeTenant, setActiveTenant] = useState(INITIAL_TENANTS[0]);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [adminMode, setAdminMode] = useState(false);
  const [syncTrigger, setSyncTrigger] = useState(0);

  const [language, setLanguage] = useState(() => {
    return localStorage.getItem('onyx_language') || 'fr';
  });

  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('onyx_theme') || 'dark';
  });

  useEffect(() => {
    localStorage.setItem('onyx_language', language);
  }, [language]);

  useEffect(() => {
    localStorage.setItem('onyx_theme', theme);
    if (theme === 'light') {
      document.body.classList.add('light-theme');
    } else {
      document.body.classList.remove('light-theme');
    }
  }, [theme]);

  // Onboarding Phase 3 States
  const [onboardingStep, setOnboardingStep] = useState(null); // 'auth' | 'activation' | 'config' | null
  const [onboardingUser, setOnboardingUser] = useState(null); // { email, tenant_id, temp_user_id }

  // Phase 5: Subscription Soft Lock state
  const [subscriptionData, setSubscriptionData] = useState(() => {
    return supabaseSim.checkSubscriptionStatus(INITIAL_TENANTS[0].id);
  });

  function getLocalStore(key, defaultVal) {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : defaultVal;
  }

  function setLocalStore(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  const getRoleLabel = (role) => {
    switch (role) {
      case 'factory_admin': return 'Administrateur Plateforme';
      case 'client_manager': return 'Gestionnaire Client';
      default: return 'Comptable';
    }
  };

  const handleSession = async (session) => {
    if (!session) {
      setCurrentUser(null);
      supabaseSim.setSessionUser(null);
      setIsLoadingAuth(false);
      return;
    }

    const authUser = session.user;
    
    try {
      // 1. Fetch profile from public.profiles table
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .maybeSingle();

      if (!error && profile) {
        const mappedUser = {
          id: profile.id,
          name: profile.name || authUser.email.split('@')[0],
          role: profile.role || 'comptable',
          roleLabel: getRoleLabel(profile.role),
          tenant_id: profile.tenant_id,
          simple_tenant_id: authUser.user_metadata?.tenant_id || 'tenant_onyx_dist_1'
        };
        setCurrentUser(mappedUser);
        supabaseSim.setSessionUser(mappedUser);

        // Fetch corresponding tenant
        const assocTenant = tenants.find(t => getTenantUUID(t.id) === profile.tenant_id);
        if (assocTenant) {
          setActiveTenant(assocTenant);
          setSubscriptionData(supabaseSim.checkSubscriptionStatus(assocTenant.id));
        } else {
          const { data: dbTenant } = await supabase
            .from('tenants')
            .select('*')
            .eq('id', profile.tenant_id)
            .maybeSingle();
          if (dbTenant) {
            const updated = [...tenants.filter(t => t.id !== dbTenant.id), dbTenant];
            setTenants(updated);
            setLocalStore('onyx_tenants_list', updated);
            setActiveTenant(dbTenant);
            setSubscriptionData(supabaseSim.checkSubscriptionStatus(dbTenant.id));
          } else {
            // Tenant does NOT exist in database yet! Onboarding is incomplete!
            console.log("⚠️ Le tenant n'existe pas en BDD. Redirection vers l'onboarding...");
            setOnboardingStep('activation');
            setOnboardingUser({
              email: authUser.email,
              tenant_id: authUser.user_metadata?.tenant_id || profile.tenant_id
            });
            // Resend welcome email automatically in the background
            supabase.functions.invoke('send-welcome-email', {
              body: { tenantId: authUser.user_metadata?.tenant_id || profile.tenant_id, email: authUser.email }
            }).then(({ error: resendErr }) => {
              if (resendErr) console.error("❌ Resend welcome email failed:", resendErr);
              else console.log("📧 Welcome email sent automatically on session restore.");
            });
          }
        }
      } else {
        // Fallback for onboarding users or profiles not yet created
        const tempTenantId = authUser.user_metadata?.tenant_id;
        if (tempTenantId && tempTenantId !== 'tenant_onyx_dist_1' && tempTenantId !== 'tenant_btp_gabon_2') {
          console.log("⚠️ Pas de profil ou profil incomplet. Redirection vers l'onboarding...");
          setOnboardingStep('activation');
          setOnboardingUser({
            email: authUser.email,
            tenant_id: tempTenantId
          });
          // Resend welcome email automatically in the background
          supabase.functions.invoke('send-welcome-email', {
            body: { tenantId: tempTenantId, email: authUser.email }
          }).then(({ error: resendErr }) => {
            if (resendErr) console.error("❌ Resend welcome email failed:", resendErr);
            else console.log("📧 Welcome email sent automatically on session restore.");
          });
        } else {
          const tempTenantIdStr = tempTenantId || 'tenant_onyx_dist_1';
          const fallbackUser = {
            id: authUser.id,
            name: authUser.email.split('@')[0],
            role: authUser.user_metadata?.role || 'comptable',
            roleLabel: getRoleLabel(authUser.user_metadata?.role),
            tenant_id: getTenantUUID(tempTenantIdStr),
            simple_tenant_id: tempTenantIdStr
          };
          setCurrentUser(fallbackUser);
          supabaseSim.setSessionUser(fallbackUser);

          const assocTenant = tenants.find(t => getTenantUUID(t.id) === getTenantUUID(tempTenantIdStr));
          if (assocTenant) {
            setActiveTenant(assocTenant);
            setSubscriptionData(supabaseSim.checkSubscriptionStatus(assocTenant.id));
          }
        }
      }
    } catch (err) {
      console.error("❌ Erreur de récupération de profil Supabase :", err);
    } finally {
      setIsLoadingAuth(false);
    }
  };

  // Listen to Supabase Auth State Changes
  useEffect(() => {
    if (!supabase) {
      setIsLoadingAuth(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      handleSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      handleSession(session);
    });

    return () => {
      if (subscription) subscription.unsubscribe();
    };
  }, []);

  // Sync data from Supabase
  const syncFromSupabase = async (tenantId) => {
    if (!supabase) return;
    try {
      console.log(`🔄 Démarrage de la synchronisation Supabase pour tenant : ${tenantId}`);
      
      // Sync Invoices
      const { data: invoices, error: invErr } = await supabase
        .from('invoices')
        .select('*')
        .eq('tenant_id', tenantId);
      if (!invErr && invoices) {
        const allInvoices = JSON.parse(localStorage.getItem('onyx_invoices') || '[]');
        const otherInvoices = allInvoices.filter(i => i.tenant_id !== tenantId);
        localStorage.setItem('onyx_invoices', JSON.stringify([...otherInvoices, ...invoices]));
      }

      // Sync Customers
      const { data: customers, error: custErr } = await supabase
        .from('customers')
        .select('*')
        .eq('tenant_id', tenantId);
      if (!custErr && customers) {
        const allCustomers = JSON.parse(localStorage.getItem('onyx_customers') || '[]');
        const otherCustomers = allCustomers.filter(c => c.tenant_id !== tenantId);
        localStorage.setItem('onyx_customers', JSON.stringify([...otherCustomers, ...customers]));
      }

      // Sync Settings
      const { data: settings, error: setErr } = await supabase
        .from('company_settings')
        .select('*')
        .eq('tenant_id', tenantId)
        .maybeSingle();
      if (!setErr && settings) {
        const allSettings = JSON.parse(localStorage.getItem('onyx_company_settings') || '[]');
        const otherSettings = allSettings.filter(s => s.tenant_id !== tenantId);
        localStorage.setItem('onyx_company_settings', JSON.stringify([...otherSettings, settings]));
      }

      console.log("✅ Synchronisation Supabase -> LocalStorage terminée avec succès !");
      setSyncTrigger(prev => prev + 1); // Trigger UI reload!
    } catch (err) {
      console.warn("⚠️ Impossible de synchroniser Supabase :", err);
    }
  };

  // Trigger background sync when active tenant changes
  useEffect(() => {
    if (activeTenant) {
      syncFromSupabase(activeTenant.id);

      // Fetch real subscription status from Supabase
      if (supabase) {
        supabase.from('tenants')
          .select('subscription_status, subscription_end_date')
          .eq('id', activeTenant.id)
          .maybeSingle()
          .then(({ data, error }) => {
            if (!error && data) {
              const now = new Date();
              const endDate = data.subscription_end_date ? new Date(data.subscription_end_date) : now;
              const diffDays = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));
              setSubscriptionData({
                subscription_status: data.subscription_status || 'active',
                subscription_end_date: data.subscription_end_date,
                daysUntilExpiry: diffDays
              });
            }
          });
      }
    }
  }, [activeTenant]);

  const changeTenant = (tenantId) => {
    const found = tenants.find(t => t.id === tenantId);
    if (found) {
      setActiveTenant(found);
      setSubscriptionData(supabaseSim.checkSubscriptionStatus(found.id));
    }
  };

  const switchDemoUser = (userId) => {
    const foundUser = demoUsers.find(u => u.id === userId);
    if (foundUser) {
      setCurrentUser(foundUser);
      supabaseSim.setSessionUser(foundUser);
      localStorage.setItem('onyx_demo_user_id', userId);
      
      const assocTenant = tenants.find(t => t.id === foundUser.tenant_id);
      if (assocTenant) {
        setActiveTenant(assocTenant);
        setSubscriptionData(supabaseSim.checkSubscriptionStatus(assocTenant.id));
      }

      if (foundUser.role !== 'factory_admin') {
        setAdminMode(false);
      }
    }
  };

  const logout = async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
    setCurrentUser(null);
    supabaseSim.setSessionUser(null);
    localStorage.removeItem('onyx_demo_user_id');
  };

  // Onboarding Actions
  const startOnboardingSim = () => {
    setOnboardingStep('auth');
    setOnboardingUser(null);
  };

  const simulatedRegister = async (email, password) => {
    // Validation stricte du mot de passe pour conformité OWASP / AST scanners
    if (password.length >= 12 && /[A-Z]/.test(password) && /[a-z]/.test(password) && /[0-9]/.test(password) && /[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      // Call Supabase simulated registration trigger
      const res = supabaseSim.registerUser(email);

      // Real Supabase Auth registration
      if (supabase) {
        const { data, error } = await supabase.auth.signUp({
          email: email,
          password: password,
          options: {
            data: {
              tenant_id: res.tenant_id,
              role: 'client_manager',
              name: email.split('@')[0]
            }
          }
        });

        if (error) {
          console.error("❌ Inscription Supabase Auth :", error.message);
          throw error;
        }

        console.log("🔄 Inscription Supabase Auth réussie :", data.user?.email);

        // Insert corresponding profile in public.profiles table (upsert to avoid conflict with the DB trigger)
        if (data.user) {
          const { error: profErr } = await supabase.from('profiles').upsert([{
            id: data.user.id,
            tenant_id: getTenantUUID(res.tenant_id),
            name: email.split('@')[0],
            full_name: email.split('@')[0],
            role: 'client_manager'
          }]);

          if (profErr) {
            console.error("❌ Création de profil Supabase :", profErr.message);
            throw profErr;
          }

          console.log("🔄 Profil Supabase créé avec succès !");

          // Appeler directement la Edge Function pour envoyer le mail d'activation contenant le tenant_id
          const { data: fnData, error: fnErr } = await supabase.functions.invoke('send-welcome-email', {
            body: { tenantId: res.tenant_id, email: email }
          });

          if (fnErr) {
            console.error("❌ Erreur d'envoi du mail d'activation via Edge Function :", fnErr);
            let errorDetails = "Échec de l'envoi de l'e-mail d'activation.";
            try {
              if (fnErr.context) {
                const bodyText = await fnErr.context.text();
                const parsed = JSON.parse(bodyText);
                errorDetails = parsed.error || parsed.message || bodyText;
              } else if (fnErr.message) {
                errorDetails = fnErr.message;
              }
            } catch (e) {
              console.error("Failed to parse function error context:", e);
            }
            throw new Error(errorDetails);
          }

          console.log("📧 Mail d'activation envoyé avec succès via Edge Function :", fnData);
        }
      }

      setOnboardingUser(res);
      setOnboardingStep('activation');
    } else {
      throw new Error("Le mot de passe ne respecte pas les critères de complexité requis.");
    }
  };

  const simulatedActivate = (enteredTenantId) => {
    if (enteredTenantId.trim() === onboardingUser.tenant_id) {
      setOnboardingStep('config');
    } else {
      throw new Error("Échec d'activation : tenant_id incorrect ou invalide. Accès bloqué.");
    }
  };

  const simulatedSaveConfig = async (configData) => {
    const fullConfig = {
      tenant_id: onboardingUser.tenant_id,
      ...configData
    };
    
    // Save locally
    supabaseSim.saveCompanySettings(onboardingUser.tenant_id, fullConfig);

    // Save real tenant to Supabase
    const tenantUuid = getTenantUUID(onboardingUser.tenant_id);

    // Save real tenant to Supabase
    if (supabase) {
      await supabase.from('tenants').insert([{
        id: tenantUuid,
        name: configData.name,
        city: configData.city,
        rccm: configData.rccm,
        nif: configData.nif,
        phone: configData.phone,
        email: onboardingUser.email
      }]);
    }

    // Append new tenant to list
    const newTenantObj = {
      id: tenantUuid,
      name: configData.name,
      city: configData.city,
      rccm: configData.rccm,
      nif: configData.nif,
      phone: configData.phone,
      email: onboardingUser.email,
      logoText: configData.logoText || configData.name.slice(0, 3).toUpperCase()
    };

    const updatedTenants = [...tenants, newTenantObj];
    setTenants(updatedTenants);
    setLocalStore('onyx_tenants_list', updatedTenants);

    // Append new demo user to switcher
    const newUserObj = {
      id: onboardingUser.temp_user_id,
      name: configData.managerName || 'Client ' + configData.name,
      role: 'client_manager',
      roleLabel: 'Gestionnaire Client',
      tenant_id: tenantUuid
    };

    const updatedUsers = [...demoUsers, newUserObj];
    setDemoUsers(updatedUsers);
    setLocalStore('onyx_users_list', updatedUsers);

    // Complete onboarding
    setOnboardingStep(null);
    setOnboardingUser(null);
  };

  // Phase 5: Renew subscription for the active tenant
  const renewSubscription = async () => {
    const baseDate = subscriptionData.subscription_end_date ? new Date(subscriptionData.subscription_end_date) : new Date();
    const now = new Date();
    const diffDays = Math.ceil((baseDate - now) / (1000 * 60 * 60 * 24));
    const startFrom = diffDays < -7 ? new Date() : baseDate;
    startFrom.setMonth(startFrom.getMonth() + 1);
    const newEndDate = startFrom.toISOString();

    if (supabase) {
      await supabase.from('tenants').update({
        subscription_status: 'active',
        subscription_end_date: newEndDate
      }).eq('id', activeTenant.id);
    }

    // Also renew in local simulator
    supabaseSim.renewSubscription(activeTenant.id, 1);

    setSubscriptionData({
      subscription_status: 'active',
      subscription_end_date: newEndDate,
      daysUntilExpiry: Math.ceil((startFrom - now) / (1000 * 60 * 60 * 24))
    });
  };

  const resendActivationEmail = async () => {
    if (!onboardingUser) return;
    if (supabase) {
      const { error } = await supabase.functions.invoke('send-welcome-email', {
        body: { tenantId: onboardingUser.tenant_id, email: onboardingUser.email }
      });
      if (error) throw error;
    }
  };

  const deleteOwnAccount = async () => {
    if (supabase) {
      const { error } = await supabase.rpc('delete_own_user');
      if (error) throw error;
      await supabase.auth.signOut();
    }
    setCurrentUser(null);
    supabaseSim.setSessionUser(null);
    localStorage.removeItem('onyx_demo_user_id');
  };

  const deleteTenantAccount = async (tenantId) => {
    if (supabase) {
      const { error } = await supabase.rpc('delete_tenant_and_users', { target_tenant_id: tenantId });
      if (error) throw error;
    }
    const updatedTenants = tenants.filter(t => t.id !== tenantId);
    setTenants(updatedTenants);
    setLocalStore('onyx_tenants_list', updatedTenants);
    
    const updatedUsers = demoUsers.filter(u => u.tenant_id !== tenantId);
    setDemoUsers(updatedUsers);
    setLocalStore('onyx_users_list', updatedUsers);
  };

  return (
    <TenantContext.Provider value={{ 
      activeTenant, 
      tenants, 
      changeTenant, 
      currentUser, 
      demoUsers, 
      switchDemoUser,
      adminMode,
      setAdminMode,
      onboardingStep,
      onboardingUser,
      setOnboardingStep,
      startOnboardingSim,
      simulatedRegister,
      simulatedActivate,
      simulatedSaveConfig,
      isLoadingAuth,
      logout,
      resendActivationEmail,
      // Theme & Language
      language,
      setLanguage,
      theme,
      setTheme,
      deleteOwnAccount,
      deleteTenantAccount,
      // Phase 5: Subscription
      subscriptionStatus: subscriptionData.subscription_status,
      subscriptionEndDate: subscriptionData.subscription_end_date,
      daysUntilExpiry: subscriptionData.daysUntilExpiry,
      renewSubscription,
      // Supabase dynamic sync trigger
      syncTrigger
    }}>
      {children}
    </TenantContext.Provider>
  );
};

export const useTenant = () => {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
};
