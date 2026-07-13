import React, { useState, useEffect } from 'react';
import { useTenant } from '../context/TenantContext';
import { supabaseSim } from '../utils/supabaseSim';
import { translations } from '../utils/translations';

export const Settings = () => {
  const { 
    activeTenant, 
    syncTrigger,
    language,
    setLanguage,
    theme,
    setTheme,
    deleteOwnAccount
  } = useTenant();
  const [activeTab, setActiveTab] = useState('profil');

  const t = (key, params = {}) => {
    let text = translations[language]?.[key] || translations['fr']?.[key] || key;
    Object.keys(params).forEach(k => {
      text = text.replace(`{${k}}`, params[k]);
    });
    return text;
  };

  // Profil Form State
  const [companyName, setCompanyName] = useState('');
  const [address, setAddress] = useState('');
  const [nif, setNif] = useState('');
  const [rccm, setRccm] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [logoUploaded, setLogoUploaded] = useState(false);
  const [logoName, setLogoName] = useState('');
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [tvaRate, setTvaRate] = useState(18);

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState([]);

  // Team Management State
  const [teamMembers, setTeamMembers] = useState([]);
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberRole, setNewMemberRole] = useState('Comptable');
  const [newMemberAccess, setNewMemberAccess] = useState('modification');

  useEffect(() => {
    loadSettings();
  }, [activeTenant, syncTrigger]);

  const loadSettings = () => {
    const existing = supabaseSim.getCompanySettings(activeTenant.id);
    if (existing) {
      setCompanyName(existing.name || '');
      setAddress(existing.address || '');
      setNif(existing.nif || '');
      setRccm(existing.rccm || '');
      setContactEmail(existing.email || '');
      setPhone(existing.phone || '');
      setTvaRate(existing.tva_rate !== undefined ? existing.tva_rate : 18);
    }
    if (activeTab === 'audit') {
      setAuditLogs(supabaseSim.getAuditLogs(activeTenant.id));
    } else if (activeTab === 'team') {
      setTeamMembers(supabaseSim.getTeamMembers(activeTenant.id));
    }
  };

  useEffect(() => {
    if (activeTab === 'audit') {
      setAuditLogs(supabaseSim.getAuditLogs(activeTenant.id));
    } else if (activeTab === 'team') {
      setTeamMembers(supabaseSim.getTeamMembers(activeTenant.id));
    }
  }, [activeTab, activeTenant, syncTrigger]);

  const handleSaveProfil = (e) => {
    e.preventDefault();
    if (!companyName) {
      alert('Le champ Nom de la société est obligatoire.');
      return;
    }
    supabaseSim.saveCompanySettings(activeTenant.id, {
      tenant_id: activeTenant.id,
      name: companyName,
      address,
      nif,
      rccm,
      email: contactEmail,
      phone,
      tva_rate: parseInt(tvaRate) || 18,
      logoText: companyName.slice(0, 3).toUpperCase()
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setLogoUploaded(true);
      setLogoName(file.name);
    }
  };

  const handleExportCSV = (type) => {
    const exportData = supabaseSim.exportTenantData(activeTenant.id);
    const content = type === 'clients' ? exportData.clients : exportData.factures;
    const filename = `onyx-${type}-${activeTenant.id}-${new Date().toISOString().split('T')[0]}.csv`;

    const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleAddMember = (e) => {
    e.preventDefault();
    if (!newMemberName || !newMemberEmail) return;

    const newMember = {
      tenant_id: activeTenant.id,
      name: newMemberName,
      email: newMemberEmail,
      role: newMemberRole,
      access_level: newMemberAccess
    };

    try {
      supabaseSim.addTeamMember(activeTenant.id, newMember);
      setTeamMembers(supabaseSim.getTeamMembers(activeTenant.id));
      setNewMemberName('');
      setNewMemberEmail('');
      setNewMemberRole('Comptable');
      setNewMemberAccess('modification');
      alert('✅ Nouveau collaborateur invité avec succès !');
    } catch (err) {
      console.error(err);
      alert("Une erreur de traitement s'est produite lors de l'ajout du collaborateur.");
    }
  };

  const handleDeleteMember = (memberId) => {
    if (window.confirm('Voulez-vous vraiment retirer ce collaborateur de votre équipe ?')) {
      try {
        supabaseSim.deleteTeamMember(activeTenant.id, memberId);
        setTeamMembers(supabaseSim.getTeamMembers(activeTenant.id));
      } catch (err) {
        console.error(err);
        alert("Une erreur est survenue lors du retrait du collaborateur.");
      }
    }
  };

  const formatDate = (iso) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('fr-GA');
  };

  const getActionColor = (action) => {
    switch (action) {
      case 'INSERT': return '#10B981';
      case 'UPDATE': return '#F59E0B';
      case 'DELETE': return '#EF4444';
      case 'TRIGGER': return '#3B82F6';
      default: return '#9CA3AF';
    }
  };

  const tabs = [
    { id: 'profil', label: t('set_tab_profile') },
    { id: 'team', label: t('set_tab_team') },
    { id: 'export', label: t('set_tab_export') },
    { id: 'audit', label: t('set_tab_audit') },
    { id: 'preferences', label: t('set_tab_preferences') },
    { id: 'danger', label: t('set_tab_danger') }
  ];

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Paramètres</h1>
          <p style={styles.subtitle}>Gérez votre profil d'entreprise, les accès collaborateurs, exportez vos données et consultez l'activité.</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div style={styles.tabBar}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              ...styles.tabBtn,
              ...(activeTab === tab.id ? styles.tabBtnActive : {})
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ─────────────────────────── TAB 1: Profil Entreprise ─── */}
      {activeTab === 'profil' && (
        <div style={styles.tabContent}>
          <div style={styles.splitLayout}>
            <div className="onyx-card" style={styles.card}>
              <h3 style={styles.cardTitle}>Informations Légales</h3>
              <form onSubmit={handleSaveProfil} style={styles.form}>
                <div>
                  <label className="onyx-label">Nom de la société *</label>
                  <input
                    type="text"
                    className="onyx-input"
                    placeholder="ex: Gabon Distribution S.A."
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    required
                  />
                </div>

                <div style={styles.row}>
                  <div style={styles.col}>
                    <label className="onyx-label">NIF (facultatif)</label>
                    <input
                      type="text"
                      className="onyx-input data-mono"
                      placeholder="ex: 078945A"
                      value={nif}
                      onChange={(e) => setNif(e.target.value)}
                    />
                  </div>
                  <div style={styles.col}>
                    <label className="onyx-label">RCCM (facultatif)</label>
                    <input
                      type="text"
                      className="onyx-input data-mono"
                      placeholder="ex: RG-LBV-2026-B-88"
                      value={rccm}
                      onChange={(e) => setRccm(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="onyx-label">Adresse physique</label>
                  <input
                    type="text"
                    className="onyx-input"
                    placeholder="Quartier, Boulevard, Ville..."
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                  />
                </div>

                <div style={styles.row}>
                  <div style={styles.col}>
                    <label className="onyx-label">Email de contact</label>
                    <input
                      type="email"
                      className="onyx-input"
                      placeholder="contact@societe.ga"
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                    />
                  </div>
                  <div style={styles.col}>
                    <label className="onyx-label">Téléphone</label>
                    <input
                      type="text"
                      className="onyx-input"
                      placeholder="+241 077 00 00 00"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>
                </div>

                <div style={styles.row}>
                  <div style={styles.col}>
                    <label className="onyx-label">Taux de TVA fiscale (%)</label>
                    <input
                      type="number"
                      className="onyx-input data-mono"
                      min="0"
                      max="100"
                      placeholder="18"
                      value={tvaRate}
                      onChange={(e) => setTvaRate(e.target.value)}
                    />
                  </div>
                  <div style={styles.col}>
                    <label className="onyx-label">Devise par défaut</label>
                    <input
                      type="text"
                      className="onyx-input"
                      value="FCFA (XAF)"
                      disabled
                      style={{ opacity: 0.7, cursor: 'not-allowed' }}
                    />
                  </div>
                </div>

                {/* Logo Upload */}
                <div>
                  <label className="onyx-label">Logo de l'entreprise (Supabase Storage)</label>
                  <div style={styles.uploadBox}>
                    <input
                      type="file"
                      id="settings-logo"
                      onChange={handleLogoUpload}
                      accept="image/*"
                      style={{ display: 'none' }}
                    />
                    <label htmlFor="settings-logo" style={styles.uploadLabel}>
                      {logoUploaded ? (
                        <span style={{ color: '#10B981' }}>✅ {logoName} — Logo enregistré dans Supabase Storage</span>
                      ) : (
                        <span>📁 Cliquer pour choisir un logo (PNG, JPG)</span>
                      )}
                    </label>
                  </div>
                </div>

                {savedSuccess && (
                  <div style={styles.successMsg}>
                    ✅ Profil enregistré avec succès dans la table company_settings !
                  </div>
                )}

                <button type="submit" className="btn-success" style={{ justifyContent: 'center', marginTop: '8px' }}>
                  Enregistrer le profil
                </button>
              </form>
            </div>

            {/* Live Preview Card */}
            <div className="onyx-card" style={styles.previewCard}>
              <h3 style={styles.cardTitle}>Aperçu — En-tête Facture</h3>
              <div style={styles.invoicePreview}>
                <div style={styles.previewAvatar}>{companyName ? companyName.slice(0, 3).toUpperCase() : '???'}</div>
                <div style={styles.previewCompanyName}>{companyName || 'Nom de la Société'}</div>
                {address && <div style={styles.previewLine}>{address}</div>}
                {nif && <div style={styles.previewLine}>NIF : <span style={styles.previewMono}>{nif}</span></div>}
                {rccm && <div style={styles.previewLine}>RCCM : <span style={styles.previewMono}>{rccm}</span></div>}
                {contactEmail && <div style={styles.previewLine}>{contactEmail}</div>}
                {phone && <div style={styles.previewLine}>{phone}</div>}
                <div style={styles.previewNote}>
                  ↳ Ces informations seront automatiquement injectées dans vos modèles de factures et devis.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────── TAB 2: Gestion de l'Équipe ─── */}
      {activeTab === 'team' && (
        <div style={styles.tabContent}>
          <div style={styles.splitLayout}>
            {/* Team Members List */}
            <div className="onyx-card" style={styles.card}>
              <h3 style={styles.cardTitle}>Membres de l'Équipe ({teamMembers.length})</h3>
              <div style={styles.tableWrapper}>
                <table style={styles.auditTable}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Collaborateur</th>
                      <th style={styles.th}>Rôle</th>
                      <th style={styles.th}>Accès</th>
                      <th style={{ ...styles.th, textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teamMembers.length > 0 ? (
                      teamMembers.map(m => (
                        <tr key={m.id} style={styles.auditRow}>
                          <td style={styles.auditTd}>
                            <div style={{ fontWeight: '600', color: '#FFFFFF', fontSize: '0.88rem' }}>{m.name}</div>
                            <div style={{ fontSize: '0.75rem', color: '#6B7280', marginTop: '2px' }}>{m.email}</div>
                          </td>
                          <td style={styles.auditTd}>
                            <span style={styles.roleBadge}>{m.role}</span>
                          </td>
                          <td style={styles.auditTd}>
                            <span style={{
                              ...styles.actionBadge,
                              color: m.access_level === 'modification' ? '#10B981' : '#3B82F6',
                              backgroundColor: m.access_level === 'modification' ? 'rgba(16, 185, 129, 0.08)' : 'rgba(59, 130, 246, 0.08)',
                              borderColor: m.access_level === 'modification' ? 'rgba(16, 185, 129, 0.25)' : 'rgba(59, 130, 246, 0.25)'
                            }}>
                              {m.access_level === 'modification' ? 'Modification' : 'Lecture seule'}
                            </span>
                          </td>
                          <td style={{ ...styles.auditTd, textAlign: 'right' }}>
                            <button
                              onClick={() => handleDeleteMember(m.id)}
                              style={styles.btnDeleteMember}
                              title="Retirer ce membre de l'équipe"
                            >
                              Retirer
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="4" style={styles.emptyState}>Aucun collaborateur enregistré.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Add Team Member Card */}
            <div className="onyx-card" style={styles.previewCard}>
              <h3 style={styles.cardTitle}>➕ Inviter un Collaborateur</h3>
              <form onSubmit={handleAddMember} style={styles.form}>
                <div>
                  <label className="onyx-label">Nom complet</label>
                  <input
                    type="text"
                    className="onyx-input"
                    placeholder="ex: Jean-Marc Ondo"
                    value={newMemberName}
                    onChange={(e) => setNewMemberName(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="onyx-label">Adresse courriel</label>
                  <input
                    type="email"
                    className="onyx-input"
                    placeholder="ex: jm.ondo@entreprise.ga"
                    value={newMemberEmail}
                    onChange={(e) => setNewMemberEmail(e.target.value)}
                    required
                  />
                </div>

                <div style={styles.row}>
                  <div style={styles.col}>
                    <label className="onyx-label">Rôle</label>
                    <select
                      className="onyx-select"
                      value={newMemberRole}
                      onChange={(e) => setNewMemberRole(e.target.value)}
                    >
                      <option value="Comptable">Comptable</option>
                      <option value="Commercial">Commercial</option>
                      <option value="Consultant">Consultant</option>
                    </select>
                  </div>
                  <div style={styles.col}>
                    <label className="onyx-label">Niveau d'Accès</label>
                    <select
                      className="onyx-select"
                      value={newMemberAccess}
                      onChange={(e) => setNewMemberAccess(e.target.value)}
                    >
                      <option value="modification">Modification (Écriture)</option>
                      <option value="read_only">Lecture seule</option>
                    </select>
                  </div>
                </div>

                <button type="submit" className="btn-success" style={{ justifyContent: 'center', marginTop: '12px', width: '100%' }}>
                  Inviter le collaborateur
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────── TAB 3: Export de Données ─── */}
      {activeTab === 'export' && (
        <div style={styles.tabContent}>
          <div style={styles.exportGrid}>
            {/* Export Clients */}
            <div className="onyx-card" style={styles.exportCard}>
              <div style={styles.exportIcon}>👥</div>
              <h3 style={styles.exportTitle}>Annuaire Clients</h3>
              <p style={styles.exportDesc}>
                Exportez la liste complète de vos clients enregistrés (nom, email, NIF, adresse). 
                Seules les données de votre entreprise sont incluses.
              </p>
              <div style={styles.exportMeta}>
                <span style={styles.metaBadge}>Format CSV (UTF-8)</span>
                <span style={styles.metaBadge}>Isolé par tenant_id</span>
              </div>
              <button onClick={() => handleExportCSV('clients')} style={styles.btnExport}>
                ⬇ Exporter les Clients
              </button>
            </div>

            {/* Export Factures */}
            <div className="onyx-card" style={styles.exportCard}>
              <div style={styles.exportIcon}>📄</div>
              <h3 style={styles.exportTitle}>Historique des Factures</h3>
              <p style={styles.exportDesc}>
                Exportez l'intégralité de vos factures et devis (numéro, date, client, statut, montant en FCFA).
              </p>
              <div style={styles.exportMeta}>
                <span style={styles.metaBadge}>Format CSV (UTF-8)</span>
                <span style={styles.metaBadge}>Protection RLS active</span>
              </div>
              <button onClick={() => handleExportCSV('factures')} style={styles.btnExport}>
                ⬇ Exporter les Factures
              </button>
            </div>

            {/* RGPD Note */}
            <div style={styles.gdprNote}>
              <span style={styles.gdprIcon}>🛡️</span>
              <div>
                <strong style={{ color: '#FFFFFF' }}>Transparence & Protection des Données</strong>
                <p style={styles.gdprText}>
                  Conformément aux principes de protection des données, chaque export est strictement isolé par votre identifiant unique <code style={{ color: '#D4AF37' }}>tenant_id</code>. 
                  Aucune donnée d'autres entreprises n'est accessible ni exportable depuis votre espace.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────── TAB 4: Journal d'Audit ─── */}
      {activeTab === 'audit' && (
        <div style={styles.tabContent}>
          <div className="onyx-card">
            <div style={styles.auditHeader}>
              <h3 style={styles.cardTitle}>Journal d'Audit — Traçabilité des Actions</h3>
              <span style={styles.auditCount}>{auditLogs.length} entrée{auditLogs.length !== 1 ? 's' : ''}</span>
            </div>

            {auditLogs.length === 0 ? (
              <div style={styles.emptyAudit}>
                <span style={{ fontSize: '2rem' }}>🔍</span>
                <p>Aucune action enregistrée pour le moment. Les créations, modifications et suppressions de documents apparaîtront ici.</p>
              </div>
            ) : (
              <div style={styles.tableWrapper}>
                <table style={styles.auditTable}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Horodatage</th>
                      <th style={styles.th}>Action</th>
                      <th style={styles.th}>Table Cible</th>
                      <th style={styles.th}>Détails</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.map(log => (
                      <tr key={log.id} style={styles.auditRow}>
                        <td className="data-mono" style={{ ...styles.auditTd, fontSize: '0.78rem', color: '#6B7280', whiteSpace: 'nowrap' }}>
                          {formatDate(log.timestamp)}
                        </td>
                        <td style={styles.auditTd}>
                          <span style={{
                            ...styles.actionBadge,
                            color: getActionColor(log.action),
                            backgroundColor: `${getActionColor(log.action)}18`,
                            borderColor: `${getActionColor(log.action)}40`
                          }}>
                            {log.action}
                          </span>
                        </td>
                        <td className="data-mono" style={{ ...styles.auditTd, color: '#D4AF37', fontSize: '0.82rem' }}>
                          {log.target_table}
                        </td>
                        <td style={{ ...styles.auditTd, fontSize: '0.82rem', color: '#9CA3AF', maxWidth: '380px' }}>
                          {log.details}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─────────────────────────── TAB 5: Préférences ─── */}
      {activeTab === 'preferences' && (
        <div style={styles.tabContent}>
          <div className="onyx-card" style={styles.card}>
            <h3 style={styles.cardTitle}>{t('set_tab_preferences')}</h3>
            <div style={styles.form}>
              <div>
                <label className="onyx-label">{t('set_lang_select')}</label>
                <select
                  className="onyx-select"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                >
                  <option value="fr">Français (French)</option>
                  <option value="en">English (Anglais)</option>
                </select>
              </div>

              <div>
                <label className="onyx-label">{t('set_theme_select')}</label>
                <select
                  className="onyx-select"
                  value={theme}
                  onChange={(e) => setTheme(e.target.value)}
                >
                  <option value="dark">{t('set_theme_dark')}</option>
                  <option value="light">{t('set_theme_light')}</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────── TAB 6: Zone de Danger ─── */}
      {activeTab === 'danger' && (
        <div style={styles.tabContent}>
          <div className="onyx-card" style={{ ...styles.card, borderColor: '#EF4444' }}>
            <h3 style={{ ...styles.cardTitle, color: '#EF4444' }}>{t('set_danger_title')}</h3>
            <p style={{ color: '#EF4444', fontSize: '0.9rem', lineHeight: '1.6' }}>
              {t('set_danger_desc')}
            </p>
            <div style={{ marginTop: '16px' }}>
              <button
                onClick={async () => {
                  if (window.confirm(t('set_delete_confirm_msg'))) {
                    if (window.confirm(language === 'en' ? 'FINAL CONFIRMATION: This will permanently delete your account. Proceed?' : 'CONFIRMATION FINALE : Cette action supprimera définitivement votre compte. Continuer ?')) {
                      try {
                        await deleteOwnAccount();
                        alert(language === 'en' ? 'Account successfully deleted.' : 'Compte supprimé avec succès.');
                      } catch (err) {
                        alert(t('error_occurred') + ': ' + err.message);
                      }
                    }
                  }
                }}
                className="btn-primary"
                style={{ backgroundColor: '#EF4444', color: '#FFFFFF', borderColor: '#EF4444', fontWeight: '700' }}
              >
                ⚠️ {t('set_delete_btn')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: { display: 'flex', flexDirection: 'column', gap: '24px', width: '100%' },
  header: {
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    paddingBottom: '16px'
  },
  title: { fontSize: '1.8rem', marginBottom: '4px' },
  subtitle: { fontSize: '0.9rem', color: 'var(--color-text-secondary)' },
  tabBar: {
    display: 'flex',
    gap: '4px',
    backgroundColor: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: '8px',
    padding: '4px'
  },
  tabBtn: {
    flex: 1,
    padding: '8px 14px',
    background: 'none',
    border: 'none',
    color: 'var(--color-text-secondary)',
    fontSize: '0.88rem',
    fontWeight: '500',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  },
  tabBtnActive: {
    backgroundColor: 'rgba(212, 175, 55, 0.1)',
    color: '#D4AF37',
    fontWeight: '700',
    boxShadow: '0 0 0 1px rgba(212, 175, 55, 0.25)'
  },
  tabContent: { display: 'flex', flexDirection: 'column', gap: '20px' },
  splitLayout: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' },
  card: { display: 'flex', flexDirection: 'column', gap: '16px' },
  cardTitle: {
    fontSize: '1.05rem', fontWeight: '700', color: '#D4AF37',
    borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '10px', margin: 0
  },
  form: { display: 'flex', flexDirection: 'column', gap: '16px' },
  row: { display: 'flex', gap: '12px' },
  col: { flex: 1 },
  uploadBox: {
    border: '1px dashed rgba(255,255,255,0.15)',
    borderRadius: '6px',
    padding: '16px',
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)'
  },
  uploadLabel: {
    cursor: 'pointer',
    fontSize: '0.85rem',
    color: '#9CA3AF',
    display: 'block'
  },
  successMsg: {
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    border: '1px solid rgba(16, 185, 129, 0.2)',
    borderRadius: '6px',
    padding: '10px 14px',
    color: '#10B981',
    fontSize: '0.88rem'
  },
  previewCard: { display: 'flex', flexDirection: 'column', gap: '16px', alignSelf: 'start' },
  invoicePreview: {
    backgroundColor: '#1A1A1A',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: '8px',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  previewAvatar: {
    width: '48px',
    height: '48px',
    borderRadius: '8px',
    backgroundColor: 'rgba(212, 175, 55, 0.12)',
    color: '#D4AF37',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: '800',
    fontSize: '1rem',
    marginBottom: '8px'
  },
  previewCompanyName: { color: '#FFFFFF', fontWeight: '700', fontSize: '1.1rem' },
  previewLine: { color: '#9CA3AF', fontSize: '0.85rem' },
  previewMono: { fontFamily: 'monospace', color: '#D4AF37' },
  previewNote: {
    marginTop: '12px',
    fontSize: '0.75rem',
    color: '#4B5563',
    fontStyle: 'italic',
    borderTop: '1px dashed rgba(255,255,255,0.06)',
    paddingTop: '10px'
  },

  // Export Tab
  exportGrid: { display: 'flex', flexDirection: 'column', gap: '20px' },
  exportCard: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  exportIcon: { fontSize: '2rem' },
  exportTitle: { fontSize: '1.1rem', fontWeight: '700', color: '#FFFFFF', margin: 0 },
  exportDesc: { fontSize: '0.88rem', color: '#9CA3AF', lineHeight: '1.6', margin: 0 },
  exportMeta: { display: 'flex', gap: '8px', flexWrap: 'wrap' },
  metaBadge: {
    fontSize: '0.72rem',
    backgroundColor: 'rgba(59, 130, 246, 0.08)',
    color: '#3B82F6',
    border: '1px solid rgba(59, 130, 246, 0.2)',
    borderRadius: '4px',
    padding: '2px 8px',
    fontWeight: '600'
  },
  btnExport: {
    alignSelf: 'flex-start',
    backgroundColor: '#D4AF37',
    color: '#0A0A0A',
    border: 'none',
    borderRadius: '6px',
    padding: '10px 18px',
    fontSize: '0.9rem',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'opacity 0.2s ease'
  },
  gdprNote: {
    display: 'flex',
    gap: '14px',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(212, 175, 55, 0.04)',
    border: '1px solid rgba(212, 175, 55, 0.12)',
    borderRadius: '8px',
    padding: '16px'
  },
  gdprIcon: { fontSize: '1.5rem', flexShrink: 0 },
  gdprText: { color: '#6B7280', fontSize: '0.85rem', lineHeight: '1.6', margin: '6px 0 0 0' },

  // Audit Tab
  auditHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px'
  },
  auditCount: {
    fontSize: '0.8rem',
    color: '#6B7280',
    backgroundColor: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: '4px',
    padding: '2px 8px'
  },
  emptyAudit: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px',
    padding: '40px',
    color: '#4B5563',
    fontSize: '0.9rem',
    textAlign: 'center'
  },
  tableWrapper: { overflowX: 'auto' },
  auditTable: { width: '100%', borderCollapse: 'collapse' },
  th: {
    padding: '10px 12px',
    fontSize: '0.75rem',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: '#6B7280',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
    textAlign: 'left',
    fontWeight: '500'
  },
  auditRow: {
    borderBottom: '1px solid rgba(255,255,255,0.03)'
  },
  auditTd: {
    padding: '12px',
    verticalAlign: 'middle'
  },
  actionBadge: {
    display: 'inline-block',
    padding: '2px 8px',
    borderRadius: '4px',
    fontSize: '0.72rem',
    fontWeight: '700',
    border: '1px solid',
    letterSpacing: '0.06em'
  },

  // Team Tab specific styles
  roleBadge: {
    display: 'inline-block',
    padding: '3px 8px',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    borderRadius: '4px',
    color: '#E0E0E0',
    fontSize: '0.75rem',
    fontWeight: '600'
  },
  btnDeleteMember: {
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    color: '#EF4444',
    border: '1px solid rgba(239, 68, 68, 0.25)',
    borderRadius: '6px',
    padding: '4px 10px',
    fontSize: '0.78rem',
    cursor: 'pointer',
    fontWeight: '600',
    transition: 'all 0.2s ease'
  },
  emptyState: {
    textAlign: 'center',
    padding: '24px 0',
    color: '#6B7280',
    fontSize: '0.88rem'
  }
};
