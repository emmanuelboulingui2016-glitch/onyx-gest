// Supabase RLS (Row Level Security) and Tauri Native Simulation Client
import { supabase } from './supabaseClient';
// Updated for Phase 4: Admin Dashboard with Platform Supervision & Ethical Concern Separation

const DEFAULT_INVOICES = [
  // Tenant 1: Onyx Distribution Gabon S.A.
  {
    id: 'inv_101',
    tenant_id: 'tenant_onyx_dist_1',
    type: 'facture',
    number: 'FAC-2026-0001',
    client_name: 'Établissements Mba & Fils',
    client_email: 'mba.fils@gabon.ga',
    client_city: 'Libreville',
    date: '2026-06-01',
    due_date: '2026-06-15',
    status: 'paye',
    tax_rate: 18,
    items: [
      { desc: 'Fourniture de bureau (Lot A)', qty: 10, price: 150000 },
      { desc: 'Papier A4 Premium (Cartons)', qty: 50, price: 12000 }
    ],
    amount: 2478000
  },
  {
    id: 'inv_102',
    tenant_id: 'tenant_onyx_dist_1',
    type: 'facture',
    number: 'FAC-2026-0002',
    client_name: 'SOGARA S.A.',
    client_email: 'finance@sogara.ga',
    client_city: 'Port-Gentil',
    date: '2026-06-10',
    due_date: '2026-06-24',
    status: 'en_retard',
    tax_rate: 18,
    items: [
      { desc: 'Consommables informatiques spécifiques', qty: 2, price: 1850000 }
    ],
    amount: 4366000
  },
  {
    id: 'inv_103',
    tenant_id: 'tenant_onyx_dist_1',
    type: 'devis',
    number: 'DEV-2026-0001',
    client_name: 'Gabon Télécom',
    client_email: 'procurement@gabontelecom.ga',
    client_city: 'Libreville',
    date: '2026-06-25',
    due_date: '2026-07-25',
    status: 'brouillon',
    tax_rate: 18,
    items: [
      { desc: 'Licences logicielles Onyx Cloud (1 an)', qty: 100, price: 25000 }
    ],
    amount: 2950000
  },

  // Tenant 2: BTP Gabon SARL
  {
    id: 'inv_201',
    tenant_id: 'tenant_btp_gabon_2',
    type: 'facture',
    number: 'FAC-2026-0101',
    client_name: 'Ministère des Travaux Publics',
    client_email: 'travaux.publics@gabon.gouv.ga',
    client_city: 'Libreville',
    date: '2026-05-15',
    due_date: '2026-06-15',
    status: 'paye',
    tax_rate: 18,
    items: [
      { desc: 'Travaux de terrassement Boulevard Triomphal', qty: 1, price: 75000000 }
    ],
    amount: 88500000
  },
  {
    id: 'inv_202',
    tenant_id: 'tenant_btp_gabon_2',
    type: 'facture',
    number: 'FAC-2026-0102',
    client_name: 'Société Énergie et Eau du Gabon (SEEG)',
    client_email: 'factures@seeg.ga',
    client_city: 'Franceville',
    date: '2026-06-05',
    due_date: '2026-06-20',
    status: 'en_retard',
    tax_rate: 18,
    items: [
      { desc: 'Fourniture de gravier et sable concassé (m3)', qty: 450, price: 35000 }
    ],
    amount: 18585000
  }
];

const DEFAULT_LOGS = [
  {
    id: 'log_1',
    tenant_id: 'tenant_onyx_dist_1',
    invoice_id: 'inv_102',
    invoice_number: 'FAC-2026-0002',
    date: '2026-06-25 08:30',
    type: 'email',
    status: 'succes',
    message: 'Rappel courriel envoyé au client SOGARA S.A. pour la facture FAC-2026-0002.'
  }
];

const DEFAULT_CUSTOMERS = [
  {
    id: 'cust_1',
    tenant_id: 'tenant_onyx_dist_1',
    name: 'Établissements Mba & Fils',
    email: 'mba.fils@gabon.ga',
    phone: '+241 077 41 23 45',
    address: 'Libreville, Gabon',
    nif: '078129K'
  },
  {
    id: 'cust_2',
    tenant_id: 'tenant_onyx_dist_1',
    name: 'SOGARA S.A.',
    email: 'finance@sogara.ga',
    phone: '+241 011 55 44 33',
    address: 'Port-Gentil, Zone Industrielle',
    nif: '082531M'
  },
  {
    id: 'cust_4',
    tenant_id: 'tenant_btp_gabon_2',
    name: 'Ministère des Travaux Publics',
    email: 'travaux.publics@gabon.gouv.ga',
    phone: '+241 011 72 00 01',
    address: 'Libreville, Gabon',
    nif: '098152L'
  }
];

