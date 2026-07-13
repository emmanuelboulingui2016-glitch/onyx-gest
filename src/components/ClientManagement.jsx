import React, { useState, useEffect } from 'react';
import { useTenant } from '../context/TenantContext';
import { supabaseSim } from '../utils/supabaseSim';

export const ClientManagement = () => {
  const { activeTenant, syncTrigger } = useTenant();
  const [customers, setCustomers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Form State
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [nif, setNif] = useState('');

  useEffect(() => {
    loadCustomers();
  }, [activeTenant, syncTrigger]);

  const loadCustomers = () => {
    try {
      const data = supabaseSim.getCustomers(activeTenant.id);
      setCustomers(data);
    } catch (err) {
      console.error(err);
      alert("Une erreur est survenue lors du chargement des clients.");
    }
  };

  const handleResetForm = () => {
    setIsEditing(false);
    setEditingId(null);
    setName('');
    setEmail('');
    setPhone('');
    setAddress('');
    setNif('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name || !email) {
      alert("Le nom et l'adresse courriel sont obligatoires.");
      return;
    }

    const customerData = {
      tenant_id: activeTenant.id,
      name,
      email,
      phone,
      address,
      nif
    };

    try {
      if (isEditing) {
        supabaseSim.updateCustomer(activeTenant.id, {
          id: editingId,
          ...customerData
        });
        alert("Client mis à jour avec succès !");
      } else {
        supabaseSim.createCustomer(activeTenant.id, customerData);
        alert("Client créé et enregistré en BDD Supabase !");
      }
      handleResetForm();
      loadCustomers();
    } catch (err) {
      console.error(err);
      alert("Une erreur de traitement s'est produite lors de l'enregistrement du client.");
    }
  };

  const handleEditClick = (cust) => {
    setIsEditing(true);
    setEditingId(cust.id);
    setName(cust.name);
    setEmail(cust.email);
    setPhone(cust.phone || '');
    setAddress(cust.address || '');
    setNif(cust.nif || '');
  };

  const handleDeleteClick = (id, clientName) => {
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer le client "${clientName}" ? cette opération est protégée par les règles RLS.`)) {
      try {
        supabaseSim.deleteCustomer(activeTenant.id, id);
        alert("Client supprimé avec succès !");
        loadCustomers();
      } catch (err) {
        console.error(err);
        alert("Une erreur est survenue lors de la suppression du client.");
      }
    }
  };

  // Filter clients based on search input
  const filteredCustomers = customers.filter(cust => {
    const query = searchQuery.toLowerCase();
    return (
      cust.name.toLowerCase().includes(query) ||
      cust.email.toLowerCase().includes(query) ||
      (cust.nif && cust.nif.toLowerCase().includes(query))
    );
  });

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Gestion des Clients</h1>
      <p style={styles.subtitle}>Ajoutez, recherchez et gérez les comptes clients de votre entreprise.</p>

      <div style={styles.splitLayout}>
        {/* Client Form */}
        <div className="onyx-card" style={styles.formCard}>
          <h3 style={styles.cardTitle}>
            {isEditing ? "📝 Modifier le Client" : "👤 Nouveau Client"}
          </h3>
          <form onSubmit={handleSubmit} style={styles.form}>
            <div>
              <label className="onyx-label">Nom complet / Raison Sociale *</label>
              <input 
                type="text" 
                className="onyx-input" 
                placeholder="ex: SEEG Gabon" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                required 
              />
            </div>

            <div style={styles.row}>
              <div style={styles.col}>
                <label className="onyx-label">Adresse Courriel *</label>
                <input 
                  type="email" 
                  className="onyx-input" 
                  placeholder="contact@client.ga" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required 
                />
              </div>
              <div style={styles.col}>
                <label className="onyx-label">Téléphone</label>
                <input 
                  type="text" 
                  className="onyx-input" 
                  placeholder="+241 077 12 34 56" 
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
            </div>

            <div style={styles.row}>
              <div style={styles.col}>
                <label className="onyx-label">Numéro d'Identification Fiscale (NIF)</label>
                <input 
                  type="text" 
                  className="onyx-input data-mono" 
                  placeholder="NIF-12345A" 
                  value={nif}
                  onChange={(e) => setNif(e.target.value)}
                />
              </div>
              <div style={styles.col}>
                <label className="onyx-label">Adresse de Facturation</label>
                <input 
                  type="text" 
                  className="onyx-input" 
                  placeholder="Ville, Quartier..." 
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
              <button type="submit" className="btn-success" style={{ flex: 1, justifyContent: 'center' }}>
                {isEditing ? "Sauvegarder les modifications" : "Ajouter le client (Enregistrer BDD)"}
              </button>
              {isEditing && (
                <button type="button" onClick={handleResetForm} className="btn-secondary">
                  Annuler
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Client List */}
        <div className="onyx-card" style={styles.listCard}>
          <div style={styles.listHeader}>
            <h3 style={styles.cardTitle}>Base Clients</h3>
            <div style={styles.searchBox}>
              <input 
                type="text" 
                className="onyx-input" 
                placeholder="🔍 Rechercher (nom, email, NIF)..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={styles.searchInput}
              />
            </div>
          </div>

          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Nom</th>
                  <th style={styles.th}>Courriel</th>
                  <th style={styles.th}>NIF</th>
                  <th style={{ ...styles.th, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.length > 0 ? (
                  filteredCustomers.map(cust => (
                    <tr key={cust.id} style={styles.tr}>
                      <td style={{ ...styles.td, fontWeight: '600', color: '#FFFFFF' }}>{cust.name}</td>
                      <td style={styles.td}>{cust.email}</td>
                      <td className="data-mono" style={styles.td}>{cust.nif || '-'}</td>
                      <td style={{ ...styles.td, textAlign: 'right' }}>
                        <button 
                          onClick={() => handleEditClick(cust)} 
                          className="btn-primary" 
                          style={styles.btnAction}
                        >
                          Éditer
                        </button>
                        <button 
                          onClick={() => handleDeleteClick(cust.id, cust.name)} 
                          style={styles.btnDelete}
                        >
                          Supprimer
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" style={styles.emptyCell}>Aucun client trouvé pour ce locataire.</td>
                  </tr>
                )}
              </tbody>
            </table>
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
    gridTemplateColumns: '5fr 7fr',
    gap: '24px'
  },
  formCard: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    alignSelf: 'start'
  },
  cardTitle: {
    fontSize: '1.1rem',
    fontWeight: '600',
    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
    paddingBottom: '10px'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  row: {
    display: 'flex',
    gap: '12px'
  },
  col: {
    flex: 1
  },
  listCard: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  listHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '12px'
  },
  searchBox: {
    width: '260px'
  },
  searchInput: {
    padding: '8px 12px',
    fontSize: '0.85rem'
  },
  tableWrapper: {
    overflowX: 'auto',
    width: '100%'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    textAlign: 'left'
  },
  th: {
    padding: '12px 10px',
    fontSize: '0.8rem',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: 'var(--color-text-secondary)',
    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
    fontWeight: '500'
  },
  tr: {
    borderBottom: '1px solid rgba(255, 255, 255, 0.03)',
    transition: 'background-color 0.2s ease'
  },
  td: {
    padding: '12px 10px',
    fontSize: '0.85rem',
    color: 'var(--color-text-secondary)',
    verticalAlign: 'middle'
  },
  btnAction: {
    padding: '4px 10px',
    fontSize: '0.75rem',
    marginRight: '6px'
  },
  btnDelete: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    color: '#EF4444',
    border: '1px solid rgba(239, 68, 68, 0.2)',
    borderRadius: '6px',
    padding: '4px 10px',
    fontSize: '0.75rem',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  },
  emptyCell: {
    textAlign: 'center',
    padding: '40px 0',
    color: 'var(--color-text-secondary)',
    fontSize: '0.9rem'
  }
};
