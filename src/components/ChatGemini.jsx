import React, { useState, useRef, useEffect } from 'react';
import { useTenant } from '../context/TenantContext';
import { supabaseSim } from '../utils/supabaseSim';
import { Bot, User, Send, BrainCircuit, ChevronDown, ChevronRight, X, Loader2 } from 'lucide-react';

export const ChatGemini = ({ isOpen, onClose }) => {
  const { activeTenant } = useTenant();
  const [messages, setMessages] = useState([
    { 
      role: 'model', 
      content: `Bonjour ! Je suis **Gemini**, votre assistant d'analyse financière Onyx. Posez-moi vos questions sur vos données de facturation pour **${activeTenant.name}** (ex: chiffre d'affaires, factures en retard, etc.).`,
      thoughts: '',
      suggestions: [
        "Quel est mon chiffre d'affaires ?",
        "Combien de factures sont en retard ?",
        "Quel est le taux de recouvrement ?"
      ]
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [expandedThoughts, setExpandedThoughts] = useState({});
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Adjust textarea height dynamically
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = Math.min(scrollHeight, 120) + 'px';
    }
  }, [input]);

  // Sync initial message when tenant changes
  useEffect(() => {
    setMessages([
      { 
        role: 'model', 
        content: `Bonjour ! Je suis **Gemini**, votre assistant d'analyse financière Onyx. Posez-moi vos questions sur vos données de facturation pour **${activeTenant.name}** (ex: chiffre d'affaires, factures en retard, etc.).`,
        thoughts: '',
        suggestions: [
          "Quel est mon chiffre d'affaires ?",
          "Combien de factures sont en retard ?",
          "Quel est le taux de recouvrement ?"
        ]
      }
    ]);
  }, [activeTenant]);

  const toggleThought = (idx) => {
    setExpandedThoughts(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(e);
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

  const getContextualAnswer = (query) => {
    const data = supabaseSim.getInvoices(activeTenant.id);
    const lowercaseQuery = query.toLowerCase();

    // Compute stats
    const totalRevenue = data.reduce((acc, inv) => acc + (inv.type === 'facture' ? inv.amount : 0), 0);
    const paidAmount = data.filter(inv => inv.type === 'facture' && inv.status === 'paye')
                           .reduce((acc, inv) => acc + inv.amount, 0);
    const outstandingAmount = data.filter(inv => inv.type === 'facture' && inv.status === 'en_retard')
                                  .reduce((acc, inv) => acc + inv.amount, 0);
    const outstandingCount = data.filter(inv => inv.type === 'facture' && inv.status === 'en_retard').length;
    const totalCount = data.filter(inv => inv.type === 'facture').length;
    const recoveryRate = totalRevenue > 0 ? Math.round((paidAmount / totalRevenue) * 100) : 0;
    const devisPending = data.filter(inv => inv.type === 'devis').length;

    // Build answer based on keywords
    if (lowercaseQuery.includes('chiffre') || lowercaseQuery.includes('ca') || lowercaseQuery.includes('revenu')) {
      return {
        thoughts: [
          "Initialisation de la requête sur la table `invoices`",
          `Application du filtre RLS: tenant_id = '${activeTenant.id}'`,
          "Calcul de la somme des montants des factures actives",
          "Calcul du chiffre d'affaires TTC en cours et encaissé",
          "Mise en forme des montants en Francs CFA (XAF)"
        ],
        content: `Pour l'entreprise **${activeTenant.name}**, le volume d'affaires total enregistré s'élève à **${formatFCFA(totalRevenue)} TTC**.\n\n* **Facturé encaissé (Payé) :** ${formatFCFA(paidAmount)}\n* **Facturé en souffrance (En retard) :** ${formatFCFA(outstandingAmount)}\n\nCe montant est calculé à partir de ${totalCount} facture(s) émise(s) sous validation RLS Supabase.`,
        suggestions: ["Combien de factures sont en retard ?", "Quel est le taux de recouvrement ?"]
      };
    } else if (lowercaseQuery.includes('retard') || lowercaseQuery.includes('impay') || lowercaseQuery.includes('souffrance')) {
      return {
        thoughts: [
          `Requête SELECT sur la table \`invoices\` pour tenant_id = '${activeTenant.id}'`,
          "Filtre WHERE status = 'en_retard' AND type = 'facture'",
          "Agrégation des montants et décompte des lignes",
          "Génération du résumé de relances"
        ],
        content: `Il y a actuellement **${outstandingCount}** facture(s) en retard de paiement pour un montant total de **${formatFCFA(outstandingAmount)}**.\n\nVous pouvez lancer des rappels automatiques (Email ou SMS) pour ces factures depuis le module de **Relances & Suivi** afin d'accélérer vos encaissements.`,
        suggestions: ["Lancer des relances", "Quel est mon chiffre d'affaires ?"]
      };
    } else if (lowercaseQuery.includes('recouvrement') || lowercaseQuery.includes('taux')) {
      return {
        thoughts: [
          `Vérification RLS validée pour le tenant '${activeTenant.id}'`,
          "Formule : (Montant Payé / Chiffre d'Affaires Total) * 100",
          `Calcul : (${paidAmount} / ${totalRevenue}) * 100 = ${recoveryRate}%`,
          "Génération du commentaire de performance"
        ],
        content: `Le taux de recouvrement pour **${activeTenant.name}** est de **${recoveryRate}%**.\n\n* **Payé :** ${formatFCFA(paidAmount)}\n* **Total Facturé :** ${formatFCFA(totalRevenue)}\n\n${recoveryRate > 75 ? "✅ Excellente performance de recouvrement commerciale." : "⚠️ Attention : Des relances ciblées sont recommandées pour améliorer votre trésorerie."}`,
        suggestions: ["Combien de factures sont en retard ?", "Quel est mon chiffre d'affaires ?"]
      };
    } else if (lowercaseQuery.includes('devis')) {
      return {
        thoughts: [
          "Requête sur les documents de type 'devis'",
          "Vérification de l'étanchéité multi-tenant RLS",
          "Décompte des devis en cours d'acceptation"
        ],
        content: `Vous avez actuellement **${devisPending}** devis en cours de négociation dans votre base de données commerciale.\n\nVous pouvez les consulter et les transformer en factures de manière transparente via le module **Factures & Devis**.`,
        suggestions: ["Créer un devis", "Quel est mon chiffre d'affaires ?"]
      };
    } else {
      return {
        thoughts: [
          "Analyse sémantique de la question",
          `Restriction RLS au tenant_id = '${activeTenant.id}'`,
          "Génération d'une réponse d'aide générale"
        ],
        content: `Je suis connecté à la base de données sécurisée de **${activeTenant.name}**.\n\nJe peux vous aider à analyser :\n* Votre **chiffre d'affaires** (CA, revenus)\n* Vos **retards de paiement** (factures impayées)\n* Votre **taux de recouvrement**\n\nQuelle analyse souhaitez-vous effectuer ?`,
        suggestions: ["Chiffre d'affaires", "Retards de paiement", "Taux de recouvrement"]
      };
    }
  };

  const handleSend = async (e, overrideText = null) => {
    e?.preventDefault();
    const textToSend = overrideText || input;
    if (!textToSend.trim() || isLoading) return;

    if (!overrideText) setInput('');
    setIsLoading(true);

    const userMessage = { role: 'user', content: textToSend.trim() };
    const currentMessages = [...messages, userMessage];

    // Add empty placeholder model message
    const nextIdx = currentMessages.length;
    setMessages([...currentMessages, { role: 'model', content: '', thoughts: '', suggestions: [] }]);

    const answer = getContextualAnswer(textToSend.trim());
    
    // Simulate SSE Streaming of thoughts first, then the content
    let accumulatedThoughts = '';
    let accumulatedContent = '';

    // Step 1: Stream thoughts step-by-step
    for (let i = 0; i < answer.thoughts.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 450));
      accumulatedThoughts += answer.thoughts[i] + '\n';
      setMessages(prev => {
        const updated = [...prev];
        updated[nextIdx] = {
          role: 'model',
          content: '',
          thoughts: accumulatedThoughts,
          suggestions: []
        };
        return updated;
      });
    }

    // Step 2: Stream final text content
    const words = answer.content.split(' ');
    for (let i = 0; i < words.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 60));
      accumulatedContent += (i === 0 ? '' : ' ') + words[i];
      setMessages(prev => {
        const updated = [...prev];
        updated[nextIdx] = {
          ...updated[nextIdx],
          content: accumulatedContent
        };
        return updated;
      });
    }

    // Step 3: Add suggestions at the end
    await new Promise(resolve => setTimeout(resolve, 200));
    setMessages(prev => {
      const updated = [...prev];
      updated[nextIdx] = {
        ...updated[nextIdx],
        suggestions: answer.suggestions
      };
      return updated;
    });

    setIsLoading(false);
  };

  return (
    <div 
      className="no-print" 
      style={{
        ...styles.chatContainer,
        transform: isOpen ? 'translateX(0)' : 'translateX(100%)'
      }}
    >
      {/* Header */}
      <div style={styles.chatHeader}>
        <div style={styles.chatHeaderLeft}>
          <Bot size={20} style={{ color: 'var(--color-accent-blue)' }} />
          <h3 style={styles.headerTitle}>Assistant Gemini IA</h3>
        </div>
        <button onClick={onClose} style={styles.closeBtn}>
          <X size={18} />
        </button>
      </div>

      {/* Messages viewport */}
      <div style={styles.messagesViewport}>
        {messages.map((m, idx) => (
          <div key={idx} style={{
            ...styles.messageRow,
            flexDirection: m.role === 'user' ? 'row-reverse' : 'row'
          }}>
            <div style={{
              ...styles.avatar,
              backgroundColor: m.role === 'user' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(16, 185, 129, 0.1)',
              borderColor: m.role === 'user' ? 'var(--color-accent-blue)' : 'var(--color-accent-green)'
            }}>
              {m.role === 'user' ? <User size={14} style={{ color: 'var(--color-accent-blue)' }} /> : <Bot size={14} style={{ color: 'var(--color-accent-green)' }} />}
            </div>

            <div style={styles.messageContentWrapper}>
              {/* Collapsible Thoughts (Reasoning chain) */}
              {m.role === 'model' && m.thoughts && (
                <div style={styles.thoughtsBox}>
                  <button 
                    onClick={() => toggleThought(idx)}
                    style={styles.thoughtsToggleBtn}
                  >
                    {expandedThoughts[idx] ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                    <BrainCircuit size={12} style={{ color: 'var(--color-accent-yellow)' }} />
                    <span style={styles.thoughtsToggleText}>
                      {m.content ? "Consulter la chaîne de réflexion" : "Analyse en cours..."}
                    </span>
                  </button>
                  {expandedThoughts[idx] && (
                    <div style={styles.thoughtsList}>
                      {m.thoughts.split('\n').filter(t => t.trim().length > 0).map((thought, tIdx) => (
                        <div key={tIdx} style={styles.thoughtLine}>
                          <span style={{ color: 'var(--color-accent-yellow)' }}>›</span>
                          <span>{thought}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Loader pulse */}
              {m.role === 'model' && !m.content && !expandedThoughts[idx] && (
                <div style={styles.thinkingLoader}>
                  <Loader2 size={12} style={styles.spinner} />
                  <span>Gemini analyse les factures...</span>
                </div>
              )}

              {/* Main response text bubble */}
              {m.content && (
                <div 
                  style={{
                    ...styles.messageBubble,
                    backgroundColor: m.role === 'user' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(255, 255, 255, 0.02)',
                    borderColor: m.role === 'user' ? 'rgba(59, 130, 246, 0.3)' : 'var(--color-border)'
                  }}
                >
                  {/* Clean line-by-line custom text layout for premium console feel */}
                  {m.content.split('\n').map((line, lIdx) => {
                    if (line.startsWith('* **')) {
                      // Bullet highlight
                      return <p key={lIdx} style={{ ...styles.messageLine, paddingLeft: '10px' }}>• {line.replace(/\* \*\*/g, '').replace(/\*\*/g, '')}</p>;
                    }
                    if (line.startsWith('###') || line.startsWith('**')) {
                      return <p key={lIdx} style={{ ...styles.messageLine, fontWeight: '700', color: '#FFFFFF', marginTop: '6px' }}>{line.replace(/\*\*/g, '')}</p>;
                    }
                    return <p key={lIdx} style={styles.messageLine}>{line.replace(/\*\*/g, '')}</p>;
                  })}
                </div>
              )}

              {/* Suggestion pills */}
              {m.role === 'model' && m.suggestions && m.suggestions.length > 0 && (
                <div style={styles.suggestionsList}>
                  {m.suggestions.map((sug, sIdx) => (
                    <button 
                      key={sIdx}
                      onClick={() => handleSend(null, sug)}
                      disabled={isLoading}
                      style={styles.suggestionPill}
                    >
                      {sug}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <form onSubmit={handleSend} style={styles.chatForm}>
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
          placeholder="Posez une question sur vos ventes..."
          rows={1}
          style={styles.textarea}
        />
        <button 
          type="submit" 
          disabled={!input.trim() || isLoading}
          style={{
            ...styles.sendBtn,
            opacity: (!input.trim() || isLoading) ? 0.5 : 1
          }}
        >
          <Send size={14} />
        </button>
      </form>
    </div>
  );
};

const styles = {
  chatContainer: {
    position: 'fixed',
    top: 0,
    right: 0,
    width: '380px',
    height: '100vh',
    backgroundColor: 'rgba(10, 10, 10, 0.95)',
    borderLeft: '1px solid rgba(59, 130, 246, 0.15)',
    zIndex: 999,
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '-10px 0 30px rgba(0, 0, 0, 0.5)',
    transition: 'transform 0.3s cubic-bezier(0.1, 0.8, 0.2, 1)'
  },
  chatHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.05)'
  },
  chatHeaderLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  headerTitle: {
    fontSize: '0.95rem',
    fontWeight: '700',
    color: '#FFFFFF'
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--color-text-secondary)',
    cursor: 'pointer',
    padding: '4px',
    display: 'flex',
    alignItems: 'center',
    transition: 'color 0.2s ease'
  },
  messagesViewport: {
    flexGrow: 1,
    padding: '20px',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  messageRow: {
    display: 'flex',
    gap: '10px',
    width: '100%'
  },
  avatar: {
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '1px solid',
    flexShrink: 0
  },
  messageContentWrapper: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    maxWidth: '85%'
  },
  thoughtsBox: {
    backgroundColor: '#050505',
    border: '1px solid rgba(245, 158, 11, 0.15)',
    borderRadius: '6px',
    overflow: 'hidden',
    marginBottom: '2px'
  },
  thoughtsToggleBtn: {
    width: '100%',
    background: 'none',
    border: 'none',
    padding: '6px 10px',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    color: 'var(--color-accent-yellow)',
    cursor: 'pointer',
    fontSize: '0.75rem',
    textAlign: 'left'
  },
  thoughtsToggleText: {
    fontWeight: '500'
  },
  thoughtsList: {
    borderTop: '1px solid rgba(245, 158, 11, 0.1)',
    padding: '8px 10px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    maxHeight: '150px',
    overflowY: 'auto',
    fontFamily: 'var(--font-mono)',
    fontSize: '0.7rem',
    color: '#9CA3AF',
    lineHeight: '1.4'
  },
  thoughtLine: {
    display: 'flex',
    gap: '6px'
  },
  thinkingLoader: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '0.75rem',
    color: 'var(--color-text-secondary)',
    paddingLeft: '4px'
  },
  spinner: {
    animation: 'spin 1.2s linear infinite'
  },
  messageBubble: {
    border: '1px solid',
    borderRadius: '8px',
    padding: '10px 12px',
    boxShadow: '0 2px 10px rgba(0, 0, 0, 0.15)'
  },
  messageLine: {
    fontSize: '0.85rem',
    lineHeight: '1.45',
    color: 'var(--color-text-secondary)',
    marginBottom: '4px'
  },
  suggestionsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    marginTop: '6px'
  },
  suggestionPill: {
    background: 'rgba(59, 130, 246, 0.05)',
    border: '1px solid rgba(59, 130, 246, 0.2)',
    borderRadius: '6px',
    padding: '6px 10px',
    color: '#60A5FA',
    fontSize: '0.75rem',
    textAlign: 'left',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  },
  chatForm: {
    padding: '16px',
    borderTop: '1px solid rgba(255, 255, 255, 0.05)',
    display: 'flex',
    alignItems: 'flex-end',
    gap: '10px',
    backgroundColor: '#050505'
  },
  textarea: {
    flexGrow: 1,
    background: 'rgba(255, 255, 255, 0.02)',
    border: '1px solid var(--color-border)',
    borderRadius: '6px',
    padding: '10px 12px',
    color: '#FFFFFF',
    fontSize: '0.85rem',
    outline: 'none',
    resize: 'none',
    overflowY: 'hidden',
    lineHeight: '1.4'
  },
  sendBtn: {
    backgroundColor: 'var(--color-accent-blue)',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '6px',
    padding: '10px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background-color 0.2s ease'
  }
};

// Injection of keyframes spin if not already present
if (!document.getElementById('spin-style')) {
  const styleEl = document.createElement('style');
  styleEl.id = 'spin-style';
  styleEl.textContent = `
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(styleEl);
}