const DEFAULT_COMPANY_SETTINGS = [
  {
    tenant_id: 'tenant_onyx_dist_1',
    name: 'Onyx Distribution Gabon S.A.',
    city: 'Libreville',
    rccm: 'RG-LBV-2026-B-8910',
    nif: '078129K',
    phone: '+241 011 76 54 32',
    email: 'contact@onyxdist.ga',
    logoText: 'ODG',
    address: 'Quartier Glass, Boulevard de l\'indépendance'
  },
  {
    tenant_id: 'tenant_btp_gabon_2',
    name: 'BTP Gabon SARL',
    city: 'Port-Gentil',
    rccm: 'RG-POG-2026-B-1412',
    nif: '098152L',
    phone: '+241 077 88 99 00',
    email: 'contact@btpgabon.ga',
    logoText: 'BTPG',
    address: 'Zone Industrielle Nouveau Port'
  }
];

// Phase 4: Simulated Tenants Status List
const DEFAULT_TENANT_STATUSES = {
  'tenant_onyx_dist_1': 'actif',
  'tenant_btp_gabon_2': 'actif'
};

const DEFAULT_DEPLOYMENT_LOGS = [
  { date: '2026-06-27 18:00', msg: 'Déploiement du module Client Management v1.1.2 - Succès' },
  { date: '2026-06-25 10:15', msg: 'Mise à jour de sécurité Supabase RLS Policies v1.4.0 - Appliqué' },
  { date: '2026-06-20 09:30', msg: 'Optimisation index Postgres pour la recherche de clients - Réussi' }
];

// Phase 6: Simulated Team Members for Tenant
const DEFAULT_TEAM_MEMBERS = [
  { id: 'tm_1', tenant_id: 'tenant_onyx_dist_1', name: 'Alain Bongo', email: 'alain.bongo@onyxdist.ga', role: 'Comptable', access_level: 'modification' },
  { id: 'tm_2', tenant_id: 'tenant_onyx_dist_1', name: 'Sylvie Mba', email: 'sylvie.mba@onyxdist.ga', role: 'Commercial', access_level: 'modification' },
  { id: 'tm_3', tenant_id: 'tenant_btp_gabon_2', name: 'Marc Ndong', email: 'marc.ndong@btpgabon.ga', role: 'Consultant', access_level: 'read_only' }
];

// Phase 5: Subscription Management — Soft Lock System
// Demo dates are calculated relative to now for instant visual testing
const _now = new Date();
const _d = (daysOffset) => {
  const d = new Date(_now);
  d.setDate(d.getDate() + daysOffset);
  return d.toISOString();
};

const DEFAULT_SUBSCRIPTION_DATA = {
  'tenant_onyx_dist_1': {
    subscription_status: 'active',
    subscription_end_date: _d(180)     // Expires in 6 months — fully active
  },
  'tenant_btp_gabon_2': {
    subscription_status: 'grace_period',
    subscription_end_date: _d(-3)      // Expired 3 days ago — in grace period (7-day window)
  }
};

// Helper functions for localStorage
const getStore = (key, defaultVal) => {
  const data = localStorage.getItem(key);
  if (!data) {
    localStorage.setItem(key, JSON.stringify(defaultVal));
    return defaultVal;
  }
  return JSON.parse(data);
};

const setStore = (key, data) => {
  localStorage.setItem(key, JSON.stringify(data));
};

// Virtual console logs for RLS audit
let rlsConsoleLogs = [];
const listeners = new Set();

export const subscribeToRlsLogs = (callback) => {
  listeners.add(callback);
  callback(rlsConsoleLogs);
  return () => listeners.delete(callback);
};

const logRlsAction = (action, query, tenantId, status, details) => {
  const logEntry = {
    timestamp: new Date().toLocaleTimeString(),
    action,
    query,
    tenantId,
    status,
    details
  };
  rlsConsoleLogs = [logEntry, ...rlsConsoleLogs].slice(0, 100);
  listeners.forEach(cb => cb(rlsConsoleLogs));

  // Also write sensitive actions to the persistent audit_logs table
  if (status === 'ALLOWED' && ['INSERT', 'UPDATE', 'DELETE', 'TRIGGER'].includes(action)) {
    writeAuditLog({ action, tenantId, details, query });
  }
};

