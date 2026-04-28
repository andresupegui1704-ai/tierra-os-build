// netlify/functions/lark-seed.js
// SLOT 1 — Popolamento dati demo Tierra (menu reale + tavoli + task)
// Chiamare DOPO lark-setup.js: POST /lark-seed

const LARK_BASE_URL = 'https://open.larksuite.com/open-apis';

// ═══════════════════════════════════════════════════════════════
// AUTH
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
  if (!data.tenant_access_token) throw new Error('Lark auth failed');
  return data.tenant_access_token;
}

// ═══════════════════════════════════════════════════════════════
// HELPER — Cerca tabella per nome
// ═══════════════════════════════════════════════════════════════
async function findTableId(token, tableName) {
  const baseToken = process.env.LARK_BASE_TOKEN;
  const res = await fetch(
    `${LARK_BASE_URL}/bitable/v1/apps/${baseToken}/tables?page_size=100`,
    { headers: { 'Authorization': `Bearer ${token}` } }
  );
  const data = await res.json();
  const table = data.data?.items?.find(t => t.name === tableName);
  if (!table) throw new Error(`Tabella "${tableName}" non trovata`);
  return table.table_id;
}

// ═══════════════════════════════════════════════════════════════
// HELPER — Batch insert records
// ═══════════════════════════════════════════════════════════════
async function batchInsert(token, tableName, records) {
  const baseToken = process.env.LARK_BASE_TOKEN;
  const tableId = await findTableId(token, tableName);

  const url = `${LARK_BASE_URL}/bitable/v1/apps/${baseToken}/tables/${tableId}/records/batch_create`;

  // Lark accetta max 500 records per batch
  const chunks = [];
  for (let i = 0; i < records.length; i += 500) {
    chunks.push(records.slice(i, i + 500));
  }

  let inserted = 0;
  for (const chunk of chunks) {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        records: chunk.map(fields => ({ fields })),
      }),
    });
    const data = await res.json();
    if (data.code !== 0) {
      throw new Error(`Errore insert in "${tableName}": ${JSON.stringify(data)}`);
    }
    inserted += chunk.length;
  }

  return { table: tableName, inserted };
}

// ═══════════════════════════════════════════════════════════════
// DATI DEMO
// ═══════════════════════════════════════════════════════════════

