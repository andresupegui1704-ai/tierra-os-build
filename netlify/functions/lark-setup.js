// netlify/functions/lark-setup.js
// SLOT 1 — Setup automatico Lark Base (crea 5 tabelle da zero)
// Chiamare UNA SOLA VOLTA al primo avvio: POST /lark-setup

const LARK_BASE_URL = 'https://open.larksuite.com/open-apis';

// ═══════════════════════════════════════════════════════════════
// HELPER — Ottieni tenant_access_token
// ═══════════════════════════════════════════════════════════════
async function getAccessToken() {
  const res = await fetch(`${LARK_BASE_URL}/auth/v3/tenant_access_token/internal`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      app_id: process.env.LARK_APP_ID,
      app_secret: process.env.LARK_APP_SECRET,
    }),
  });
  const data = await res.json();
  if (!data.tenant_access_token) {
    throw new Error(`Lark auth failed: ${JSON.stringify(data)}`);
  }
  return data.tenant_access_token;
}

// ═══════════════════════════════════════════════════════════════
// HELPER — Crea tabella con campi
// ═══════════════════════════════════════════════════════════════
async function createTable(token, tableName, fields) {
  const baseToken = process.env.LARK_BASE_TOKEN;
  const url = `${LARK_BASE_URL}/bitable/v1/apps/${baseToken}/tables`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      table: {
        name: tableName,
        default_view_name: 'Vista principale',
        fields: fields,
      },
    }),
  });

  const data = await res.json();
  if (data.code !== 0) {
    throw new Error(`Errore creazione "${tableName}": ${JSON.stringify(data)}`);
  }
  return data.data.table_id;
}