// ─── Audit Logs Table ───────────────────────────────────────────────────────
// Simulates Supabase audit_logs table persisted to localStorage
// Schema: { id, user_id, action, target_table, tenant_id, timestamp, details }
const writeAuditLog = ({ action, tenantId, details, query }) => {
  const logs = getStore('onyx_audit_logs', []);
  const targetTable = query?.match(/(?:FROM|INTO|UPDATE|TABLE)\s+(\w+)/i)?.[1] || 'unknown';
  const newLog = {
    id: `audit_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    user_id: tenantId,
    action,
    target_table: targetTable,
    tenant_id: tenantId,
    timestamp: new Date().toISOString(),
    details: details?.slice(0, 200) || ''
  };
  logs.unshift(newLog);
  setStore('onyx_audit_logs', logs.slice(0, 500)); // Keep last 500 entries

  // Background Sync to Supabase table audit_logs
  if (supabase) {
    supabase.from('audit_logs').insert([{
      action,
      target_table: targetTable,
      tenant_id: tenantId,
      details: details?.slice(0, 200) || ''
    }]).then(({ error }) => {
      if (error) console.error("❌ Synchro Supabase (audit_logs) :", error.message);
      else console.log("🔄 Synchro Supabase (audit_logs) : OK");
    });
  }
};

const generateUUID = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

let sessionUser = null;

export const supabaseSim = {
  setSessionUser: (user) => {
    sessionUser = user;
  },
  // Invoices (Devis/Factures) CRUD
  getInvoices: (activeTenantId) => {
    const allInvoices = getStore('onyx_invoices', DEFAULT_INVOICES);
    const filtered = allInvoices.filter(inv => inv.tenant_id === activeTenantId);
    
    logRlsAction(
      'SELECT', 
      `SELECT * FROM invoices WHERE tenant_id = '${activeTenantId}'`, 
      activeTenantId, 
      'ALLOWED', 
      `RLS Policy check passed. Returned ${filtered.length} rows.`
    );
    return filtered;
  },

  getUnauthorizedInvoices: (activeTenantId, targetTenantId) => {
    if (activeTenantId === targetTenantId) {
      return supabaseSim.getInvoices(activeTenantId);
    }
    
    logRlsAction(
      'SELECT', 
      `SELECT * FROM invoices WHERE tenant_id = '${targetTenantId}'`, 
      activeTenantId, 
      'DENIED', 
      `SECURITY ALERT: Row Level Security blocked access. Tenant '${activeTenantId}' attempted to read data belonging to tenant '${targetTenantId}'.`
    );
    throw new Error(`Permission Denied (Supabase RLS Policy violation: tenant_id mismatch)`);
  },

  createInvoice: (activeTenantId, invoiceData) => {
    const allInvoices = getStore('onyx_invoices', DEFAULT_INVOICES);
    if (invoiceData.tenant_id !== activeTenantId) {
      logRlsAction(
        'INSERT',
        `INSERT INTO invoices (tenant_id) VALUES ('${invoiceData.tenant_id}')`,
        activeTenantId,
        'DENIED',
        `SECURITY ALERT: Attempted to insert/update invoice for another tenant.`
      );
      throw new Error(`Permission Denied`);
    }

    const existingIdx = allInvoices.findIndex(inv => inv.id === invoiceData.id);
    let finalInvoice;
    if (existingIdx !== -1) {
      finalInvoice = { ...invoiceData };
      allInvoices[existingIdx] = finalInvoice;
      logRlsAction('UPDATE', `UPDATE invoices SET status = '${finalInvoice.status}' WHERE id = '${finalInvoice.id}'`, activeTenantId, 'ALLOWED', `RLS Update policy validated. 1 row updated.`);
    } else {
      finalInvoice = { ...invoiceData, id: invoiceData.id || generateUUID() };
      allInvoices.push(finalInvoice);
      logRlsAction('INSERT', `INSERT INTO invoices (id, tenant_id, number) VALUES ('${finalInvoice.id}', '${activeTenantId}', '${finalInvoice.number}')`, activeTenantId, 'ALLOWED', `RLS Insert policy validated. 1 row inserted.`);
    }
    setStore('onyx_invoices', allInvoices);
    
    // Background Sync to Supabase
    if (supabase) {
      supabase.from('invoices').upsert(finalInvoice).then(({ error }) => {
        if (error) console.error("❌ Synchro Supabase (invoices upsert) :", error.message);
        else console.log("🔄 Synchro Supabase (invoices upsert) : OK");
      });
    }
    
    return finalInvoice;
  },

  updateInvoiceStatus: (activeTenantId, invoiceId, newStatus) => {
    const allInvoices = getStore('onyx_invoices', DEFAULT_INVOICES);
    const idx = allInvoices.findIndex(inv => inv.id === invoiceId);
    if (idx === -1) throw new Error('Invoice not found');

    const invoice = allInvoices[idx];
    if (invoice.tenant_id !== activeTenantId) {
      logRlsAction('UPDATE', `UPDATE invoices SET status = '${newStatus}' WHERE id = '${invoiceId}'`, activeTenantId, 'DENIED', `SECURITY ALERT: Unauthorized update attempt.`);
      throw new Error('Permission Denied');
    }

    invoice.status = newStatus;
    allInvoices[idx] = invoice;
    setStore('onyx_invoices', allInvoices);

    logRlsAction('UPDATE', `UPDATE invoices SET status = '${newStatus}' WHERE id = '${invoiceId}'`, activeTenantId, 'ALLOWED', `RLS Update policy validated. 1 row updated.`);
    
    // Background Sync to Supabase
    if (supabase) {
      supabase.from('invoices').upsert(invoice).then(({ error }) => {
        if (error) console.error("❌ Synchro Supabase (invoices update) :", error.message);
        else console.log("🔄 Synchro Supabase (invoices update) : OK");
      });
    }
    
    return invoice;
  },

  // Dunning Logs
  getDunningLogs: (activeTenantId) => {
    const allLogs = getStore('onyx_dunning_logs', DEFAULT_LOGS);
    const filtered = allLogs.filter(log => log.tenant_id === activeTenantId);
    logRlsAction('SELECT', `SELECT * FROM dunning_logs WHERE tenant_id = '${activeTenantId}'`, activeTenantId, 'ALLOWED', `RLS Policy check passed. Returned ${filtered.length} log rows.`);
    return filtered;
  },

  createDunningLog: (activeTenantId, logData) => {
    const allLogs = getStore('onyx_dunning_logs', DEFAULT_LOGS);
    if (logData.tenant_id !== activeTenantId) {
      logRlsAction('INSERT', `INSERT INTO dunning_logs (tenant_id) VALUES ('${logData.tenant_id}')`, activeTenantId, 'DENIED', `SECURITY ALERT: Unauthorized log insertion.`);
      throw new Error('Permission Denied');
    }

    const newLog = { ...logData, id: `log_${Date.now()}` };
    allLogs.push(newLog);
    setStore('onyx_dunning_logs', allLogs);
    logRlsAction('INSERT', `INSERT INTO dunning_logs (id, tenant_id) VALUES ('${newLog.id}', '${activeTenantId}')`, activeTenantId, 'ALLOWED', `RLS Insert policy validated. 1 row inserted.`);
    return newLog;
  },

  // Customers (Gestion Clients)
  getCustomers: (activeTenantId) => {
    const allCustomers = getStore('onyx_customers', DEFAULT_CUSTOMERS);
    const filtered = allCustomers.filter(cust => cust.tenant_id === activeTenantId);
    logRlsAction('SELECT', `SELECT * FROM customers WHERE tenant_id = '${activeTenantId}'`, activeTenantId, 'ALLOWED', `RLS Policy check passed. Returned ${filtered.length} customers.`);
    return filtered;
  },

  createCustomer: (activeTenantId, customerData) => {
    const allCustomers = getStore('onyx_customers', DEFAULT_CUSTOMERS);
    if (customerData.tenant_id !== activeTenantId) {
      logRlsAction('INSERT', `INSERT INTO customers (tenant_id) VALUES ('${customerData.tenant_id}')`, activeTenantId, 'DENIED', `SECURITY ALERT: Tenant ID mismatch on customer insert.`);
      throw new Error('Permission Denied');
    }
    const newCustomer = { ...customerData, id: customerData.id || generateUUID() };
    allCustomers.push(newCustomer);
    setStore('onyx_customers', allCustomers);
    logRlsAction('INSERT', `INSERT INTO customers (id, tenant_id, name) VALUES ('${newCustomer.id}', '${activeTenantId}', '${newCustomer.name}')`, activeTenantId, 'ALLOWED', `RLS Insert passed.`);
    
    // Background Sync to Supabase
    if (supabase) {
      supabase.from('customers').upsert(newCustomer).then(({ error }) => {
        if (error) console.error("❌ Synchro Supabase (customers create) :", error.message);
        else console.log("🔄 Synchro Supabase (customers create) : OK");
      });
    }
    
    return newCustomer;
  },

  updateCustomer: (activeTenantId, customerData) => {
    const allCustomers = getStore('onyx_customers', DEFAULT_CUSTOMERS);
    const idx = allCustomers.findIndex(c => c.id === customerData.id);
    if (idx === -1) throw new Error('Customer not found');
    const existing = allCustomers[idx];
    if (existing.tenant_id !== activeTenantId || customerData.tenant_id !== activeTenantId) {
      logRlsAction('UPDATE', `UPDATE customers WHERE id = '${customerData.id}'`, activeTenantId, 'DENIED', `SECURITY ALERT: Tenant mismatch on customer update.`);
      throw new Error('Permission Denied');
    }
    allCustomers[idx] = { ...customerData };
    setStore('onyx_customers', allCustomers);
    logRlsAction('UPDATE', `UPDATE customers SET name = '${customerData.name}' WHERE id = '${customerData.id}'`, activeTenantId, 'ALLOWED', `RLS Update passed.`);
    
    // Background Sync to Supabase
    if (supabase) {
      supabase.from('customers').upsert(customerData).then(({ error }) => {
        if (error) console.error("❌ Synchro Supabase (customers update) :", error.message);
        else console.log("🔄 Synchro Supabase (customers update) : OK");
      });
    }
    
    return customerData;
  },

  deleteCustomer: (activeTenantId, customerId) => {
    const allCustomers = getStore('onyx_customers', DEFAULT_CUSTOMERS);
    const idx = allCustomers.findIndex(c => c.id === customerId);
    if (idx === -1) throw new Error('Customer not found');
    const existing = allCustomers[idx];
    if (existing.tenant_id !== activeTenantId) {
      logRlsAction('DELETE', `DELETE FROM customers WHERE id = '${customerId}'`, activeTenantId, 'DENIED', `SECURITY ALERT: Tenant mismatch on customer delete.`);
      throw new Error('Permission Denied');
    }
    const filtered = allCustomers.filter(c => c.id !== customerId);
    setStore('onyx_customers', filtered);
    logRlsAction('DELETE', `DELETE FROM customers WHERE id = '${customerId}'`, activeTenantId, 'ALLOWED', `RLS Delete passed.`);
    
    // Background Sync to Supabase
    if (supabase) {
      supabase.from('customers').delete().eq('id', customerId).then(({ error }) => {
        if (error) console.error("❌ Synchro Supabase (customers delete) :", error.message);
        else console.log("🔄 Synchro Supabase (customers delete) : OK");
      });
    }
    
    return existing;
  },

  // Company Settings
  getCompanySettings: (activeTenantId) => {
    const allSettings = getStore('onyx_company_settings', DEFAULT_COMPANY_SETTINGS);
    const settings = allSettings.find(s => s.tenant_id === activeTenantId);
    logRlsAction('SELECT', `SELECT * FROM company_settings WHERE tenant_id = '${activeTenantId}'`, activeTenantId, 'ALLOWED', `RLS check passed.`);
    return settings || null;
  },

  saveCompanySettings: (activeTenantId, settingsData) => {
    const allSettings = getStore('onyx_company_settings', DEFAULT_COMPANY_SETTINGS);
    if (settingsData.tenant_id !== activeTenantId) {
      logRlsAction('INSERT/UPDATE', `UPDATE company_settings`, activeTenantId, 'DENIED', `SECURITY ALERT: Tenant mismatch.`);
      throw new Error('Permission Denied');
    }
    const idx = allSettings.findIndex(s => s.tenant_id === activeTenantId);
    if (idx !== -1) {
      allSettings[idx] = { ...settingsData };
    } else {
      allSettings.push({ ...settingsData });
    }
    setStore('onyx_company_settings', allSettings);
    logRlsAction('INSERT/UPDATE', `UPSERT INTO company_settings`, activeTenantId, 'ALLOWED', `RLS passed.`);
    
    // Background Sync to Supabase
    if (supabase) {
      const sanitizedSettings = {
        tenant_id: settingsData.tenant_id,
        name: settingsData.name,
        address: settingsData.address || '',
        nif: settingsData.nif || '',
        rccm: settingsData.rccm || '',
        email: settingsData.email || '',
        phone: settingsData.phone || '',
        tva_rate: settingsData.tva_rate || 18,
        city: settingsData.city || 'Libreville',
        logoText: settingsData.logoText || ''
      };
      supabase.from('company_settings').upsert(sanitizedSettings).then(({ error }) => {
        if (error) console.error("❌ Synchro Supabase (company_settings) :", error.message);
        else console.log("🔄 Synchro Supabase (company_settings) : OK");
      });
    }
    
    return settingsData;
  },

  // Phase 4: Platform Administration Endpoints (SuperAdmin console)
  getTenantStatuses: () => {
    if (!sessionUser || sessionUser.role !== 'factory_admin') {
      logRlsAction('SELECT', `SELECT * FROM tenants_security_status`, 'SYSTEM_ADMIN', 'DENIED', `SECURITY ALERT: Unauthorized access attempt by ${sessionUser?.name || 'anonymous'}`);
      throw new Error('Permission Denied (Supabase RLS Policy violation: administrative privilege required)');
    }
    const statuses = getStore('onyx_tenant_statuses', DEFAULT_TENANT_STATUSES);
    logRlsAction('SELECT', `SELECT * FROM tenants_security_status`, 'SYSTEM_ADMIN', 'ALLOWED', 'SuperAdmin Query: Fetched tenant access states.');
    return statuses;
  },

  toggleTenantStatus: (tenantId) => {
    if (!sessionUser || sessionUser.role !== 'factory_admin') {
      logRlsAction('UPDATE', `UPDATE tenants_security_status`, 'SYSTEM_ADMIN', 'DENIED', `SECURITY ALERT: Unauthorized status toggle attempt by ${sessionUser?.name || 'anonymous'}`);
      throw new Error('Permission Denied (Supabase RLS Policy violation: administrative privilege required)');
    }
    const statuses = getStore('onyx_tenant_statuses', DEFAULT_TENANT_STATUSES);
    const current = statuses[tenantId] || 'actif';
    const nextStatus = current === 'actif' ? 'suspendu' : 'actif';
    
    statuses[tenantId] = nextStatus;
    setStore('onyx_tenant_statuses', statuses);

    logRlsAction(
      'UPDATE',
      `UPDATE tenants_security_status SET status = '${nextStatus}' WHERE tenant_id = '${tenantId}'`,
      'SYSTEM_ADMIN',
      'ALLOWED',
      `SuperAdmin Action: Access status for tenant '${tenantId}' modified to '${nextStatus}'.`
    );
    return nextStatus;
  },

  getPlatformMetrics: () => {
    if (!sessionUser || sessionUser.role !== 'factory_admin') {
      logRlsAction('SELECT', `SELECT * FROM platform_metrics`, 'SYSTEM_ADMIN', 'DENIED', `SECURITY ALERT: Unauthorized metrics read attempt by ${sessionUser?.name || 'anonymous'}`);
      throw new Error('Permission Denied (Supabase RLS Policy violation: administrative privilege required)');
    }
    logRlsAction('SELECT', `SELECT * FROM platform_metrics`, 'SYSTEM_ADMIN', 'ALLOWED', 'SuperAdmin Query: Fetched technical performance counters.');
    return {
      uptime: '99.8%',
      apiLatency: '42 ms',
      totalStorage: '184 Go',
      failedLogins: 12
    };
  },

  getDeploymentLogs: () => {
    if (!sessionUser || sessionUser.role !== 'factory_admin') {
      logRlsAction('SELECT', `SELECT * FROM deployment_logs`, 'SYSTEM_ADMIN', 'DENIED', `SECURITY ALERT: Unauthorized logs read attempt by ${sessionUser?.name || 'anonymous'}`);
      throw new Error('Permission Denied (Supabase RLS Policy violation: administrative privilege required)');
    }
    logRlsAction('SELECT', `SELECT * FROM deployment_logs`, 'SYSTEM_ADMIN', 'ALLOWED', 'SuperAdmin Query: Fetched system update logs.');
    return DEFAULT_DEPLOYMENT_LOGS;
  },

  registerUser: (email) => {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    
    // Generate a simple, clean, human-readable ID for the tenant (e.g. onyx-4829)
    const generatedTenantId = `onyx-${randomSuffix}`;
    
    // Register status as active initially
    const statuses = getStore('onyx_tenant_statuses', DEFAULT_TENANT_STATUSES);
    statuses[generatedTenantId] = 'actif';
    setStore('onyx_tenant_statuses', statuses);

    logRlsAction(
      'TRIGGER',
      `CREATE TRIGGER trigger_on_auth_signup AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION create_auto_tenant()`,
      'SYSTEM',
      'ALLOWED',
      `AUTOMATION TRIGGERED: Auth signup for user ${email}. Created tenant_id '${generatedTenantId}' in table tenants.`
    );

    return {
      email,
      tenant_id: generatedTenantId,
      temp_user_id: `usr_${randomSuffix}`
    };
  },

  // Phase 5: Subscription status verification engine
  // Runs on every tenant load — simulates a daily cron job on the backend
  checkSubscriptionStatus: (tenantId) => {
    const allSubs = getStore('onyx_subscriptions', DEFAULT_SUBSCRIPTION_DATA);
    const sub = allSubs[tenantId];
    if (!sub) return { subscription_status: 'active', daysUntilExpiry: 999 };

    const now = new Date();
    const endDate = new Date(sub.subscription_end_date);
    const msPerDay = 1000 * 60 * 60 * 24;
    const diffDays = Math.ceil((endDate - now) / msPerDay);

    let computedStatus;
    if (diffDays > 0) {
      computedStatus = 'active';
    } else if (diffDays > -7) {
      // Between 0 and -7 days: grace period (7-day window after expiry)
      computedStatus = 'grace_period';
    } else {
      // More than 7 days past expiry: fully suspended
      computedStatus = 'suspended';
    }

    // Persist the computed status back (simulates Supabase Edge Function cron)
    if (computedStatus !== sub.subscription_status) {
      allSubs[tenantId].subscription_status = computedStatus;
      setStore('onyx_subscriptions', allSubs);
      logRlsAction(
        'UPDATE',
        `UPDATE tenants SET subscription_status = '${computedStatus}' WHERE id = '${tenantId}'`,
        'SYSTEM_CRON',
        'ALLOWED',
        `[CRON] Subscription checker: tenant '${tenantId}' auto-transitioned to '${computedStatus}' (days remaining: ${diffDays}).`
      );
    }

    return {
      subscription_status: computedStatus,
      subscription_end_date: sub.subscription_end_date,
      daysUntilExpiry: diffDays
    };
  },

  renewSubscription: (tenantId, months = 1) => {
    const allSubs = getStore('onyx_subscriptions', DEFAULT_SUBSCRIPTION_DATA);
    const sub = allSubs[tenantId];

    // Calculate new end date: take current end date (or today if suspended) and add X months
    const baseDate = sub?.subscription_end_date ? new Date(sub.subscription_end_date) : new Date();
    // If subscription has been expired for more than 7 days (suspended), start from today
    const now = new Date();
    const diffDays = Math.ceil((baseDate - now) / (1000 * 60 * 60 * 24));
    const startFrom = diffDays < -7 ? new Date() : baseDate;

    // Add months mathematically
    startFrom.setMonth(startFrom.getMonth() + months);
    const newEndDate = startFrom.toISOString();
    const newDaysRemaining = Math.ceil((startFrom - now) / (1000 * 60 * 60 * 24));

    allSubs[tenantId] = {
      subscription_status: 'active',
      subscription_end_date: newEndDate
    };
    setStore('onyx_subscriptions', allSubs);

    logRlsAction(
      'UPDATE',
      `UPDATE tenants SET subscription_status = 'active', subscription_end_date = '${newEndDate}' WHERE id = '${tenantId}'`,
      tenantId,
      'ALLOWED',
      `Subscription renewed for tenant '${tenantId}' by ${months} month(s). New expiry: ${newEndDate}.`
    );
    return { subscription_status: 'active', subscription_end_date: newEndDate, daysUntilExpiry: newDaysRemaining };
  },

  // Return raw subscription data (dates + status) for all tenants — used by AdminConsole only
  getAllSubscriptions: () => {
    logRlsAction('SELECT', 'SELECT * FROM tenants_subscriptions', 'SYSTEM_ADMIN', 'ALLOWED', 'SuperAdmin: Fetched all subscription records.');
    return getStore('onyx_subscriptions', DEFAULT_SUBSCRIPTION_DATA);
  },

  // ─── Audit Logs (tenant-scoped, RLS enforced) ──────────────────────────────
  getAuditLogs: (activeTenantId) => {
    const allLogs = getStore('onyx_audit_logs', []);
    // RLS: client can only see their own tenant's logs
    const filtered = allLogs.filter(log =>
      log.tenant_id === activeTenantId || log.tenant_id === 'SYSTEM_CRON'
    );
    logRlsAction(
      'SELECT',
      `SELECT * FROM audit_logs WHERE tenant_id = '${activeTenantId}'`,
      activeTenantId,
      'ALLOWED',
      `RLS check passed. Returned ${filtered.length} audit log entries.`
    );
    return filtered;
  },

  // ─── Data Export (CSV, RLS-compliant) ─────────────────────────────────────
  exportTenantData: (activeTenantId) => {
    const allInvoices = getStore('onyx_invoices', []);
    const allCustomers = getStore('onyx_customers', []);

    // RLS enforcement: filter strictly by tenant_id
    const invoices = allInvoices.filter(inv => inv.tenant_id === activeTenantId);
    const customers = allCustomers.filter(cust => cust.tenant_id === activeTenantId);

    logRlsAction(
      'SELECT',
      `SELECT * FROM invoices,customers WHERE tenant_id = '${activeTenantId}'`,
      activeTenantId,
      'ALLOWED',
      `Data export authorized for tenant '${activeTenantId}': ${invoices.length} invoices, ${customers.length} customers.`
    );

    // Build CSV string for clients
    const clientRows = [
      ['ID', 'Nom', 'Email', 'Téléphone', 'NIF', 'Adresse'].join(';'),
      ...customers.map(c => [c.id, c.name, c.email, c.phone || '', c.nif || '', c.address || ''].join(';'))
    ].join('\n');

    // Build CSV string for invoices
    const invoiceRows = [
      ['Numéro', 'Type', 'Client', 'Date', 'Échéance', 'Statut', 'Montant (FCFA)'].join(';'),
      ...invoices.map(inv => [
        inv.number, inv.type, inv.client_name,
        inv.date, inv.due_date, inv.status,
        inv.amount
      ].join(';'))
    ].join('\n');

    return {
      clients: clientRows,
      factures: invoiceRows,
      timestamp: new Date().toISOString(),
      tenantId: activeTenantId
    };
  },

  // ─── Team Members Management (Phase 6, tenant-scoped, RLS enforced) ──────
  getTeamMembers: (activeTenantId) => {
    const allMembers = getStore('onyx_team_members', DEFAULT_TEAM_MEMBERS);
    const filtered = allMembers.filter(m => m.tenant_id === activeTenantId);
    logRlsAction('SELECT', `SELECT * FROM team_members WHERE tenant_id = '${activeTenantId}'`, activeTenantId, 'ALLOWED', `RLS checked. Loaded ${filtered.length} team members.`);
    return filtered;
  },

  addTeamMember: (activeTenantId, memberData) => {
    const allMembers = getStore('onyx_team_members', DEFAULT_TEAM_MEMBERS);
    if (memberData.tenant_id !== activeTenantId) {
      logRlsAction('INSERT', `INSERT INTO team_members`, activeTenantId, 'DENIED', `SECURITY ALERT: tenant_id mismatch.`);
      throw new Error('Permission Denied (RLS policy violation)');
    }
    const newMember = { ...memberData, id: `tm_${Date.now()}` };
    allMembers.push(newMember);
    setStore('onyx_team_members', allMembers);
    logRlsAction('INSERT', `INSERT INTO team_members (name, role, access) VALUES ('${newMember.name}', '${newMember.role}', '${newMember.access_level}')`, activeTenantId, 'ALLOWED', `Team member added successfully.`);
    return newMember;
  },

  deleteTeamMember: (activeTenantId, memberId) => {
    const allMembers = getStore('onyx_team_members', DEFAULT_TEAM_MEMBERS);
    const idx = allMembers.findIndex(m => m.id === memberId);
    if (idx === -1) throw new Error('Member not found');
    if (allMembers[idx].tenant_id !== activeTenantId) {
      logRlsAction('DELETE', `DELETE FROM team_members WHERE id = '${memberId}'`, activeTenantId, 'DENIED', `SECURITY ALERT: tenant_id mismatch.`);
      throw new Error('Permission Denied (RLS policy violation)');
    }
    allMembers.splice(idx, 1);
    setStore('onyx_team_members', allMembers);
    logRlsAction('DELETE', `DELETE FROM team_members WHERE id = '${memberId}'`, activeTenantId, 'ALLOWED', `Team member deleted successfully.`);
    return true;
  }
};