// 📦 MAGAZZINO — Menu Tierra completo
const MAGAZZINO_DATA = [
  // ─── BASI BOWL ───
  { 'Articolo': 'Riso Basmati', 'Categoria': 'Base (Bowl)', 'Prezzo': 0, 'Giacenza': 5000, 'Unità': 'gr', 'Soglia Minima': 1000, 'Disponibile': true, 'Descrizione': 'Base bianca per bowl' },
  { 'Articolo': 'Riso Integrale', 'Categoria': 'Base (Bowl)', 'Prezzo': 0, 'Giacenza': 3000, 'Unità': 'gr', 'Soglia Minima': 800, 'Disponibile': true, 'Descrizione': 'Base integrale biologica' },
  { 'Articolo': 'Quinoa Tricolore', 'Categoria': 'Base (Bowl)', 'Prezzo': 2, 'Giacenza': 2000, 'Unità': 'gr', 'Soglia Minima': 500, 'Disponibile': true, 'Descrizione': 'Base senza glutine +€2' },
  { 'Articolo': 'Insalata Mista', 'Categoria': 'Base (Bowl)', 'Prezzo': 0, 'Giacenza': 3000, 'Unità': 'gr', 'Soglia Minima': 500, 'Disponibile': true, 'Descrizione': 'Base verde' },
  { 'Articolo': 'Farro Perlato', 'Categoria': 'Base (Bowl)', 'Prezzo': 0, 'Giacenza': 2500, 'Unità': 'gr', 'Soglia Minima': 500, 'Disponibile': true },

  // ─── PROTEINE ───
  { 'Articolo': 'Pollo Grigliato', 'Categoria': 'Proteina', 'Prezzo': 0, 'Giacenza': 3000, 'Unità': 'gr', 'Soglia Minima': 800, 'Disponibile': true, 'Proteine': 25 },
  { 'Articolo': 'Tonno Pinne Gialle', 'Categoria': 'Proteina', 'Prezzo': 3, 'Giacenza': 2000, 'Unità': 'gr', 'Soglia Minima': 500, 'Disponibile': true, 'Proteine': 28, 'Allergeni': ['Pesce'] },
  { 'Articolo': 'Salmone Scottato', 'Categoria': 'Proteina', 'Prezzo': 3, 'Giacenza': 2000, 'Unità': 'gr', 'Soglia Minima': 500, 'Disponibile': true, 'Proteine': 22, 'Allergeni': ['Pesce'] },
  { 'Articolo': 'Gamberi Marinati', 'Categoria': 'Proteina', 'Prezzo': 4, 'Giacenza': 1500, 'Unità': 'gr', 'Soglia Minima': 400, 'Disponibile': true, 'Proteine': 20, 'Allergeni': ['Crostacei'] },
  { 'Articolo': 'Tofu Grigliato', 'Categoria': 'Proteina', 'Prezzo': 0, 'Giacenza': 2000, 'Unità': 'gr', 'Soglia Minima': 400, 'Disponibile': true, 'Proteine': 15, 'Allergeni': ['Soia'] },
  { 'Articolo': 'Edamame', 'Categoria': 'Proteina', 'Prezzo': 0, 'Giacenza': 1500, 'Unità': 'gr', 'Soglia Minima': 300, 'Disponibile': true, 'Allergeni': ['Soia'] },
  { 'Articolo': 'Uova Sode', 'Categoria': 'Proteina', 'Prezzo': 0, 'Giacenza': 100, 'Unità': 'pz', 'Soglia Minima': 20, 'Disponibile': true, 'Allergeni': ['Uova'] },
  { 'Articolo': 'Manzo Marinato', 'Categoria': 'Proteina', 'Prezzo': 4, 'Giacenza': 2000, 'Unità': 'gr', 'Soglia Minima': 500, 'Disponibile': true, 'Proteine': 26 },

  // ─── EXTRA / TOPPING ───
  { 'Articolo': 'Avocado', 'Categoria': 'Extra', 'Prezzo': 2, 'Giacenza': 40, 'Unità': 'pz', 'Soglia Minima': 10, 'Disponibile': true },
  { 'Articolo': 'Mango Fresco', 'Categoria': 'Extra', 'Prezzo': 2, 'Giacenza': 20, 'Unità': 'pz', 'Soglia Minima': 5, 'Disponibile': true },
  { 'Articolo': 'Alghe Wakame', 'Categoria': 'Extra', 'Prezzo': 1.5, 'Giacenza': 1000, 'Unità': 'gr', 'Soglia Minima': 200, 'Disponibile': true, 'Allergeni': ['Pesce'] },
  { 'Articolo': 'Semi di Sesamo', 'Categoria': 'Extra', 'Prezzo': 0.5, 'Giacenza': 500, 'Unità': 'gr', 'Soglia Minima': 100, 'Disponibile': true },
  { 'Articolo': 'Cipolla Rossa', 'Categoria': 'Extra', 'Prezzo': 0, 'Giacenza': 2000, 'Unità': 'gr', 'Soglia Minima': 500, 'Disponibile': true },
  { 'Articolo': 'Zenzero Sott\'aceto', 'Categoria': 'Extra', 'Prezzo': 0.5, 'Giacenza': 500, 'Unità': 'gr', 'Soglia Minima': 100, 'Disponibile': true },
  { 'Articolo': 'Pomodorini', 'Categoria': 'Extra', 'Prezzo': 0, 'Giacenza': 2000, 'Unità': 'gr', 'Soglia Minima': 500, 'Disponibile': true },
  { 'Articolo': 'Salsa Teriyaki', 'Categoria': 'Extra', 'Prezzo': 0, 'Giacenza': 1000, 'Unità': 'ml', 'Soglia Minima': 200, 'Disponibile': true, 'Allergeni': ['Soia', 'Glutine'] },
  { 'Articolo': 'Salsa Ponzu', 'Categoria': 'Extra', 'Prezzo': 0, 'Giacenza': 800, 'Unità': 'ml', 'Soglia Minima': 200, 'Disponibile': true, 'Allergeni': ['Soia'] },
  { 'Articolo': 'Salsa Spicy Mayo', 'Categoria': 'Extra', 'Prezzo': 0.5, 'Giacenza': 500, 'Unità': 'ml', 'Soglia Minima': 150, 'Disponibile': true, 'Allergeni': ['Uova'] },

  // ─── PIATTI PRANZO & CENA ───
  { 'Articolo': 'Poke Media Bowl', 'Categoria': 'Bowl', 'Sottocategoria': 'Poke', 'Prezzo': 13, 'Giacenza': 999, 'Unità': 'porzione', 'Disponibile': true, 'Descrizione': 'Base 150gr, verdure 150gr, proteina 130gr — scelta carne o veggie' },
  { 'Articolo': 'Poke Grande Bowl', 'Categoria': 'Bowl', 'Sottocategoria': 'Poke', 'Prezzo': 15, 'Giacenza': 999, 'Unità': 'porzione', 'Disponibile': true, 'Descrizione': 'Base 200gr, verdure 180gr, proteina 180gr — scelta carne o veggie' },
  { 'Articolo': 'Poke Bowl Media Pesce Misto', 'Categoria': 'Bowl', 'Sottocategoria': 'Poke Pesce', 'Prezzo': 18, 'Giacenza': 999, 'Unità': 'porzione', 'Disponibile': true, 'Descrizione': 'Pesce fresco del giorno — almeno tre varietà' },
  { 'Articolo': 'Poke Bowl Grande Pesce Misto', 'Categoria': 'Bowl', 'Sottocategoria': 'Poke Pesce', 'Prezzo': 24, 'Giacenza': 999, 'Unità': 'porzione', 'Disponibile': true, 'Descrizione': 'Pesce fresco del giorno — almeno tre varietà' },
  { 'Articolo': 'Catalana Mista', 'Categoria': 'Pranzo & Cena', 'Prezzo': 17, 'Giacenza': 999, 'Unità': 'porzione', 'Disponibile': true, 'Descrizione': 'Selezione pesce e crostacei crudi, olio EVO, limone', 'Allergeni': ['Pesce', 'Crostacei'] },
  { 'Articolo': 'Secondo con Contorno', 'Categoria': 'Secondi', 'Prezzo': 17, 'Giacenza': 999, 'Unità': 'porzione', 'Disponibile': true, 'Descrizione': 'Proteina del giorno con contorno di stagione' },
  { 'Articolo': 'Zuppa Inkas', 'Categoria': 'Pranzo & Cena', 'Prezzo': 17, 'Giacenza': 30, 'Unità': 'porzione', 'Soglia Minima': 5, 'Disponibile': true, 'Descrizione': 'Zuppa peruviana della tradizione' },

  // ─── BEVANDE ───
  { 'Articolo': 'Acqua Naturale 75cl', 'Categoria': 'Bevande', 'Prezzo': 2.5, 'Giacenza': 50, 'Unità': 'pz', 'Soglia Minima': 10, 'Disponibile': true },
  { 'Articolo': 'Acqua Frizzante 75cl', 'Categoria': 'Bevande', 'Prezzo': 2.5, 'Giacenza': 50, 'Unità': 'pz', 'Soglia Minima': 10, 'Disponibile': true },
  { 'Articolo': 'Coca Cola 33cl', 'Categoria': 'Bevande', 'Prezzo': 3, 'Giacenza': 40, 'Unità': 'pz', 'Soglia Minima': 10, 'Disponibile': true },
  { 'Articolo': 'Birra Artigianale 33cl', 'Categoria': 'Bevande', 'Prezzo': 5, 'Giacenza': 30, 'Unità': 'pz', 'Soglia Minima': 5, 'Disponibile': true, 'Allergeni': ['Glutine'] },
  { 'Articolo': 'Vino Bianco Calice', 'Categoria': 'Bevande', 'Prezzo': 5, 'Giacenza': 20, 'Unità': 'pz', 'Soglia Minima': 5, 'Disponibile': true },
  { 'Articolo': 'Vino Rosso Calice', 'Categoria': 'Bevande', 'Prezzo': 5, 'Giacenza': 20, 'Unità': 'pz', 'Soglia Minima': 5, 'Disponibile': true },
  { 'Articolo': 'Centrifuga Detox', 'Categoria': 'Bevande', 'Prezzo': 6, 'Giacenza': 15, 'Unità': 'porzione', 'Soglia Minima': 3, 'Disponibile': true, 'Descrizione': 'Sedano, mela, zenzero, limone' },

  // ─── CAFFETTERIA ───
  { 'Articolo': 'Espresso', 'Categoria': 'Caffetteria', 'Prezzo': 1.2, 'Giacenza': 999, 'Unità': 'pz', 'Disponibile': true },
  { 'Articolo': 'Cappuccino', 'Categoria': 'Caffetteria', 'Prezzo': 1.8, 'Giacenza': 999, 'Unità': 'pz', 'Disponibile': true, 'Allergeni': ['Lattosio'] },
  { 'Articolo': 'Macchiato', 'Categoria': 'Caffetteria', 'Prezzo': 1.4, 'Giacenza': 999, 'Unità': 'pz', 'Disponibile': true, 'Allergeni': ['Lattosio'] },
  { 'Articolo': 'Tè Verde', 'Categoria': 'Caffetteria', 'Prezzo': 3, 'Giacenza': 100, 'Unità': 'pz', 'Soglia Minima': 20, 'Disponibile': true },

  // ─── DOLCI ───
  { 'Articolo': 'Cheesecake Matcha', 'Categoria': 'Dolci', 'Prezzo': 6, 'Giacenza': 10, 'Unità': 'porzione', 'Soglia Minima': 2, 'Disponibile': true, 'Allergeni': ['Lattosio', 'Glutine', 'Uova'] },
  { 'Articolo': 'Tiramisù Tierra', 'Categoria': 'Dolci', 'Prezzo': 6, 'Giacenza': 8, 'Unità': 'porzione', 'Soglia Minima': 2, 'Disponibile': true, 'Allergeni': ['Lattosio', 'Uova'] },
  { 'Articolo': 'Macedonia Fresca', 'Categoria': 'Dolci', 'Prezzo': 5, 'Giacenza': 12, 'Unità': 'porzione', 'Soglia Minima': 3, 'Disponibile': true },
];