// ═══════════════════════════════════════════════════════════════
// SCHEMA TABELLE — Tierra OS
// ═══════════════════════════════════════════════════════════════
const SCHEMAS = {
  // ─────────────────────────────────────────────────────
  // 1. MAGAZZINO — Articoli, giacenza, categorie, foto
  // ─────────────────────────────────────────────────────
  Magazzino: [
    { field_name: 'Articolo', type: 1 }, // Text
    { field_name: 'Categoria', type: 3, property: { // SingleSelect
      options: [
        { name: 'Colazioni', color: 0 },
        { name: 'Antipasti', color: 1 },
        { name: 'Pranzo & Cena', color: 2 },
        { name: 'Bowl', color: 3 },
        { name: 'Secondi', color: 4 },
        { name: 'Contorni', color: 5 },
        { name: 'Bevande', color: 6 },
        { name: 'Dolci', color: 7 },
        { name: 'Caffetteria', color: 8 },
        { name: 'Base (Bowl)', color: 9 },
        { name: 'Proteina', color: 10 },
        { name: 'Extra', color: 11 },
        { name: 'Special', color: 12 },
      ]
    }},
    { field_name: 'Sottocategoria', type: 1 }, // Text (es: "Poke Bowl", "Insalata")
    { field_name: 'Prezzo', type: 2, property: { formatter: '0.00' } }, // Number €
    { field_name: 'Giacenza', type: 2, property: { formatter: '0' } }, // Number stock
    { field_name: 'Unità', type: 3, property: { // SingleSelect
      options: [
        { name: 'pz', color: 0 },
        { name: 'kg', color: 1 },
        { name: 'gr', color: 2 },
        { name: 'lt', color: 3 },
        { name: 'ml', color: 4 },
        { name: 'porzione', color: 5 },
      ]
    }},
    { field_name: 'Soglia Minima', type: 2, property: { formatter: '0' } }, // Alert se giacenza <
    { field_name: 'Foto', type: 17 }, // Attachment (immagini)
    { field_name: 'Descrizione', type: 1 }, // Text lungo
    { field_name: 'Ingredienti', type: 4, property: { // MultiSelect (per bowl/secondo)
      options: [] // Popolato dinamicamente
    }},
    { field_name: 'Fornitore', type: 1 }, // Text (link futuro a Fornitori)
    { field_name: 'Disponibile', type: 7 }, // Checkbox (toggle quick disable)
    { field_name: 'Carbo', type: 2, property: { formatter: '0' } }, // Bonus: nutrition
    { field_name: 'Proteine', type: 2, property: { formatter: '0' } },
    { field_name: 'Allergeni', type: 4, property: { // MultiSelect
      options: [
        { name: 'Glutine', color: 0 },
        { name: 'Lattosio', color: 1 },
        { name: 'Uova', color: 2 },
        { name: 'Frutta a guscio', color: 3 },
        { name: 'Pesce', color: 4 },
        { name: 'Crostacei', color: 5 },
        { name: 'Soia', color: 6 },
      ]
    }},
  ],

  // ─────────────────────────────────────────────────────
  // 2. ORDINI — Ordini tavoli con articoli, pagamento
  // ─────────────────────────────────────────────────────
  Ordini: [
    { field_name: 'Numero Ordine', type: 1 }, // Text (es: "ORD-20260424-001")
    { field_name: 'Tavolo', type: 1 }, // Text (I1, E3, etc.)
    { field_name: 'Zona', type: 3, property: {
      options: [
        { name: 'Interno', color: 0 },
        { name: 'Esterno', color: 1 },
        { name: 'Asporto', color: 2 },
      ]
    }},
    { field_name: 'Coperti', type: 2, property: { formatter: '0' } },
    { field_name: 'Articoli JSON', type: 1 }, // Text (JSON stringified items)
    { field_name: 'Totale', type: 2, property: { formatter: '0.00' } },
    { field_name: 'Stato', type: 3, property: {
      options: [
        { name: 'Nuovo', color: 0 },
        { name: 'In preparazione', color: 1 },
        { name: 'Pronto', color: 2 },
        { name: 'Consegnato', color: 3 },
        { name: 'Pagato', color: 4 },
        { name: 'Annullato', color: 5 },
      ]
    }},
    { field_name: 'Metodo Pagamento', type: 3, property: {
      options: [
        { name: 'Contanti', color: 0 },
        { name: 'POS', color: 1 },
        { name: 'Buoni Pasto Edenred', color: 2 },
        { name: 'Buoni Pasto Ticket', color: 3 },
        { name: 'Buoni Pasto Sodexo', color: 4 },
        { name: 'Credito Interno', color: 5 },
        { name: 'Misto', color: 6 },
      ]
    }},
    { field_name: 'Pagamento Dettaglio', type: 1 }, // JSON (es: {"contanti":10,"pos":20})
    { field_name: 'Cameriere', type: 1 }, // Text (nome utente)
    { field_name: 'Ora Apertura', type: 5 }, // DateTime
    { field_name: 'Ora Chiusura', type: 5 },
    { field_name: 'Note', type: 1 },
    { field_name: 'Scontrino Stampato', type: 7 }, // Checkbox
  ],

  // ─────────────────────────────────────────────────────
  // 3. TAVOLI — Configurazione tavoli Interno/Esterno
  // ─────────────────────────────────────────────────────
  Tavoli: [
    { field_name: 'Codice', type: 1 }, // "I1", "E3"
    { field_name: 'Zona', type: 3, property: {
      options: [
        { name: 'Interno', color: 0 },
        { name: 'Esterno', color: 1 },
      ]
    }},
    { field_name: 'Posti', type: 2, property: { formatter: '0' } },
    { field_name: 'Stato', type: 3, property: {
      options: [
        { name: 'Libero', color: 0 },
        { name: 'Occupato', color: 1 },
        { name: 'Riservato', color: 2 },
        { name: 'Fuori Servizio', color: 3 },
      ]
    }},
    { field_name: 'Ordine Attivo', type: 1 }, // ID ordine corrente
    { field_name: 'Cliente', type: 1 }, // Nome cliente (prenotazione)
    { field_name: 'Posizione X', type: 2, property: { formatter: '0' } }, // Layout coords
    { field_name: 'Posizione Y', type: 2, property: { formatter: '0' } },
  ],

  // ─────────────────────────────────────────────────────
  // 4. FORNITORI — Anagrafica fornitori
  // ─────────────────────────────────────────────────────
  Fornitori: [
    { field_name: 'Nome', type: 1 },
    { field_name: 'Categoria', type: 4, property: {
      options: [
        { name: 'Carne', color: 0 },
        { name: 'Pesce', color: 1 },
        { name: 'Verdura', color: 2 },
        { name: 'Frutta', color: 3 },
        { name: 'Bevande', color: 4 },
        { name: 'Latticini', color: 5 },
        { name: 'Pane/Pasta', color: 6 },
        { name: 'Pulizia', color: 7 },
        { name: 'Altro', color: 8 },
      ]
    }},
    { field_name: 'Email', type: 1 },
    { field_name: 'Telefono', type: 1 },
    { field_name: 'Indirizzo', type: 1 },
    { field_name: 'P.IVA', type: 1 },
    { field_name: 'Note', type: 1 },
    { field_name: 'Attivo', type: 7 },
  ],

  // ─────────────────────────────────────────────────────
  // 5. FATTURE — Fatture fornitori con OCR/Vision
  // ─────────────────────────────────────────────────────
  Fatture: [
    { field_name: 'Numero', type: 1 },
    { field_name: 'Fornitore', type: 1 },
    { field_name: 'Data Fattura', type: 5 }, // Date
    { field_name: 'Data Scadenza', type: 5 },
    { field_name: 'Importo', type: 2, property: { formatter: '0.00' } },
    { field_name: 'Stato', type: 3, property: {
      options: [
        { name: 'Da pagare', color: 0 },
        { name: 'Pagata', color: 1 },
        { name: 'Scaduta', color: 2 },
        { name: 'Contestata', color: 3 },
      ]
    }},
    { field_name: 'Metodo Pagamento', type: 3, property: {
      options: [
        { name: 'Bonifico', color: 0 },
        { name: 'Contanti', color: 1 },
        { name: 'Carta', color: 2 },
        { name: 'RiBa', color: 3 },
      ]
    }},
    { field_name: 'File', type: 17 }, // Attachment (PDF/foto)
    { field_name: 'Estratto IA', type: 1 }, // JSON estratti da Vision
    { field_name: 'Note', type: 1 },
  ],

  // ─────────────────────────────────────────────────────
  // 6. TASK — Task & Protocollo giornaliero
  // ─────────────────────────────────────────────────────
  Task: [
    { field_name: 'Titolo', type: 1 },
    { field_name: 'Descrizione', type: 1 },
    { field_name: 'Area', type: 3, property: {
      options: [
        { name: 'Sala', color: 0 },
        { name: 'Cucina', color: 1 },
        { name: 'Bar', color: 2 },
        { name: 'Manager', color: 3 },
        { name: 'Proprietà', color: 4 },
      ]
    }},
    { field_name: 'Priorità', type: 3, property: {
      options: [
        { name: 'Bassa', color: 0 },
        { name: 'Media', color: 1 },
        { name: 'Alta', color: 2 },
        { name: 'Urgente', color: 3 },
      ]
    }},
    { field_name: 'Stato', type: 3, property: {
      options: [
        { name: 'In attesa', color: 0 },
        { name: 'In corso', color: 1 },
        { name: 'Completato', color: 2 },
        { name: 'Annullato', color: 3 },
      ]
    }},
    { field_name: 'Assegnato a', type: 1 }, // Nome utente
    { field_name: 'Ricorrente', type: 7 }, // Checkbox (protocollo)
    { field_name: 'Frequenza', type: 3, property: {
      options: [
        { name: 'Giornaliera', color: 0 },
        { name: 'Settimanale', color: 1 },
        { name: 'Mensile', color: 2 },
      ]
    }},
    { field_name: 'Scadenza', type: 5 },
    { field_name: 'Reminder Attivo', type: 7 },
    { field_name: 'Completato da', type: 1 },
    { field_name: 'Ora Completamento', type: 5 },
  ],

  // ─────────────────────────────────────────────────────
  // 7. VENDITE — Log vendite giornaliere (per chiusura cassa)
  // ─────────────────────────────────────────────────────
  Vendite: [
    { field_name: 'Data', type: 5 },
    { field_name: 'Ordine ID', type: 1 },
    { field_name: 'Totale', type: 2, property: { formatter: '0.00' } },
    { field_name: 'Metodo', type: 3, property: {
      options: [
        { name: 'Contanti', color: 0 },
        { name: 'POS', color: 1 },
        { name: 'Buoni Pasto', color: 2 },
        { name: 'Credito', color: 3 },
      ]
    }},
    { field_name: 'Cameriere', type: 1 },
    { field_name: 'Tavolo', type: 1 },
  ],
};

// ═══════════════════════════════════════════════════════════════
// MAIN HANDLER
// ═══════════════════════════════════════════════════════════════
exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: 'Method Not Allowed' };
  }

  try {
    const token = await getAccessToken();
    const results = {};

    // Parametro opzionale: creare solo alcune tabelle
    const body = event.body ? JSON.parse(event.body) : {};
    const tablesToCreate = body.tables || Object.keys(SCHEMAS);

    for (const tableName of tablesToCreate) {
      if (!SCHEMAS[tableName]) {
        results[tableName] = { error: 'Schema non trovato' };
        continue;
      }

      try {
        const tableId = await createTable(token, tableName, SCHEMAS[tableName]);
        results[tableName] = {
          success: true,
          table_id: tableId,
          fields_count: SCHEMAS[tableName].length,
        };
      } catch (err) {
        results[tableName] = { error: err.message };
      }
    }

    return {
      statusCode: 200,
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ok: true,
        message: 'Setup Lark Base completato',
        results,
        timestamp: new Date().toISOString(),
      }, null, 2),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: false, error: err.message }),
    };
  }
};
