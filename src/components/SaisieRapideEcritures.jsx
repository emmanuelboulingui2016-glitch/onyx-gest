import React, { useState, useRef, useEffect } from 'react';
import { useTenant } from '../context/TenantContext';
import { createEcriture, searchPlanComptable, getEcritures, getLignesEcritures } from '../utils/accounting';

const emptyRow = () => ({ compte: '', libelle: '', debit: '', credit: '' });

// Saisie rapide type tableur pour le rôle comptable (journal OD).
// Voir ONYX_GEST_MODULE_COMPTABILITE_COMPLET.md, Partie C.1.
export const SaisieRapideEcritures = () => {
  const { activeTenant } = useTenant();
  const [dateEcriture, setDateEcriture] = useState(new Date().toISOString().split('T')[0]);
  const [libelleEcriture, setLibelleEcriture] = useState('');
  const [rows, setRows] = useState([emptyRow(), emptyRow()]);
  const [suggestions, setSuggestions] = useState({ rowIndex: null, items: [] });
  const [errorMsg, setErrorMsg] = useState('');
  const [recentEcritures, setRecentEcritures] = useState([]);

  const cellRefs = useRef({});
  const pendingFocus = useRef(null);

  const loadRecent = () => {
    const ecritures = getEcritures(activeTenant.id)
      .filter(e => e.journal_code === 'OD')
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 5)
      .map(e => ({ ...e, lignes: getLignesEcritures(activeTenant.id, e.id) }));
    setRecentEcritures(ecritures);
  };

  useEffect(() => {
    loadRecent();
  }, [activeTenant]);

  useEffect(() => {
    if (pendingFocus.current) {
      const key = pendingFocus.current;
      pendingFocus.current = null;
      const el = cellRefs.current[key];
      if (el) el.focus();
    }
  }, [rows]);

  const totalDebit = rows.reduce((acc, r) => acc + (parseFloat(r.debit) || 0), 0);
  const totalCredit = rows.reduce((acc, r) => acc + (parseFloat(r.credit) || 0), 0);
  const ecart = Math.round((totalDebit - totalCredit) * 100) / 100;
  const rowsValides = rows.filter(r => r.compte && (parseFloat(r.debit) > 0 || parseFloat(r.credit) > 0));
  const peutEnregistrer = ecart === 0 && rowsValides.length >= 2 && totalDebit > 0;

  const updateRow = (idx, field, value) => {
    setRows(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
  };

  const addRow = () => setRows(prev => [...prev, emptyRow()]);

  const removeRow = (idx) => {
    if (rows.length <= 2) return;
    setRows(prev => prev.filter((_, i) => i !== idx));
  };

  const focusCell = (rowIdx, colIdx) => {
    const el = cellRefs.current[`${rowIdx}-${colIdx}`];
    if (el) el.focus();
  };

  const moveToNextCell = (rowIdx, colIdx) => {
    if (colIdx < 3) {
      focusCell(rowIdx, colIdx + 1);
    } else if (rowIdx < rows.length - 1) {
      focusCell(rowIdx + 1, 0);
    } else {
      pendingFocus.current = `${rowIdx + 1}-0`;
      addRow();
    }
  };

  const handleKeyDown = (e, rowIdx, colIdx) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      moveToNextCell(rowIdx, colIdx);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (rowIdx < rows.length - 1) focusCell(rowIdx + 1, colIdx);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (rowIdx > 0) focusCell(rowIdx - 1, colIdx);
    } else if (e.key === 'Tab' && !e.shiftKey && colIdx === 3 && rowIdx === rows.length - 1) {
      e.preventDefault();
      pendingFocus.current = `${rowIdx + 1}-0`;
      addRow();
    }
  };

  const handleCompteChange = (rowIdx, value) => {
    updateRow(rowIdx, 'compte', value);
    const items = searchPlanComptable(activeTenant.id, value);
    setSuggestions({ rowIndex: rowIdx, items });
  };

  const selectSuggestion = (rowIdx, compte) => {
    setRows(prev => {
      const next = [...prev];
      next[rowIdx] = {
        ...next[rowIdx],
        compte: compte.numero_compte,
        libelle: next[rowIdx].libelle || compte.libelle
      };
      return next;
    });
    setSuggestions({ rowIndex: null, items: [] });
    pendingFocus.current = `${rowIdx}-1`;
    setTimeout(() => focusCell(rowIdx, 1), 0);
  };

  const handleSubmit = () => {
    setErrorMsg('');
    try {
      createEcriture(activeTenant.id, {
        journalCode: 'OD',
        numeroPiece: `OD-${Date.now().toString().slice(-8)}`,
        dateEcriture,
        libelle: libelleEcriture || 'Écriture manuelle',
        sourceType: 'manuel',
        lignes: rowsValides.map(r => ({
          numero_compte: r.compte,
          libelle: r.libelle,
          debit: parseFloat(r.debit) || 0,
          credit: parseFloat(r.credit) || 0
        }))
      });
      setRows([emptyRow(), emptyRow()]);
      setLibelleEcriture('');
      loadRecent();
    } catch (err) {
      setErrorMsg(err.message);
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
      <h1 style={styles.title}>Saisie Rapide d'Écritures</h1>
      <p style={styles.subtitle}>Journal des Opérations Diverses (OD) — navigation clavier Tab / Entrée / ↑ / ↓</p>

      <div className="onyx-card" style={styles.card}>
        <div style={styles.headerRow}>
          <div style={styles.headerField}>
            <label className="onyx-label">Date</label>
            <input
              className="onyx-input"
              type="date"
              value={dateEcriture}
              onChange={(e) => setDateEcriture(e.target.value)}
            />
          </div>
          <div style={{ ...styles.headerField, flex: 2 }}>
            <label className="onyx-label">Libellé de l'écriture</label>
            <input
              className="onyx-input"
              type="text"
              placeholder="ex: Loyer du mois de juillet"
              value={libelleEcriture}
              onChange={(e) => setLibelleEcriture(e.target.value)}
            />
          </div>
        </div>

        <div style={{ ...styles.balanceBar, color: ecart === 0 ? '#10B981' : '#EF4444' }}>
          Débit : <span className="data-mono">{formatFCFA(totalDebit)}</span> — Crédit : <span className="data-mono">{formatFCFA(totalCredit)}</span>
          {' '}— Écart : <span className="data-mono">{formatFCFA(Math.abs(ecart))}</span> {ecart === 0 ? '✅' : '⚠️'}
        </div>

        <div style={styles.gridWrapper}>
          <div style={styles.gridHeaderRow}>
            <div style={{ ...styles.gridCell, flex: 2 }}>Compte</div>
            <div style={{ ...styles.gridCell, flex: 3 }}>Libellé</div>
            <div style={{ ...styles.gridCell, flex: 1.5, textAlign: 'right' }}>Débit</div>
            <div style={{ ...styles.gridCell, flex: 1.5, textAlign: 'right' }}>Crédit</div>
            <div style={{ width: '32px' }} />
          </div>

          {rows.map((row, rowIdx) => (
            <div key={rowIdx} style={styles.gridRow}>
              <div style={{ flex: 2, position: 'relative' }}>
                <input
                  ref={(el) => (cellRefs.current[`${rowIdx}-0`] = el)}
                  className="onyx-input data-mono"
                  style={styles.gridInput}
                  type="text"
                  placeholder="411 ou client"
                  value={row.compte}
                  onChange={(e) => handleCompteChange(rowIdx, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(e, rowIdx, 0)}
                  onFocus={() => setSuggestions({ rowIndex: rowIdx, items: searchPlanComptable(activeTenant.id, row.compte) })}
                  onBlur={() => setTimeout(() => setSuggestions({ rowIndex: null, items: [] }), 150)}
                  autoComplete="off"
                />
                {suggestions.rowIndex === rowIdx && suggestions.items.length > 0 && (
                  <div style={styles.suggestionsBox}>
                    {suggestions.items.map(item => (
                      <div
                        key={item.id}
                        style={styles.suggestionItem}
                        onMouseDown={() => selectSuggestion(rowIdx, item)}
                      >
                        <span className="data-mono" style={{ color: 'var(--color-accent-blue)' }}>{item.numero_compte}</span>
                        {' '}— {item.libelle}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <input
                ref={(el) => (cellRefs.current[`${rowIdx}-1`] = el)}
                className="onyx-input"
                style={{ ...styles.gridInput, flex: 3 }}
                type="text"
                placeholder="Libellé de la ligne"
                value={row.libelle}
                onChange={(e) => updateRow(rowIdx, 'libelle', e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, rowIdx, 1)}
              />
              <input
                ref={(el) => (cellRefs.current[`${rowIdx}-2`] = el)}
                className="onyx-input data-mono"
                style={{ ...styles.gridInput, flex: 1.5, textAlign: 'right' }}
                type="number"
                min="0"
                placeholder="0"
                value={row.debit}
                onChange={(e) => updateRow(rowIdx, 'debit', e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, rowIdx, 2)}
              />
              <input
                ref={(el) => (cellRefs.current[`${rowIdx}-3`] = el)}
                className="onyx-input data-mono"
                style={{ ...styles.gridInput, flex: 1.5, textAlign: 'right' }}
                type="number"
                min="0"
                placeholder="0"
                value={row.credit}
                onChange={(e) => updateRow(rowIdx, 'credit', e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, rowIdx, 3)}
              />
              <button
                type="button"
                onClick={() => removeRow(rowIdx)}
                style={styles.btnDelete}
                disabled={rows.length <= 2}
                title="Supprimer la ligne"
              >
                ✕
              </button>
            </div>
          ))}
        </div>

        <div style={styles.actionsRow}>
          <button type="button" className="btn-secondary" onClick={addRow}>+ Ajouter une ligne</button>
          <button
            type="button"
            className="btn-success"
            onClick={handleSubmit}
            disabled={!peutEnregistrer}
            style={{ opacity: peutEnregistrer ? 1 : 0.4, cursor: peutEnregistrer ? 'pointer' : 'not-allowed' }}
          >
            Enregistrer l'écriture
          </button>
        </div>

        {errorMsg && <div style={styles.errorBox}>⚠️ {errorMsg}</div>}
      </div>

      <div className="onyx-card" style={styles.card}>
        <h3 style={styles.recentTitle}>Dernières écritures OD saisies</h3>
        {recentEcritures.length > 0 ? (
          <div style={styles.recentList}>
            {recentEcritures.map(e => (
              <div key={e.id} style={styles.recentItem}>
                <div style={styles.recentHeader}>
                  <span className="data-mono" style={{ color: 'var(--color-accent-blue)' }}>{e.numero_piece}</span>
                  <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.8rem' }}>{e.date_ecriture}</span>
                </div>
                <div style={{ fontSize: '0.85rem', color: '#FFFFFF' }}>{e.libelle}</div>
                {e.lignes.map(l => (
                  <div key={l.id} style={styles.recentLigne}>
                    <span className="data-mono">{l.numero_compte}</span>
                    <span>{l.libelle}</span>
                    <span className="data-mono" style={{ color: l.debit > 0 ? '#3B82F6' : 'transparent' }}>{l.debit > 0 ? formatFCFA(l.debit) : ''}</span>
                    <span className="data-mono" style={{ color: l.credit > 0 ? '#10B981' : 'transparent' }}>{l.credit > 0 ? formatFCFA(l.credit) : ''}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        ) : (
          <div style={styles.emptyState}>Aucune écriture manuelle saisie pour le moment.</div>
        )}
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
  card: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  headerRow: {
    display: 'flex',
    gap: '16px'
  },
  headerField: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  },
  balanceBar: {
    fontSize: '0.9rem',
    fontWeight: '600',
    padding: '10px 14px',
    background: 'rgba(255, 255, 255, 0.02)',
    border: '1px solid rgba(255, 255, 255, 0.06)',
    borderRadius: '6px'
  },
  gridWrapper: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  },
  gridHeaderRow: {
    display: 'flex',
    gap: '10px',
    padding: '0 4px',
    fontSize: '0.78rem',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: 'var(--color-text-secondary)'
  },
  gridCell: {
    display: 'flex',
    alignItems: 'center'
  },
  gridRow: {
    display: 'flex',
    gap: '10px',
    alignItems: 'center'
  },
  gridInput: {
    flex: 2
  },
  suggestionsBox: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    zIndex: 20,
    background: '#0F1A20',
    border: '1px solid rgba(59, 130, 246, 0.3)',
    borderRadius: '6px',
    marginTop: '2px',
    boxShadow: '0 8px 20px rgba(0,0,0,0.4)',
    maxHeight: '180px',
    overflowY: 'auto'
  },
  suggestionItem: {
    padding: '8px 10px',
    fontSize: '0.85rem',
    cursor: 'pointer',
    borderBottom: '1px solid rgba(255,255,255,0.04)'
  },
  btnDelete: {
    background: 'none',
    border: 'none',
    color: '#9CA3AF',
    cursor: 'pointer',
    fontSize: '1rem',
    width: '32px'
  },
  actionsRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  errorBox: {
    padding: '10px 14px',
    background: 'rgba(239, 68, 68, 0.08)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    borderRadius: '6px',
    color: '#EF4444',
    fontSize: '0.85rem'
  },
  recentTitle: {
    fontSize: '1.1rem',
    fontWeight: '600',
    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
    paddingBottom: '10px'
  },
  recentList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px'
  },
  recentItem: {
    background: 'rgba(255, 255, 255, 0.02)',
    border: '1px solid rgba(255, 255, 255, 0.05)',
    borderRadius: '6px',
    padding: '12px 14px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  },
  recentHeader: {
    display: 'flex',
    justifyContent: 'space-between'
  },
  recentLigne: {
    display: 'grid',
    gridTemplateColumns: '60px 1fr 120px 120px',
    gap: '10px',
    fontSize: '0.8rem',
    color: 'var(--color-text-secondary)'
  },
  emptyState: {
    textAlign: 'center',
    padding: '30px 0',
    color: 'var(--color-text-secondary)',
    fontSize: '0.9rem'
  }
};
