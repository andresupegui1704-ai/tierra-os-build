/**
 * TIERRA OS v9.4
 * TabOrdini.jsx — Modulo Ordini Tavolo
 * 
 * Features:
 *  - Polling 30s ordini tavolo selezionato
 *  - Form nuovo ordine
 *  - Bottoni: Cassa (stampa ESC/POS) + Pagato (webhook sito)
 *  - Colori stati: pending (yellow), paid (green), failed (red)
 * 
 * Integrazione App.jsx:
 *   import TabOrdini from './components/TabOrdini';
 *   ...
 *   {activeTab === 'ordini' && (
 *     <TabOrdini selectedTable={selectedTable} onTableFreed={handleTableFreed} />
 *   )}
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import tierraApi from '../lib/tierraApi';

const POLLING_INTERVAL_MS = 30000; // 30 secondi

// ============================================================================
// COMPONENT
// ============================================================================

export default function TabOrdini({ selectedTable = 'E3', onTableFreed = () => {} }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showNewOrderForm, setShowNewOrderForm] = useState(false);
  const [actionInProgress, setActionInProgress] = useState(null); // order_id in progress
  const pollingRef = useRef(null);

  // ----------------------------------------------------------------
  // FETCH ORDINI
  // ----------------------------------------------------------------
  const fetchOrders = useCallback(async () => {
    if (!selectedTable) return;
    try {
      setError(null);
      const res = await tierraApi.getTableOrders(selectedTable);
      const items = (res.orders || []).map(o => ({
        ...o,
        items: typeof o.items === 'string' ? JSON.parse(o.items || '[]') : (o.items || []),
      }));
      setOrders(items);
    } catch (err) {
      console.error('[TabOrdini] fetchOrders:', err);
      setError(err.message);
    }
  }, [selectedTable]);

  // ----------------------------------------------------------------
  // POLLING 30s
  // ----------------------------------------------------------------
  useEffect(() => {
    fetchOrders(); // immediate
    pollingRef.current = setInterval(fetchOrders, POLLING_INTERVAL_MS);
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [fetchOrders]);

  // ----------------------------------------------------------------
  // ACTIONS: STAMPA CASSA
  // ----------------------------------------------------------------
  const handlePrintCassa = async (order) => {
    setActionInProgress(order.order_id);
    try {
      await tierraApi.printCassa(order);
      alert(`🖨️ Stampa cassa avviata — ${order.order_id}`);
    } catch (err) {
      alert(`❌ Errore stampa: ${err.message}`);
    } finally {
      setActionInProgress(null);
    }
  };

  // ----------------------------------------------------------------
  // ACTIONS: MARCA PAGATO + WEBHOOK SITO
  // ----------------------------------------------------------------
  const handleMarkPaid = async (order) => {
    if (!confirm(`Confermi pagamento ordine ${order.order_id} (€${order.total_amount})?`)) {
      return;
    }
    setActionInProgress(order.order_id);
    try {
      await tierraApi.markOrderPaid(order.order_id, order.table_code, order.total_amount);
      // Webhook chiama sito → tavolo libero
      onTableFreed(order.table_code);
      await fetchOrders(); // refresh
      alert(`✅ Pagato: ${order.order_id} — Tavolo ${order.table_code} libero`);
    } catch (err) {
      alert(`❌ Errore pagamento: ${err.message}`);
    } finally {
      setActionInProgress(null);
    }
  };

  // ----------------------------------------------------------------
  // RENDER: BADGE STATO
  // ----------------------------------------------------------------
  const StatusBadge = ({ status, paymentStatus }) => {
    let color = '#FFC107'; // yellow (pending)
    let label = '⏳ In attesa';

    if (paymentStatus === 'paid') {
      color = '#4CAF50'; // green
      label = '✅ Pagato';
    } else if (status === 'cancelled') {
      color = '#F44336'; // red
      label = '❌ Annullato';
    } else if (status === 'paid') {
      color = '#4CAF50';
      label = '✅ Pagato';
    }

    return (
      <span style={{
        background: color,
        color: 'white',
        padding: '4px 10px',
        borderRadius: 12,
        fontSize: 12,
        fontWeight: 600,
      }}>
        {label}
      </span>
    );
  };

  // ----------------------------------------------------------------
  // RENDER PRINCIPALE
  // ----------------------------------------------------------------
  return (
    <div style={styles.container}>
      {/* HEADER */}
      <div style={styles.header}>
        <h2 style={styles.title}>
          🛒 Ordini Tavolo {selectedTable}
        </h2>
        <div style={styles.headerActions}>
          <button
            style={styles.btnPrimary}
            onClick={() => setShowNewOrderForm(true)}
          >
            ➕ Nuovo Ordine
          </button>
          <button
            style={styles.btnSecondary}
            onClick={fetchOrders}
            title="Refresh"
          >
            🔄
          </button>
        </div>
      </div>

      {/* ERROR BANNER */}
      {error && (
        <div style={styles.errorBanner}>
          ⚠️ {error}
        </div>
      )}

      {/* LISTA ORDINI */}
      {orders.length === 0 ? (
        <div style={styles.emptyState}>
          <p>Nessun ordine attivo per il tavolo {selectedTable}.</p>
          <small>Polling automatico ogni 30s</small>
        </div>
      ) : (
        <div style={styles.ordersList}>
          {orders.map((order) => (
            <div key={order.order_id} style={styles.orderCard}>
              <div style={styles.orderHeader}>
                <div>
                  <strong style={{ fontFamily: 'monospace' }}>
                    {order.order_id}
                  </strong>
                  <small style={{ marginLeft: 8, color: '#666' }}>
                    {order.created_at ? new Date(order.created_at).toLocaleTimeString('it-IT') : ''}
                  </small>
                </div>
                <StatusBadge status={order.status} paymentStatus={order.payment_status} />
              </div>

              {/* ITEMS */}
              <div style={styles.itemsList}>
                {(order.items || []).map((item, i) => (
                  <div key={i} style={styles.itemRow}>
                    <span>{item.qty}× {item.nome}</span>
                    <span>€ {(item.prezzo * item.qty).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              {/* NOTES */}
              {order.notes && (
                <div style={styles.notes}>
                  📝 {order.notes}
                </div>
              )}

              {/* TOTAL */}
              <div style={styles.totalRow}>
                <strong>TOTALE</strong>
                <strong>€ {Number(order.total_amount || 0).toFixed(2)}</strong>
              </div>

              {/* ACTIONS */}
              <div style={styles.orderActions}>
                <button
                  style={styles.btnCassa}
                  onClick={() => handlePrintCassa(order)}
                  disabled={actionInProgress === order.order_id}
                >
                  🖨️ Cassa
                </button>
                <button
                  style={styles.btnPagato}
                  onClick={() => handleMarkPaid(order)}
                  disabled={actionInProgress === order.order_id || order.payment_status === 'paid'}
                >
                  ✓ Pagato
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL NUOVO ORDINE */}
      {showNewOrderForm && (
        <NewOrderModal
          tableCode={selectedTable}
          onClose={() => setShowNewOrderForm(false)}
          onCreated={() => {
            setShowNewOrderForm(false);
            fetchOrders();
          }}
        />
      )}
    </div>
  );
}

// ============================================================================
// MODAL NUOVO ORDINE
// ============================================================================

function NewOrderModal({ tableCode, onClose, onCreated }) {
  const [items, setItems] = useState([{ nome: '', qty: 1, prezzo: 0 }]);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const addItem = () => setItems([...items, { nome: '', qty: 1, prezzo: 0 }]);
  const removeItem = (i) => setItems(items.filter((_, idx) => idx !== i));
  const updateItem = (i, field, value) => {
    const newItems = [...items];
    newItems[i] = { ...newItems[i], [field]: value };
    setItems(newItems);
  };

  const total = items.reduce((sum, it) => sum + (Number(it.prezzo) * Number(it.qty)), 0);

  const handleSubmit = async () => {
    const validItems = items.filter(it => it.nome && it.qty > 0);
    if (validItems.length === 0) {
      alert('Aggiungi almeno una voce');
      return;
    }
    setSubmitting(true);
    try {
      await tierraApi.createTableOrder(tableCode, validItems, null, notes);
      onCreated();
    } catch (err) {
      alert(`❌ Errore: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={styles.modalOverlay}>
      <div style={styles.modalContent}>
        <h3>Nuovo Ordine — Tavolo {tableCode}</h3>

        {items.map((item, i) => (
          <div key={i} style={styles.modalItemRow}>
            <input
              style={{ ...styles.modalInput, flex: 2 }}
              placeholder="Nome piatto"
              value={item.nome}
              onChange={(e) => updateItem(i, 'nome', e.target.value)}
            />
            <input
              style={{ ...styles.modalInput, width: 60 }}
              type="number"
              min="1"
              value={item.qty}
              onChange={(e) => updateItem(i, 'qty', Number(e.target.value))}
            />
            <input
              style={{ ...styles.modalInput, width: 80 }}
              type="number"
              step="0.01"
              placeholder="€"
              value={item.prezzo}
              onChange={(e) => updateItem(i, 'prezzo', Number(e.target.value))}
            />
            {items.length > 1 && (
              <button style={styles.btnRemove} onClick={() => removeItem(i)}>
                ✕
              </button>
            )}
          </div>
        ))}

        <button style={styles.btnAddItem} onClick={addItem}>
          + Aggiungi voce
        </button>

        <textarea
          style={styles.textarea}
          placeholder="Note (opzionale)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />

        <div style={styles.modalTotal}>
          TOTALE: € {total.toFixed(2)}
        </div>

        <div style={styles.modalActions}>
          <button style={styles.btnSecondary} onClick={onClose}>
            Annulla
          </button>
          <button
            style={styles.btnPrimary}
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? 'Salvataggio…' : 'Conferma'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = {
  container: {
    padding: 16,
    fontFamily: 'system-ui, -apple-system, sans-serif',
    maxWidth: 800,
    margin: '0 auto',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    margin: 0,
    fontSize: 22,
  },
  headerActions: {
    display: 'flex',
    gap: 8,
  },
  errorBanner: {
    background: '#FFEBEE',
    color: '#C62828',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  emptyState: {
    textAlign: 'center',
    padding: 40,
    color: '#666',
    border: '2px dashed #DDD',
    borderRadius: 12,
  },
  ordersList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  orderCard: {
    background: 'white',
    border: '1px solid #E0E0E0',
    borderRadius: 12,
    padding: 16,
    boxShadow: '0 2px 4px rgba(0,0,0,0.04)',
  },
  orderHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  itemsList: {
    margin: '8px 0',
    fontSize: 14,
  },
  itemRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '4px 0',
    borderBottom: '1px solid #F5F5F5',
  },
  notes: {
    fontSize: 13,
    color: '#666',
    fontStyle: 'italic',
    margin: '8px 0',
    padding: 8,
    background: '#FFF8E1',
    borderRadius: 6,
  },
  totalRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '8px 0',
    borderTop: '2px solid #333',
    marginTop: 8,
    fontSize: 16,
  },
  orderActions: {
    display: 'flex',
    gap: 8,
    marginTop: 12,
  },
  btnPrimary: {
    background: '#2E7D32',
    color: 'white',
    border: 'none',
    padding: '10px 18px',
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
  },
  btnSecondary: {
    background: '#F5F5F5',
    color: '#333',
    border: '1px solid #DDD',
    padding: '10px 14px',
    borderRadius: 8,
    cursor: 'pointer',
  },
  btnCassa: {
    flex: 1,
    background: '#1976D2',
    color: 'white',
    border: 'none',
    padding: '12px',
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
  },
  btnPagato: {
    flex: 1,
    background: '#4CAF50',
    color: 'white',
    border: 'none',
    padding: '12px',
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modalContent: {
    background: 'white',
    padding: 24,
    borderRadius: 12,
    width: '90%',
    maxWidth: 500,
    maxHeight: '90vh',
    overflowY: 'auto',
  },
  modalItemRow: {
    display: 'flex',
    gap: 8,
    marginBottom: 8,
    alignItems: 'center',
  },
  modalInput: {
    padding: 8,
    border: '1px solid #DDD',
    borderRadius: 6,
    fontSize: 14,
  },
  btnAddItem: {
    background: 'transparent',
    color: '#2E7D32',
    border: '1px dashed #2E7D32',
    padding: 10,
    borderRadius: 6,
    cursor: 'pointer',
    width: '100%',
    marginBottom: 12,
  },
  btnRemove: {
    background: '#F44336',
    color: 'white',
    border: 'none',
    width: 32,
    height: 32,
    borderRadius: '50%',
    cursor: 'pointer',
  },
  textarea: {
    width: '100%',
    minHeight: 60,
    padding: 8,
    border: '1px solid #DDD',
    borderRadius: 6,
    fontSize: 14,
    fontFamily: 'inherit',
    boxSizing: 'border-box',
    marginTop: 8,
  },
  modalTotal: {
    fontSize: 18,
    fontWeight: 700,
    textAlign: 'right',
    margin: '16px 0',
    padding: 12,
    background: '#F5F5F5',
    borderRadius: 6,
  },
  modalActions: {
    display: 'flex',
    gap: 8,
    justifyContent: 'flex-end',
  },
};
