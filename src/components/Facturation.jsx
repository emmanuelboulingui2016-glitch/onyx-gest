import React, { useState, useEffect } from 'react';
import { useTenant } from '../context/TenantContext';
import { supabaseSim } from '../utils/supabaseSim';
import { generateEcritureFromInvoiceIssued, generateEcritureFromPayment } from '../utils/accounting';

export const Facturation = () => {
  const { activeTenant, syncTrigger } = useTenant();
  const [invoices, setInvoices] = useState([]);
  const [tvaRate, setTvaRate] = useState(18);
  const [companySettings, setCompanySettings] = useState(null);
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientCity, setClientCity] = useState('Libreville');
  const [docType, setDocType] = useState('facture');
  const [items, setItems] = useState([{ desc: '', qty: 1, price: 0 }]);
  const [previewInvoice, setPreviewInvoice] = useState(null);
  
  useEffect(() => {
    loadInvoices();
    const settings = supabaseSim.getCompanySettings(activeTenant.id);
    setCompanySettings(settings);
    if (settings && settings.tva_rate !== undefined) {
      setTvaRate(settings.tva_rate);
    } else {
      setTvaRate(18);
    }
  }, [activeTenant, syncTrigger]);

  const loadInvoices = () => {
    const data = supabaseSim.getInvoices(activeTenant.id);
    setInvoices(data);
  };

  const handleTransformToInvoice = (devis) => {
    if (window.confirm(`Voulez-vous transformer le devis ${devis.number} en Facture ?`)) {
      try {
        const nextNum = `FAC-2026-${String(invoices.filter(i => i.type === 'facture').length + 1).padStart(4, '0')}`;
        const newInvoice = {
          ...devis,
          id: `inv_${Date.now()}`,
          type: 'facture',
          number: nextNum,
          status: 'brouillon',
          date: new Date().toISOString().split('T')[0]
        };
        supabaseSim.createInvoice(activeTenant.id, newInvoice);
        alert(`✅ Devis ${devis.number} transformé avec succès en Facture ${nextNum} !`);
        loadInvoices();
      } catch (err) {
        console.error(err);
        alert("Une erreur est survenue lors de la transformation du devis.");
      }
    }
  };

  const handleAddItem = () => {
    setItems([...items, { desc: '', qty: 1, price: 0 }]);
  };

  const handleRemoveItem = (index) => {
    if (items.length > 1) {
      setItems(items.filter((_, idx) => idx !== index));
    }
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...items];
    if (field === 'qty') {
      newItems[index][field] = Math.max(1, parseInt(value) || 0);
    } else if (field === 'price') {
      newItems[index][field] = Math.max(0, parseInt(value) || 0);
    } else {
      newItems[index][field] = value;
    }
    setItems(newItems);
  };

  const calculateSubtotal = () => {
    return items.reduce((acc, item) => acc + (item.qty * item.price), 0);
  };

  const calculateTax = (subtotal) => {
    return Math.round(subtotal * (tvaRate / 100));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!clientName || items.some(item => !item.desc || item.price <= 0)) {
      alert('Veuillez remplir tous les champs et ajouter au moins un produit valide.');
      return;
    }

    const subtotal = calculateSubtotal();
    const tva = calculateTax(subtotal);
    const amount = subtotal + tva;
    const docNumber = `${docType === 'facture' ? 'FAC' : 'DEV'}-2026-${String(invoices.length + 1).padStart(4, '0')}`;

    const newInvoice = {
      tenant_id: activeTenant.id,
      type: docType,
      number: docNumber,
      client_name: clientName,
      client_email: clientEmail,
      client_city: clientCity,
      date: new Date().toISOString().split('T')[0],
      due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // +14 days
      status: 'brouillon',
      tax_rate: tvaRate,
      items: items,
      amount: amount
    };

    try {
      supabaseSim.createInvoice(activeTenant.id, newInvoice);
      alert(`${docType === 'facture' ? 'Facture' : 'Devis'} créé avec succès !`);
      
      // Reset form
      setClientName('');
      setClientEmail('');
      setClientCity('Libreville');
      setDocType('facture');
      setItems([{ desc: '', qty: 1, price: 0 }]);
      
      loadInvoices();
    } catch (err) {
      console.error(err);
      alert("Une erreur de traitement s'est produite lors de l'enregistrement du document.");
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleIssueInvoice = (inv) => {
    if (window.confirm(`⚠️ ATTENTION : Valider et Émettre cette facture la rendra totalement INALTÉRABLE et fige ses mentions légales. Confirmer ?`)) {
      try {
        const updated = {
          ...inv,
          status: 'officiel'
        };
        supabaseSim.createInvoice(activeTenant.id, updated);

        // Génération automatique de l'écriture comptable (Débit 411 / Crédit 701+4431)
        try {
          generateEcritureFromInvoiceIssued(activeTenant.id, updated);
        } catch (accErr) {
          console.error("❌ Génération de l'écriture comptable :", accErr);
        }

        setPreviewInvoice(updated);
        alert(`✅ La facture ${inv.number} a été officiellement émise et figée !`);
        loadInvoices();
      } catch (err) {
        console.error(err);
        alert("Une erreur est survenue lors de la validation du document.");
      }
    }
  };

  const handleMarkAsPaid = (inv) => {
    if (window.confirm(`Confirmer l'encaissement de la facture ${inv.number} (${formatFCFA(inv.amount)}) ?`)) {
      try {
        supabaseSim.updateInvoiceStatus(activeTenant.id, inv.id, 'paye');

        // Génération automatique de l'écriture comptable (Débit 512 / Crédit 411) + lettrage
        try {
          generateEcritureFromPayment(activeTenant.id, inv);
        } catch (accErr) {
          console.error("❌ Génération de l'écriture d'encaissement :", accErr);
        }

        alert(`✅ Facture ${inv.number} marquée comme payée.`);
        loadInvoices();
      } catch (err) {
        console.error(err);
        alert("Une erreur est survenue lors de l'encaissement.");
      }
    }
  };

  const formatFCFA = (amount) => {
    return new Intl.NumberFormat('fr-GA', {
      style: 'currency',
      currency: 'XAF',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div style={styles.container}>
      <h1 className="no-print" style={styles.title}>Module de Facturation</h1>
      
      <div style={styles.splitLayout}>
        {/* Creator Form */}
        <div className="onyx-card no-print" style={styles.formCard}>
          <h3 style={styles.cardTitle}>Nouveau Document</h3>
          <form onSubmit={handleSubmit} style={styles.form}>
            <div style={styles.row}>
              <div style={styles.col}>
                <label className="onyx-label">Type de Document</label>
                <select 
                  className="onyx-select" 
                  value={docType} 
                  onChange={(e) => setDocType(e.target.value)}
                >
                  <option value="facture">Facture</option>
                  <option value="devis">Devis</option>
                </select>
              </div>
              <div style={styles.col}>
                <label className="onyx-label">Ville du Client (Gabon)</label>
                <select 
                  className="onyx-select" 
                  value={clientCity} 
                  onChange={(e) => setClientCity(e.target.value)}
                >
                  <option value="Libreville">Libreville</option>
                  <option value="Port-Gentil">Port-Gentil</option>
                  <option value="Franceville">Franceville</option>
                  <option value="Oyem">Oyem</option>
                  <option value="Moanda">Moanda</option>
                  <option value="Lambaréné">Lambaréné</option>
                </select>
              </div>
            </div>

            <div style={styles.row}>
              <div style={styles.col}>
                <label className="onyx-label">Nom du Client</label>
                <input 
                  className="onyx-input" 
                  type="text" 
                  placeholder="ex: Gabon Telecom S.A." 
                  value={clientName} 
                  onChange={(e) => setClientName(e.target.value)}
                  required
                />
              </div>
              <div style={styles.col}>
                <label className="onyx-label">Email du Client</label>
                <input 
                  className="onyx-input" 
                  type="email" 
                  placeholder="client@gabon.ga" 
                  value={clientEmail} 
                  onChange={(e) => setClientEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div style={styles.itemsSection}>
              <div style={styles.itemsHeader}>
                <label className="onyx-label">Articles / Prestations</label>
                <button type="button" onClick={handleAddItem} className="btn-secondary" style={styles.btnSmall}>
                  + Ajouter
                </button>
              </div>

              {items.map((item, idx) => (
                <div key={idx} style={styles.itemRow}>
                  <input 
                    className="onyx-input" 
                    type="text" 
                    placeholder="Description du produit ou service"
                    value={item.desc}
                    onChange={(e) => handleItemChange(idx, 'desc', e.target.value)}
                    style={{ flex: 3 }}
                    required
                  />
                  <input 
                    className="onyx-input data-mono" 
                    type="number" 
                    min="1"
                    placeholder="Qté"
                    value={item.qty}
                    onChange={(e) => handleItemChange(idx, 'qty', e.target.value)}
                    style={{ flex: 1, textAlign: 'center' }}
                    required
                  />
                  <input 
                    className="onyx-input data-mono" 
                    type="number" 
                    min="0"
                    placeholder="Prix (FCFA)"
                    value={item.price || ''}
                    onChange={(e) => handleItemChange(idx, 'price', e.target.value)}
                    style={{ flex: 2, textAlign: 'right' }}
                    required
                  />
                  {items.length > 1 && (
                    <button 
                      type="button" 
                      onClick={() => handleRemoveItem(idx)} 
                      style={styles.btnDelete}
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Calculations Summary */}
            <div style={styles.summaryBox}>
              <div style={styles.summaryRow}>
                <span>Sous-Total:</span>
                <span className="data-mono">{formatFCFA(calculateSubtotal())}</span>
              </div>
              <div style={styles.summaryRow}>
                <span>TVA (18%):</span>
                <span className="data-mono">{formatFCFA(calculateTax(calculateSubtotal()))}</span>
              </div>
              <div style={{ ...styles.summaryRow, fontWeight: '700', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '8px' }}>
                <span style={{ color: '#FFFFFF' }}>Total TTC (XAF):</span>
                <span className="data-mono" style={{ color: '#F59E0B' }}>{formatFCFA(calculateSubtotal() + calculateTax(calculateSubtotal()))}</span>
              </div>
            </div>

            <button type="submit" className="btn-success" style={{ justifyContent: 'center' }}>
              Créer et Enregistrer en BDD (Supabase RLS)
            </button>
          </form>
        </div>

        {/* Invoices List / PDF Action */}
        <div className="onyx-card no-print" style={styles.listCard}>
          <h3 style={styles.cardTitle}>Factures & Devis Actifs</h3>
          <div style={styles.listContainer}>
            {invoices.map(inv => (
              <div key={inv.id} style={styles.invoiceListItem}>
                <div style={styles.listItemLeft}>
                  <span className="data-mono" style={styles.listItemNumber}>{inv.number}</span>
                  <span style={styles.listItemClient}>{inv.client_name}</span>
                </div>
                <div style={styles.listItemRight}>
                  <span className="data-mono" style={styles.listItemAmount}>{formatFCFA(inv.amount)}</span>
                  <button 
                    onClick={() => setPreviewInvoice(inv)} 
                    className="btn-primary" 
                    style={styles.btnActionSmall}
                  >
                    Visualiser
                  </button>
                  {inv.type === 'devis' && (
                    <button
                      onClick={() => handleTransformToInvoice(inv)}
                      className="btn-success"
                      style={{ ...styles.btnActionSmall, marginLeft: '6px' }}
                    >
                      Facturer
                    </button>
                  )}
                  {inv.type === 'facture' && (inv.status === 'officiel' || inv.status === 'en_retard') && (
                    <button
                      onClick={() => handleMarkAsPaid(inv)}
                      className="btn-success"
                      style={{ ...styles.btnActionSmall, marginLeft: '6px' }}
                      title="Enregistrer l'encaissement et générer l'écriture comptable"
                    >
                      💵 Encaisser
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Invoice PDF Preview Overlay */}
      {previewInvoice && (
        <div style={styles.previewContainer}>
          <div className="no-print" style={styles.previewHeaderActions}>
            <button onClick={() => setPreviewInvoice(null)} className="btn-secondary">
              ← Retour au module
            </button>
            {previewInvoice.type === 'facture' && previewInvoice.status === 'brouillon' && (
              <button 
                onClick={() => handleIssueInvoice(previewInvoice)} 
                className="btn-primary" 
                style={{ backgroundColor: '#D4AF37', color: '#0A0A0A', fontWeight: '700' }}
              >
                ✍️ Valider et Émettre (Figer & Rendre Inaltérable)
              </button>
            )}
            <button onClick={handlePrint} className="btn-success">
              🖨️ Imprimer / Exporter PDF Direct
            </button>
          </div>

          {/* Premium Gabon Invoice Design */}
          <div style={styles.pdfPaper}>
            <div style={styles.pdfHeader}>
              <div>
                <h2 style={styles.pdfCompanyTitle}>{companySettings?.name || activeTenant.name}</h2>
                <p style={styles.pdfCompanyDetails}>{companySettings?.phone || activeTenant.phone} | {companySettings?.email || activeTenant.email}</p>
                <p style={styles.pdfCompanyDetails}>RCCM: {companySettings?.rccm || activeTenant.rccm} | NIF: {companySettings?.nif || activeTenant.nif}</p>
                <p style={styles.pdfCompanyDetails}>{companySettings?.address || `${activeTenant.city}, Gabon`}</p>
              </div>
              <div style={styles.pdfBranding}>
                <div style={styles.pdfLogo}>
                  {companySettings?.logoText || activeTenant.logoText}
                </div>
                <h1 style={styles.pdfDocTypeTitle}>
                  {previewInvoice.type === 'facture' ? 'FACTURE' : 'DEVIS'}
                </h1>
              </div>
            </div>

            <div style={styles.pdfBillingInfo}>
              <div style={styles.pdfInfoBlock}>
                <h4 style={styles.pdfLabel}>DÉTAILS DU DOCUMENT</h4>
                <p><strong>Numéro:</strong> {previewInvoice.number}</p>
                <p><strong>Date d'émission:</strong> {previewInvoice.date}</p>
                <p><strong>Échéance:</strong> {previewInvoice.due_date}</p>
              </div>
              <div style={styles.pdfInfoBlock}>
                <h4 style={styles.pdfLabel}>FACTURÉ À</h4>
                <p><strong>{previewInvoice.client_name}</strong></p>
                <p>Email: {previewInvoice.client_email}</p>
                <p>Ville: {previewInvoice.client_city}, Gabon</p>
              </div>
            </div>

            <table style={styles.pdfTable}>
              <thead>
                <tr>
                  <th style={styles.pdfTh}>Description</th>
                  <th style={{ ...styles.pdfTh, textAlign: 'center', width: '80px' }}>Qté</th>
                  <th style={{ ...styles.pdfTh, textAlign: 'right', width: '150px' }}>Prix Unitaire</th>
                  <th style={{ ...styles.pdfTh, textAlign: 'right', width: '150px' }}>Total (XAF)</th>
                </tr>
              </thead>
              <tbody>
                {previewInvoice.items.map((item, idx) => (
                  <tr key={idx} style={styles.pdfTr}>
                    <td style={styles.pdfTd}>{item.desc}</td>
                    <td style={{ ...styles.pdfTd, textAlign: 'center' }}>{item.qty}</td>
                    <td style={{ ...styles.pdfTd, textAlign: 'right' }}>{formatFCFA(item.price)}</td>
                    <td style={{ ...styles.pdfTd, textAlign: 'right' }}>{formatFCFA(item.qty * item.price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={styles.pdfTotalSection}>
              <div style={styles.pdfTotalBlock}>
                <div style={styles.pdfTotalRow}>
                  <span>Sous-Total:</span>
                  <span>{formatFCFA(previewInvoice.amount - Math.round((previewInvoice.amount * 18)/118))}</span>
                </div>
                <div style={styles.pdfTotalRow}>
                  <span>TVA (18%):</span>
                  <span>{formatFCFA(Math.round((previewInvoice.amount * 18)/118))}</span>
                </div>
                <div style={{ ...styles.pdfTotalRow, fontSize: '1.2rem', fontWeight: '700', borderTop: '2px solid #000000', paddingTop: '8px', marginTop: '4px' }}>
                  <span>TOTAL TTC (FCFA):</span>
                  <span>{formatFCFA(previewInvoice.amount)}</span>
                </div>
              </div>
            </div>

            <div style={styles.pdfFooter}>
              <p>Merci pour votre confiance.</p>
              <p style={{ fontSize: '0.8rem', color: '#666', marginTop: '12px' }}>
                {activeTenant.name} - Enregistré sous le numéro RCCM {activeTenant.rccm}.
              </p>
            </div>
          </div>
        </div>
      )}
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
    borderBottom: '1px solid rgba(59, 130, 246, 0.1)',
    paddingBottom: '16px'
  },
  splitLayout: {
    display: 'grid',
    gridTemplateColumns: '7fr 5fr',
    gap: '24px'
  },
  formCard: {
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
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '18px'
  },
  row: {
    display: 'flex',
    gap: '16px'
  },
  col: {
    flex: 1
  },
  itemsSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    borderTop: '1px solid rgba(255, 255, 255, 0.05)',
    paddingTop: '16px'
  },
  itemsHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  btnSmall: {
    padding: '4px 10px',
    fontSize: '0.8rem'
  },
  itemRow: {
    display: 'flex',
    gap: '10px',
    alignItems: 'center'
  },
  btnDelete: {
    background: 'none',
    border: 'none',
    color: '#9CA3AF',
    cursor: 'pointer',
    fontSize: '1.1rem',
    padding: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'color 0.2s ease'
  },
  summaryBox: {
    background: 'rgba(255, 255, 255, 0.02)',
    border: '1px solid rgba(59, 130, 246, 0.1)',
    borderRadius: '6px',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  summaryRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.9rem'
  },
  listCard: {
    display: 'flex',
    flexDirection: 'column'
  },
  listContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  invoiceListItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: 'rgba(255, 255, 255, 0.02)',
    border: '1px solid rgba(255, 255, 255, 0.05)',
    borderRadius: '6px',
    padding: '12px 16px',
    transition: 'border-color 0.2s ease'
  },
  listItemLeft: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  listItemNumber: {
    fontSize: '0.9rem',
    color: 'var(--color-accent-blue)',
    fontWeight: '600'
  },
  listItemClient: {
    fontSize: '0.85rem',
    color: '#FFFFFF'
  },
  listItemRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px'
  },
  listItemAmount: {
    fontSize: '0.9rem',
    color: '#F59E0B',
    fontWeight: '600'
  },
  btnActionSmall: {
    padding: '6px 12px',
    fontSize: '0.8rem'
  },

  // Preview overlay styles
  previewContainer: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(5, 16, 21, 0.95)',
    zIndex: 999,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'flex-start',
    padding: '40px 20px',
    overflowY: 'auto'
  },
  previewHeaderActions: {
    width: '100%',
    maxWidth: '800px',
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '20px'
  },
  pdfPaper: {
    width: '100%',
    maxWidth: '800px',
    backgroundColor: '#FFFFFF',
    color: '#0A0A0A',
    padding: '50px',
    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5)',
    minHeight: '1050px',
    display: 'flex',
    flexDirection: 'column',
    fontFamily: 'sans-serif'
  },
  pdfHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    borderBottom: '2px solid #0A0A0A',
    paddingBottom: '30px'
  },
  pdfCompanyTitle: {
    fontSize: '1.6rem',
    fontWeight: '700',
    color: '#0A0A0A',
    marginBottom: '8px'
  },
  pdfCompanyDetails: {
    fontSize: '0.85rem',
    color: '#555555',
    margin: '2px 0'
  },
  pdfBranding: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    justifyContent: 'space-between'
  },
  pdfLogo: {
    width: '50px',
    height: '50px',
    borderRadius: '8px',
    backgroundColor: '#051015',
    color: '#3B82F6',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: '700',
    fontSize: '1.2rem',
    border: '1px solid #3B82F6'
  },
  pdfDocTypeTitle: {
    fontSize: '2rem',
    fontWeight: '800',
    color: '#051015',
    marginTop: '20px'
  },
  pdfBillingInfo: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '40px',
    margin: '40px 0'
  },
  pdfInfoBlock: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    fontSize: '0.9rem'
  },
  pdfLabel: {
    fontSize: '0.8rem',
    fontWeight: '700',
    color: '#666666',
    letterSpacing: '0.05em',
    marginBottom: '4px'
  },
  pdfTable: {
    width: '100%',
    borderCollapse: 'collapse',
    margin: '20px 0',
    flexGrow: 1
  },
  pdfTh: {
    borderBottom: '2px solid #0A0A0A',
    padding: '12px 6px',
    fontSize: '0.85rem',
    fontWeight: '700',
    textAlign: 'left'
  },
  pdfTr: {
    borderBottom: '1px solid #E5E7EB'
  },
  pdfTd: {
    padding: '12px 6px',
    fontSize: '0.9rem'
  },
  pdfTotalSection: {
    display: 'flex',
    justifyContent: 'flex-end',
    marginTop: '30px'
  },
  pdfTotalBlock: {
    width: '320px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  pdfTotalRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.95rem'
  },
  pdfFooter: {
    borderTop: '1px solid #E5E7EB',
    paddingTop: '30px',
    textAlign: 'center',
    fontSize: '0.9rem',
    color: '#555555'
  }
};