// 🍽️ TAVOLI — Interno I1-I8 + Esterno E1-E8
const TAVOLI_DATA = [
  // Interno
  { 'Codice': 'I1', 'Zona': 'Interno', 'Posti': 4, 'Stato': 'Libero', 'Posizione X': 2, 'Posizione Y': 0 },
  { 'Codice': 'I2', 'Zona': 'Interno', 'Posti': 4, 'Stato': 'Libero', 'Posizione X': 2, 'Posizione Y': 1 },
  { 'Codice': 'I3', 'Zona': 'Interno', 'Posti': 2, 'Stato': 'Libero', 'Posizione X': 1, 'Posizione Y': 2 },
  { 'Codice': 'I4', 'Zona': 'Interno', 'Posti': 4, 'Stato': 'Libero', 'Posizione X': 2, 'Posizione Y': 2 },
  { 'Codice': 'I5', 'Zona': 'Interno', 'Posti': 2, 'Stato': 'Libero', 'Posizione X': 1, 'Posizione Y': 3 },
  { 'Codice': 'I6', 'Zona': 'Interno', 'Posti': 4, 'Stato': 'Libero', 'Posizione X': 2, 'Posizione Y': 3 },
  { 'Codice': 'I7', 'Zona': 'Interno', 'Posti': 2, 'Stato': 'Libero', 'Posizione X': 1, 'Posizione Y': 4 },
  { 'Codice': 'I8', 'Zona': 'Interno', 'Posti': 4, 'Stato': 'Libero', 'Posizione X': 2, 'Posizione Y': 4 },
  // Esterno
  { 'Codice': 'E1', 'Zona': 'Esterno', 'Posti': 2, 'Stato': 'Libero', 'Posizione X': 0, 'Posizione Y': 0 },
  { 'Codice': 'E2', 'Zona': 'Esterno', 'Posti': 4, 'Stato': 'Libero', 'Posizione X': 0, 'Posizione Y': 1 },
  { 'Codice': 'E3', 'Zona': 'Esterno', 'Posti': 2, 'Stato': 'Libero', 'Posizione X': 1, 'Posizione Y': 0 },
  { 'Codice': 'E4', 'Zona': 'Esterno', 'Posti': 4, 'Stato': 'Libero', 'Posizione X': 1, 'Posizione Y': 1 },
  { 'Codice': 'E5', 'Zona': 'Esterno', 'Posti': 2, 'Stato': 'Libero', 'Posizione X': 2, 'Posizione Y': 0 },
  { 'Codice': 'E6', 'Zona': 'Esterno', 'Posti': 4, 'Stato': 'Libero', 'Posizione X': 2, 'Posizione Y': 1 },
  { 'Codice': 'E7', 'Zona': 'Esterno', 'Posti': 2, 'Stato': 'Libero', 'Posizione X': 0, 'Posizione Y': 3 },
  { 'Codice': 'E8', 'Zona': 'Esterno', 'Posti': 6, 'Stato': 'Libero', 'Posizione X': 1, 'Posizione Y': 3 },
];

// 📋 TASK PROTOCOLLO (ricorrenti giornalieri)
const TASK_DATA = [
  { 'Titolo': 'Accensione luci e impianti', 'Area': 'Sala', 'Priorità': 'Alta', 'Stato': 'In attesa', 'Ricorrente': true, 'Frequenza': 'Giornaliera', 'Reminder Attivo': true },
  { 'Titolo': 'Mise en place tavoli', 'Area': 'Sala', 'Priorità': 'Alta', 'Stato': 'In attesa', 'Ricorrente': true, 'Frequenza': 'Giornaliera', 'Reminder Attivo': true },
  { 'Titolo': 'Controllo prenotazioni', 'Area': 'Manager', 'Priorità': 'Alta', 'Stato': 'In attesa', 'Ricorrente': true, 'Frequenza': 'Giornaliera', 'Reminder Attivo': true },
  { 'Titolo': 'Accensione fornelli e controllo gas', 'Area': 'Cucina', 'Priorità': 'Alta', 'Stato': 'In attesa', 'Ricorrente': true, 'Frequenza': 'Giornaliera', 'Reminder Attivo': true },
  { 'Titolo': 'Preparazione basi bowl', 'Area': 'Cucina', 'Priorità': 'Alta', 'Stato': 'In attesa', 'Ricorrente': true, 'Frequenza': 'Giornaliera', 'Reminder Attivo': true },
  { 'Titolo': 'Controllo frigoriferi (temperature)', 'Area': 'Cucina', 'Priorità': 'Alta', 'Stato': 'In attesa', 'Ricorrente': true, 'Frequenza': 'Giornaliera', 'Reminder Attivo': true },
  { 'Titolo': 'Pulizia bagno clienti', 'Area': 'Sala', 'Priorità': 'Media', 'Stato': 'In attesa', 'Ricorrente': true, 'Frequenza': 'Giornaliera' },
  { 'Titolo': 'Chiusura cassa serale', 'Area': 'Manager', 'Priorità': 'Urgente', 'Stato': 'In attesa', 'Ricorrente': true, 'Frequenza': 'Giornaliera', 'Reminder Attivo': true },
  { 'Titolo': 'Pulizia cucina fine servizio', 'Area': 'Cucina', 'Priorità': 'Alta', 'Stato': 'In attesa', 'Ricorrente': true, 'Frequenza': 'Giornaliera' },
  { 'Titolo': 'Ordine fornitori settimanali', 'Area': 'Manager', 'Priorità': 'Alta', 'Stato': 'In attesa', 'Ricorrente': true, 'Frequenza': 'Settimanale', 'Reminder Attivo': true },
];

// 🏢 FORNITORI — I 12 attuali di Tierra
const FORNITORI_DATA = [
  { 'Nome': 'Zeno', 'Categoria': ['Carne'], 'Telefono': '+39 06 ...', 'Indirizzo': 'Roma', 'Attivo': true, 'Note': 'Lun e Gio · 8 prodotti' },
  { 'Nome': 'Market Cantalupo', 'Categoria': ['Verdura', 'Frutta'], 'Telefono': '+39 06 ...', 'Indirizzo': 'Roma', 'Attivo': true, 'Note': 'Mar e Ven · 3 prodotti' },
  { 'Nome': 'Mareamore', 'Categoria': ['Pesce'], 'Telefono': '+39 06 ...', 'Indirizzo': 'Roma', 'Attivo': true, 'Note': 'Mer e Sab · 5 prodotti' },
  { 'Nome': 'Sotto le Stelle', 'Categoria': ['Altro'], 'Telefono': '+39 06 ...', 'Indirizzo': 'Roma', 'Attivo': true, 'Note': 'Su richiesta · 5 prodotti' },
  { 'Nome': 'Fattoria Lucciano', 'Categoria': ['Verdura', 'Frutta'], 'Telefono': '+39 06 ...', 'Indirizzo': 'Roma', 'Attivo': true, 'Note': 'Ogni mattina 07:00 · 3 prodotti (Bio)' },
  { 'Nome': 'HQF Carni', 'Categoria': ['Carne'], 'Telefono': '+39 06 ...', 'Indirizzo': 'Roma', 'Attivo': true, 'Note': 'Mar e Ven · 2 prodotti' },
  { 'Nome': 'Cartaria Appia', 'Categoria': ['Altro'], 'Telefono': '+39 06 ...', 'Indirizzo': 'Roma', 'Attivo': true, 'Note': 'Su richiesta · 2 prodotti (Carta/Pulizia)' },
  { 'Nome': 'Pratesi', 'Categoria': ['Altro'], 'Telefono': '+39 06 ...', 'Indirizzo': 'Roma', 'Attivo': true, 'Note': 'Su richiesta · 1 prodotto' },
  { 'Nome': 'Metro Cash and Carry', 'Categoria': ['Generico'], 'Telefono': '+39 06 ...', 'Indirizzo': 'Roma', 'Attivo': true, 'Note': 'Su richiesta · 1 prodotto' },
  { 'Nome': 'Orsogna Vini', 'Categoria': ['Bevande'], 'Telefono': '+39 06 ...', 'Indirizzo': 'Roma', 'Attivo': true, 'Note': 'Su richiesta · 2 prodotti (Vini)' },
  { 'Nome': 'Rocchi Vini e Liquori', 'Categoria': ['Bevande'], 'Telefono': '+39 06 ...', 'Indirizzo': 'Roma', 'Attivo': true, 'Note': 'Su richiesta · 2 prodotti (Vini/Liquori)' },
  { 'Nome': 'Ghiaccio Roma', 'Categoria': ['Altro'], 'Telefono': '+39 06 ...', 'Indirizzo': 'Roma', 'Attivo': true, 'Note': 'Su richiesta · 1 prodotto (Ghiaccio)' },
];

// ═══════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════
exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: 'Method Not Allowed' };

  try {
    const token = await getAccessToken();

    const body = event.body ? JSON.parse(event.body) : {};
    const tablesToSeed = body.tables || ['Magazzino', 'Tavoli', 'Task', 'Fornitori'];

    const results = {};

    if (tablesToSeed.includes('Magazzino')) {
      results.Magazzino = await batchInsert(token, 'Magazzino', MAGAZZINO_DATA);
    }
    if (tablesToSeed.includes('Tavoli')) {
      results.Tavoli = await batchInsert(token, 'Tavoli', TAVOLI_DATA);
    }
    if (tablesToSeed.includes('Task')) {
      results.Task = await batchInsert(token, 'Task', TASK_DATA);
    }
    if (tablesToSeed.includes('Fornitori')) {
      results.Fornitori = await batchInsert(token, 'Fornitori', FORNITORI_DATA);
    }

    return {
      statusCode: 200,
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ok: true,
        message: 'Seed completato',
        results,
        timestamp: new Date().toISOString(),
      }, null, 2),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: false, error: err.message, stack: err.stack }),
    };
  }
};
