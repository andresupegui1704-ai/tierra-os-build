import { useState, useRef } from "react";

// ─── LARK ────────────────────────────────────────────────────────────────────
// App ID pubblico (non è segreto). Tutto il resto (Secret, Chat ID, Base Token)
// vive solo come env var Netlify, invisibile al bundle frontend.
const LARK_APP_ID = "cli_a96eb75ba5e1de17";

// Endpoint delle Netlify Functions — in dev locale override con window.__FN_BASE
const FN_BASE = (typeof window !== "undefined" && window.__FN_BASE) || "";
const FN = (name) => `${FN_BASE}/.netlify/functions/${name}`;

// ─── TIERRA API SDK ──────────────────────────────────────────────────────────
const TIERRA_API_BASE = "https://tierra-bistro-menu.preview.emergentagent.com";
const TIERRA_TOKEN    = "tierra2024";

async function tierraRequest(path, { method="GET", body, auth=true }={}) {
  const headers = {"Content-Type":"application/json"};
  if(auth) headers["X-Tierra-Token"] = TIERRA_TOKEN;
  try {
    const res = await fetch(`${TIERRA_API_BASE}${path}`, {
      method, headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    if(!res.ok) { const err = await res.json().catch(()=>({})); throw new Error(err?.detail || res.statusText); }
    return res.json();
  } catch(e) { console.error(`Tierra API [${path}]:`, e.message); return null; }
}

async function syncMenuToSite(items) {
  return tierraRequest("/api/menu/availability", {
    method:"PATCH",
    body:{ items: items.map(i=>({
      ...(i.id && !i.id.startsWith("m") ? {id:i.id} : {name:i.nome}),
      available: i.disponibile,
    }))}
  });
}

// ─── ADMIN SITE SDK (JWT) ─────────────────────────────────────────────────────
let _adminToken = localStorage.getItem("tierra_admin_token") || null;
let _adminTokenExp = parseInt(localStorage.getItem("tierra_admin_token_exp") || "0");

async function adminLogin(email, password) {
  try {
    const res = await fetch(`${TIERRA_API_BASE}/api/admin/login`, {
      method: "POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify({email, password}),
    });
    if(!res.ok) throw new Error("Credenziali non valide");
    const data = await res.json();
    _adminToken = data.access_token;
    _adminTokenExp = Date.now() + 23*3600*1000; // 23h (JWT valido 24h)
    localStorage.setItem("tierra_admin_token", _adminToken);
    localStorage.setItem("tierra_admin_token_exp", String(_adminTokenExp));
    return {ok:true};
  } catch(e) {
    return {ok:false, error:e.message};
  }
}

function adminLogout() {
  _adminToken = null;
  _adminTokenExp = 0;
  localStorage.removeItem("tierra_admin_token");
  localStorage.removeItem("tierra_admin_token_exp");
}

function isAdminLoggedIn() {
  return _adminToken && Date.now() < _adminTokenExp;
}

async function adminRequest(path, {method="GET", body}={}) {
  if(!isAdminLoggedIn()) return {error:"NOT_LOGGED_IN"};
  try {
    const res = await fetch(`${TIERRA_API_BASE}${path}`, {
      method,
      headers:{
        "Content-Type":"application/json",
        "Authorization":`Bearer ${_adminToken}`,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if(res.status === 401) { adminLogout(); return {error:"TOKEN_EXPIRED"}; }
    if(!res.ok) { const err = await res.json().catch(()=>({})); throw new Error(err?.detail || res.statusText); }
    return {ok:true, data: await res.json()};
  } catch(e) {
    return {error:e.message};
  }
}

const adminMenu = {
  list:   () => adminRequest("/api/admin/menu/items"),
  create: (data) => adminRequest("/api/admin/menu/items", {method:"POST", body:data}),
  update: (id, patch) => adminRequest(`/api/admin/menu/items/${id}`, {method:"PATCH", body:patch}),
  del:    (id) => adminRequest(`/api/admin/menu/items/${id}`, {method:"DELETE"}),
  toggle: (id) => adminRequest(`/api/admin/menu/items/${id}/toggle`, {method:"POST"}),
};

// Categorie reali del sito Tierra
const SITE_CATEGORIES = [
  {slug:"colazione",    label:"Colazione"},
  {slug:"pranzo-cena",  label:"Pranzo / Cena"},
  {slug:"aperitierra",  label:"Aperitierra"},
  {slug:"caffetteria",  label:"Caffetteria"},
  {slug:"bevande",      label:"Bevande"},
  {slug:"contorno",     label:"Contorno"},
];

// Customization groups predefiniti per Poke e Secondo con Contorno
// DEFAULTS — usati solo al primo avvio, poi sovrascritti da localStorage
const DEFAULT_PROTEINE_PREMIUM = [
  {name:"Pastrami di Salmone", price:3.00, desc:"Cotto con spezie, soia, sesamo e salsa teriyaki"},
  {name:"Pastrami di Baccalà", price:3.00, desc:"Cotto con spezie, soia, sesamo e salsa teriyaki"},
  {name:"Pastrami di Tonno", price:3.00, desc:"Cotto con spezie, soia, sesamo e salsa teriyaki"},
  {name:"Polpo con buccia di limone", price:3.00, desc:""},
  {name:"Ceviche di Salmone", price:3.00, desc:"Pesce abbattuto a bordo e marinato"},
  {name:"Ceviche di Baccalà", price:3.00, desc:"Pesce abbattuto a bordo e marinato"},
  {name:"Ceviche di Tonno", price:3.00, desc:"Pesce abbattuto a bordo e marinato"},
  {name:"Gamberi stile Orientale", price:3.00, desc:"Pesce abbattuto a bordo e marinato"},
];
const DEFAULT_PROTEINE_STANDARD = [
  {name:"Pollo stile Orientale / Curry", price:2.00, desc:""},
  {name:"Polpette in salsa di Limone", price:2.00, desc:""},
  {name:"Topinambur", price:2.00, desc:"Vegetariano"},
  {name:"Zucca", price:2.00, desc:"Vegetariano"},
  {name:"Hummus di Ceci Classico", price:2.00, desc:"Vegetariano"},
  {name:"Hummus alla Melanzana Arrostita", price:2.00, desc:"Vegetariano"},
  {name:"Hummus di Zucca", price:2.00, desc:"Vegetariano"},
  {name:"Hummus alla Rapa Rossa", price:2.00, desc:"Vegetariano"},
  {name:"Hummus al Topinambur", price:2.00, desc:"Vegetariano"},
  {name:"Hummus al Carciofo", price:2.00, desc:"Vegetariano"},
  {name:"Hummus all'Orientale", price:2.00, desc:"Vegetariano"},
];
const DEFAULT_EXTRAS_AGGIUNTIVI = [
  {name:"Avocado", price:3.00, desc:""},
  {name:"Mezza Focaccia", price:3.00, desc:""},
  {name:"Focaccia Intera", price:5.00, desc:""},
  {name:"Porzione Riso Bianco", price:3.00, desc:"Extra"},
  {name:"Porzione Riso Integrale", price:3.00, desc:"Extra"},
  {name:"Porzione Riso Venere", price:3.00, desc:"Extra"},
  {name:"Porzione Couscous di Mais", price:3.00, desc:"Extra"},
];
const DEFAULT_BASI_CARBOIDRATI = [
  {name:"Riso Bianco", price:0, desc:"Incluso"},
  {name:"Riso Integrale", price:0, desc:"Incluso"},
  {name:"Riso Venere", price:0, desc:"Incluso"},
  {name:"Couscous di Mais", price:0, desc:"Incluso"},
];

// Loader da localStorage con fallback al default
function loadOpz(key, defaultArr) {
  try {
    const s = localStorage.getItem("tierra_opz_"+key);
    if(s) return JSON.parse(s);
  } catch(e) {}
  return defaultArr;
}
function saveOpz(key, arr) {
  try { localStorage.setItem("tierra_opz_"+key, JSON.stringify(arr)); } catch(e) {}
}

// Getter dinamici — leggono sempre da localStorage
const getBasi       = () => loadOpz("basi", DEFAULT_BASI_CARBOIDRATI);
const getProtPrem   = () => loadOpz("prot_prem", DEFAULT_PROTEINE_PREMIUM);
const getProtStd    = () => loadOpz("prot_std", DEFAULT_PROTEINE_STANDARD);
const getExtras     = () => loadOpz("extras", DEFAULT_EXTRAS_AGGIUNTIVI);

// Builder customization per Poke Bowl (runtime)
function buildPokeCustomization() {
  return [
    {
      name: "Base di carboidrati",
      description: "Scegli una base (inclusa)",
      type: "single",
      required: true,
      options: getBasi().map((o,i) => ({...o, order:i})),
    },
    {
      name: "Proteina",
      description: "Scegli una proteina",
      type: "single",
      required: true,
      options: [...getProtPrem(), ...getProtStd()].map((o,i)=>({...o, order:i})),
    },
    {
      name: "Proteina extra",
      description: "Vuoi aggiungere una seconda proteina?",
      type: "multiple",
      required: false,
      max: 3,
      options: [...getProtPrem(), ...getProtStd(), ...getExtras()].map((o,i)=>({...o, order:i})),
    },
  ];
}

// Builder customization per Secondo con Contorno (runtime)
function buildSecondoCustomization() {
  return [
    {
      name: "Prima proteina",
      description: "Scegli la prima proteina (inclusa)",
      type: "single",
      required: true,
      options: [...getProtPrem(), ...getProtStd()].map((o,i)=>({...o, price:0, order:i})),
    },
    {
      name: "Seconda proteina",
      description: "Scegli la seconda proteina (inclusa)",
      type: "single",
      required: true,
      options: [...getProtPrem(), ...getProtStd()].map((o,i)=>({...o, price:0, order:i})),
    },
    {
      name: "Extra",
      description: "Aggiunte opzionali",
      type: "multiple",
      required: false,
      max: 3,
      options: [...getProtPrem(), ...getProtStd(), ...getExtras()].map((o,i)=>({...o, order:i})),
    },
  ];
}

const tierraReservations = {
  checkAvailability: ({date,time,guests=1,zone}) => {
    const q = new URLSearchParams({date,time,guests:String(guests)});
    if(zone) q.append("zone",zone);
    return tierraRequest(`/api/reservations/availability?${q}`,{auth:false});
  },
  create: (data) => tierraRequest("/api/tierra/reservations",{method:"POST",body:{status:"confirmed",auto_print:true,...data}}),
  update: (id,patch) => tierraRequest(`/api/tierra/reservations/${id}`,{method:"PATCH",body:patch}),
  cancel: (id) => tierraRequest(`/api/tierra/reservations/${id}`,{method:"DELETE"}),
};

const tierraTables = {
  list: ({zone,includeReservations=true}={}) => {
    const q = new URLSearchParams();
    if(zone) q.append("zone",zone);
    q.append("include_reservations",String(includeReservations));
    return tierraRequest(`/api/tables?${q}`,{auth:false});
  },
  update: (code,patch) => tierraRequest(`/api/tables/${code}`,{method:"PATCH",body:patch}),
  listOrders: (code) => tierraRequest(`/api/tables/${code}/orders`,{auth:false}),
  close: (code) => tierraRequest(`/api/tables/${code}/close`,{method:"POST"}),
};

const tierraOrders = {
  create: ({table_code,waiter,items,customer_name,notes}) =>
    tierraRequest("/api/orders",{
      method:"POST", auth:false,
      body:{
        service_type:"tavolo",
        table_code, waiter, items, notes,
        customer_name: customer_name||`Tavolo ${table_code}`,
        customer_phone:"-",
        origin_url:"tierra-os",
      }
    }),
};

// ─── STAMPANTE TERMICA SUNMI NT311 ───────────────────────────────────────────
// Stampa diretta via ESC/POS sulla rete locale (porta 9100). Default: 192.168.0.100
const PRINTER_IP_DEFAULT = "192.168.0.100";
const PRINTER_PORT       = 9100;
let PRINTER_IP = localStorage.getItem("tierra_printer_ip") || PRINTER_IP_DEFAULT;

const _ESC = 0x1B, _GS = 0x1D;
function escposBytes(chunks) {
  const parts = []; let total = 0;
  const enc = new TextEncoder();
  for (const c of chunks) {
    let bytes;
    if (typeof c === "string")        bytes = enc.encode(c);
    else if (c instanceof Uint8Array) bytes = c;
    else if (Array.isArray(c))        bytes = new Uint8Array(c);
    else continue;
    parts.push(bytes); total += bytes.length;
  }
  const out = new Uint8Array(total); let off = 0;
  for (const p of parts) { out.set(p, off); off += p.length; }
  return out;
}
const ESCPOS = {
  init:[_ESC,0x40], alignL:[_ESC,0x61,0], alignC:[_ESC,0x61,1], alignR:[_ESC,0x61,2],
  boldOn:[_ESC,0x45,1], boldOff:[_ESC,0x45,0],
  doubleOn:[_GS,0x21,0x11], doubleOff:[_GS,0x21,0x00],
  cut:[_GS,0x56,0x42,0x00], feed:n=>[_ESC,0x64,n&0xFF], cp858:[_ESC,0x74,19],
};
const PCOLS = 48;
const ppad = (l, r, w=PCOLS) => { const L=String(l), R=String(r); return L+" ".repeat(Math.max(1,w-L.length-R.length))+R+"\n"; };
const pline = (ch="-", w=PCOLS) => ch.repeat(w)+"\n";

function buildComandaBytes(o) {
  const ora = new Date().toLocaleTimeString("it-IT",{hour:"2-digit",minute:"2-digit"});
  return escposBytes([
    ESCPOS.init, ESCPOS.cp858,
    ESCPOS.alignC, ESCPOS.boldOn, ESCPOS.doubleOn,
    "*** CUCINA ***\n", ESCPOS.doubleOff,
    `Tavolo ${o.tavolo}\n`, ESCPOS.boldOff, ESCPOS.alignL,
    pline("="),
    ESCPOS.boldOn, `Cliente: ${o.cliente||"-"}\n`, ESCPOS.boldOff,
    `Ora: ${ora}\n`, pline("-"),
    ESCPOS.boldOn, ESCPOS.doubleOn,
    ...o.items.map(i => `${i.qty}x ${i.nome}\n`),
    ESCPOS.doubleOff, ESCPOS.boldOff, pline("-"),
    ESCPOS.alignC, `Tierra OS - ${ora}\n`,
    ESCPOS.feed(4), ESCPOS.cut,
  ]);
}
function buildScontrinoBytes(o) {
  const ora = new Date().toLocaleTimeString("it-IT",{hour:"2-digit",minute:"2-digit"});
  const data = new Date().toLocaleDateString("it-IT");
  const tot = o.items.reduce((s,i)=>s+(i.prezzoFinale||i.prezzo)*i.qty,0);

  // Costruisce le righe items + opzioni in formato testuale
  const itemsRows = [];
  o.items.forEach(i => {
    const prz = (i.prezzoFinale||i.prezzo)*i.qty;
    itemsRows.push(ppad(`${i.qty}x ${i.nome}`, `EUR ${prz.toFixed(2)}`));
    if (i.opzioniScelte) {
      Object.values(i.opzioniScelte).forEach(sc => {
        const arr = Array.isArray(sc) ? sc : [sc];
        arr.forEach(s => {
          if (!s || !s.nome) return;
          const extraTxt = s.extra > 0 ? ` +${s.extra.toFixed(2)}` : "";
          itemsRows.push(`  - ${s.nome}${extraTxt}\n`);
        });
      });
    }
  });

  return escposBytes([
    ESCPOS.init, ESCPOS.cp858,
    ESCPOS.alignC, ESCPOS.boldOn, ESCPOS.doubleOn,
    "TIERRA\n", ESCPOS.doubleOff,
    "organic - bistrot - cafe\n", ESCPOS.boldOff,
    "Via Tirso 34, Roma\n", pline("="),
    ESCPOS.alignL,
    `Data: ${data}    Ora: ${ora}\n`,
    `Tavolo: ${o.tavolo}\n`,
    `Cliente: ${o.cliente||"-"}\n`, pline("-"),
    ESCPOS.boldOn, ppad("DESCRIZIONE","TOT"), ESCPOS.boldOff, pline("-"),
    ...itemsRows,
    pline("-"),
    ESCPOS.boldOn, ESCPOS.doubleOn, ppad("TOTALE", `${tot.toFixed(2)}`, 24),
    ESCPOS.doubleOff, ESCPOS.boldOff, pline("="),
    ESCPOS.alignC,
    `Pagamento: ${o.pagamento==="stripe"?"Online (Stripe)":"Al conto"}\n`,
    "\nGrazie per la visita!\n\n",
    ESCPOS.feed(2), ESCPOS.cut,
  ]);
}
function buildChiusuraBytes(d) {
  const data = new Date().toLocaleDateString("it-IT");
  const ora = new Date().toLocaleTimeString("it-IT",{hour:"2-digit",minute:"2-digit"});
  return escposBytes([
    ESCPOS.init, ESCPOS.cp858,
    ESCPOS.alignC, ESCPOS.boldOn, ESCPOS.doubleOn,
    "CHIUSURA\nCASSA\n", ESCPOS.doubleOff, ESCPOS.boldOff,
    `${data} - ${ora}\n`, pline("="), ESCPOS.alignL,
    ppad("Cash:",   `EUR ${(d.cash||0).toFixed(2)}`),
    ppad("POS:",    `EUR ${(d.pos||0).toFixed(2)}`),
    ppad("Stripe:", `EUR ${(d.stripe||0).toFixed(2)}`),
    pline("-"),
    ESCPOS.boldOn, ESCPOS.doubleOn, ppad("TOTALE", `${(d.totDay||0).toFixed(2)}`, 24),
    ESCPOS.doubleOff, ESCPOS.boldOff, pline("="),
    ESCPOS.alignC,
    `Coperti: ${d.coperti||0}\n`,
    d.coperti ? `Scontr. medio: EUR ${((d.totDay||0)/d.coperti).toFixed(2)}\n` : "",
    "\nTierra OS\n", ESCPOS.feed(3), ESCPOS.cut,
  ]);
}

// ─── RICEVUTA PRENOTAZIONE (HTML per stampa Cmd+P) ──────────────────────────
function buildPrenotazioneHTML(prenotazione) {
  const {cliente, data, ora, pax, tavolo, telefono, note, id} = prenotazione;
  const dataObj = new Date(data + "T00:00:00");
  const dataFormatted = dataObj.toLocaleDateString("it-IT", {
    weekday: "long", day: "2-digit", month: "long", year: "numeric"
  });
  const oraFormatted = ora || "—";
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
  *{margin:0;padding:0;box-sizing:border-box}body{font-family:monospace;font-size:12px;line-height:1.4;background:#fff;color:#2c2c24;width:80mm;padding:12px}
  .container{max-width:80mm}.header{text-align:center;margin-bottom:12px;border-bottom:2px dashed #8ba25a;padding-bottom:8px}
  .header h1{font-size:18px;font-weight:bold;color:#8ba25a;margin-bottom:2px}.header p{font-size:10px;color:#7a7260;margin-bottom:1px}
  .icon{font-size:24px;margin-bottom:8px}.booking-id{text-align:center;background:#eef3e4;border:1px solid #8ba25a;border-radius:4px;padding:6px;margin:8px 0;font-size:11px;font-weight:bold;color:#4a6028;font-family:monospace}
  .section{margin:10px 0;border-bottom:1px dashed #e4dfd0;padding-bottom:8px}.section:last-child{border-bottom:none}
  .section-title{font-size:10px;text-transform:uppercase;color:#7a7260;font-weight:bold;letter-spacing:0.5px;margin-bottom:4px}
  .field{display:flex;justify-content:space-between;margin-bottom:4px}.field-label{font-weight:bold;color:#2c2c24}.field-value{text-align:right;color:#2c2c24}
  .pax-badge{display:inline-block;background:#8ba25a;color:#fff;padding:3px 8px;border-radius:3px;font-size:11px;font-weight:bold;margin-top:2px}
  .tavolo-badge{display:inline-block;background:#2980b9;color:#fff;padding:3px 8px;border-radius:3px;font-size:11px;font-weight:bold;margin-left:4px}
  .note{background:#f2f0e8;padding:6px;border-left:3px solid #8ba25a;margin:8px 0;font-size:11px;line-height:1.3;border-radius:2px}
  .note-title{font-weight:bold;color:#4a6028;font-size:10px;margin-bottom:2px}
  .footer{text-align:center;margin-top:12px;padding-top:8px;border-top:2px dashed #8ba25a;font-size:10px;color:#7a7260}
  .footer-icon{font-size:16px;margin-bottom:4px}.timestamp{text-align:center;font-size:9px;color:#a39f95;margin-top:8px;font-family:monospace}
  @media print{body{padding:0;width:100%}.container{max-width:100%}*{box-shadow:none!important}a{text-decoration:none}@page{margin:0;size:80mm auto}}
  </style></head><body><div class="container"><div class="header"><div class="icon">🌿</div><h1>TIERRA</h1><p>Organic Bistrot Café</p><p>Via Tirso 34, Roma</p></div>
  <div class="booking-id">✓ PRENOTAZIONE CONFERMATA — ID: ${id.substring(0, 8).toUpperCase()}</div>
  <div class="section"><div class="section-title">Cliente</div><div class="field"><span class="field-label">${cliente}</span></div><div style="margin-top:4px"><span class="pax-badge">👥 ${pax} PAX</span>${tavolo ? `<span class="tavolo-badge">🍽️ Tavolo ${tavolo}</span>` : ''}</div></div>
  <div class="section"><div class="section-title">Data e Ora</div><div class="field"><span class="field-label">Data</span><span class="field-value">${dataFormatted}</span></div><div class="field"><span class="field-label">Ora</span><span class="field-value">${oraFormatted}</span></div></div>
  ${telefono ? `<div class="section"><div class="section-title">Contatti</div><div class="field"><span class="field-label">Telefono</span><span class="field-value">${telefono}</span></div></div>` : ''}
  ${note ? `<div class="section"><div class="note"><div class="note-title">📝 Note</div><div>${note}</div></div></div>` : ''}
  <div class="footer"><div class="footer-icon">✓</div><p>Grazie per la prenotazione!</p><p>Ti aspettiamo 🌿</p></div>
  <div class="timestamp">Generato: ${new Date().toLocaleString("it-IT")}</div></div></body></html>`;
}

async function printPrenotazione(prenotazione) {
  const w = window.open("", "_blank", "width=400,height=600");
  if (!w) return false;
  w.document.write(buildPrenotazioneHTML(prenotazione)); 
  w.document.close(); 
  w.focus();
  setTimeout(()=>{w.print(); setTimeout(()=>w.close(),500);}, 400);
  return true;
}

async function sendToSunmi(bytes, ip = PRINTER_IP) {
  try {
    await fetch(`http://${ip}:${PRINTER_PORT}`, {
      method:"POST", mode:"no-cors",
      headers:{"Content-Type":"application/octet-stream"},
      body: bytes,
    });
    return { ok: true };
  } catch (e) { return { ok: false, error: String(e.message||e) }; }
}

function buildReceiptHTML(ordine, copia) {
  const tipoStr = copia === "cucina" ? "*** CUCINA ***" : "*** CASSA ***";
  const itemsHtml = ordine.items.map(i => {
    const prz = (i.prezzoFinale||i.prezzo)*i.qty;
    const optionsHtml = (i.opzioniScelte && Object.entries(i.opzioniScelte).length > 0) 
      ? Object.entries(i.opzioniScelte).flatMap(([key, val]) => {
          const arr = Array.isArray(val) ? val : [val];
          return arr.filter(x => x && x.nome).map(x => 
            `<tr><td style="padding-left:20px">  · ${x.nome}${x.extra > 0 ? ` +€${x.extra.toFixed(2)}` : ''}</td><td></td></tr>`
          );
        }).join("")
      : "";
    return `<tr><td>${i.qty}x ${i.nome}</td><td style="text-align:right">€${prz.toFixed(2)}</td></tr>${optionsHtml}`;
  }).join("");
  const totale = ordine.items.reduce((s,i)=>s+(i.prezzoFinale||i.prezzo)*i.qty,0);
  return `<!DOCTYPE html><html><head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:monospace;font-size:12px;width:80mm;margin:0;padding:10px;line-height:1.3;color:#000}
  h2{text-align:center;font-size:16px;margin:4px 0;font-weight:bold}
  .center{text-align:center}
  hr{border:none;border-top:1px dashed #000;margin:6px 0;padding:0}
  table{width:100%;border-collapse:collapse}
  td{padding:3px 0;word-wrap:break-word;overflow-wrap:break-word}
  .total{font-size:14px;font-weight:bold}
  .tipo{text-align:center;font-size:16px;font-weight:bold;margin:6px 0}
  @media print{
    body{padding:0;width:100%;margin:0}
    *{box-shadow:none!important}
    @page{margin:0;size:80mm auto;orphans:0;widows:0}
    table{page-break-inside:avoid}
    .section{page-break-inside:avoid}
  }
</style></head><body>
<div class="tipo">${tipoStr}</div>
<hr>
<h2>TIERRA</h2>
<div class="center">organic · bistrot · cafè</div>
<div class="center">Via Tirso 34, Roma</div>
<hr>
<div class="center"><b>Tavolo ${ordine.tavolo} — ${ordine.cliente}</b></div>
<div class="center">${new Date().toLocaleTimeString("it-IT",{hour:"2-digit",minute:"2-digit"})}</div>
<hr>
<table>${itemsHtml}</table>
<hr>
<table><tr><td class="total">TOTALE</td><td style="text-align:right" class="total">€${totale.toFixed(2)}</td></tr></table>
<hr>
<div class="center">Pagamento: ${ordine.pagamento==="stripe"?"Online (Stripe)":"Al conto"}</div>
${copia==="cucina"?"":"<div class='center' style='margin-top:8px;font-weight:bold'>Grazie per la visita! 🌿</div>"}
<br><br>
</body></html>`;
}

async function printComanda(ordine) {
  const r = await sendToSunmi(buildComandaBytes(ordine));
  if (r.ok) return true;
  const w = window.open("", "_blank", "width=400,height=600");
  if (!w) return false;
  w.document.write(buildReceiptHTML(ordine, "cucina")); w.document.close(); w.focus();
  setTimeout(()=>{w.print(); setTimeout(()=>w.close(),500);}, 400);
  return true;
}
async function printScontrino(ordine) {
  const r = await sendToSunmi(buildScontrinoBytes(ordine));
  if (r.ok) return true;
  const w = window.open("", "_blank", "width=400,height=600");
  if (!w) return false;
  w.document.write(buildReceiptHTML(ordine, "cassa")); w.document.close(); w.focus();
  setTimeout(()=>{w.print(); setTimeout(()=>w.close(),500);}, 400);
  return true;
}
async function printChiusura(d) {
  const r = await sendToSunmi(buildChiusuraBytes(d));
  return r.ok;
}
async function printOrder(ordine) {
  const r1 = await sendToSunmi(buildComandaBytes(ordine));
  if (r1.ok) {
    await new Promise(res => setTimeout(res, 800));
    await sendToSunmi(buildScontrinoBytes(ordine));
    return true;
  }
  const w = window.open("", "_blank", "width=400,height=600");
  if (!w) return false;
  w.document.write(buildReceiptHTML(ordine, "cucina")); w.document.close(); w.focus();
  setTimeout(()=>{
    w.print();
    setTimeout(()=>{
      w.document.open();
      w.document.write(buildReceiptHTML(ordine, "cassa"));
      w.document.close();
      setTimeout(()=>{w.print(); w.close();}, 500);
    }, 1000);
  }, 500);
  return true;
}

// ─── PALETTE ─────────────────────────────────────────────────────────────────
const C = {
  bg:"#f8f7f2", surface:"#ffffff", surface2:"#f2f0e8",
  border:"#e4dfd0", gold:"#8ba25a", goldDim:"#6a7d44",
  green:"#8ba25a", greenLight:"#eef3e4", greenDark:"#4a6028",
  red:"#c0392b", redLight:"#fdecea",
  blue:"#2980b9", purple:"#8b5cf6",
  orange:"#8b4513", orangeLight:"#f5ede4",
  text:"#2c2c24", muted:"#7a7260", faint:"#e4dfd0",
  lark:"#2B5FEC", dark:"#1a1a14",
};

// ─── USERS & ROLES ───────────────────────────────────────────────────────────
const USERS = [
  { nome:"Andres",  ruolo:"owner",   avatar:"AN", colore:C.gold   },
  { nome:"Doris",   ruolo:"owner",   avatar:"DO", colore:C.gold   },
  { nome:"Farhad",  ruolo:"manager", avatar:"FA", colore:C.blue   },
  { nome:"Kamyar",  ruolo:"staff",   avatar:"KA", colore:C.orange },
  { nome:"Mina",    ruolo:"staff",   avatar:"MI", colore:C.purple },
  { nome:"Rassel",  ruolo:"staff",   avatar:"RA", colore:C.green  },
];
const isAdmin = u => u && (u.ruolo==="owner" || u.ruolo==="manager");

const STAFF_ROLES = {
  "Kamyar": "Cameriere",
  "Mina":   "Cameriera",
  "Rassel": "Cucina",
};

// ─── FORNITORI ────────────────────────────────────────────────────────────────
const FORNITORI_INIT = [
  {
    id:"f1", nome:"Zeno", contatto:"",
    consegna:"Lunedì e Giovedì", colore:C.green,
    prodotti:[
      {id:"p1", nome:"Spinaci Bio", unita:"kg", qtaAbituale:2, prezzo:3.50},
      {id:"p2", nome:"Pomodori Pachino", unita:"kg", qtaAbituale:3, prezzo:4.20},
      {id:"p3", nome:"Avocado", unita:"pz", qtaAbituale:12, prezzo:1.80},
      {id:"p4", nome:"Zucchine", unita:"kg", qtaAbituale:2, prezzo:2.80},
      {id:"p5", nome:"Cetrioli", unita:"kg", qtaAbituale:1.5, prezzo:2.20},
      {id:"p6", nome:"Limoni Bio", unita:"kg", qtaAbituale:2, prezzo:3.00},
      {id:"p7", nome:"Topinambur", unita:"kg", qtaAbituale:1, prezzo:5.50},
      {id:"p8", nome:"Zucca", unita:"kg", qtaAbituale:2, prezzo:2.60},
    ]
  },
  {
    id:"f2", nome:"Market Cantalupo", contatto:"",
    consegna:"Martedì e Venerdì", colore:C.orange,
    prodotti:[
      {id:"p9",  nome:"Pollo Bio Petto", unita:"kg", qtaAbituale:3, prezzo:12.00},
      {id:"p10", nome:"Polpette miste", unita:"kg", qtaAbituale:2, prezzo:14.00},
      {id:"p11", nome:"Manzo Bio macinato", unita:"kg", qtaAbituale:1.5, prezzo:16.00},
    ]
  },
  {
    id:"f3", nome:"Mareamore", contatto:"",
    consegna:"Mercoledì e Sabato", colore:C.blue,
    prodotti:[
      {id:"p12", nome:"Salmone fresco", unita:"kg", qtaAbituale:2, prezzo:22.00},
      {id:"p13", nome:"Tonno fresco", unita:"kg", qtaAbituale:1.5, prezzo:28.00},
      {id:"p14", nome:"Gamberi", unita:"kg", qtaAbituale:1, prezzo:24.00},
      {id:"p15", nome:"Polpo", unita:"kg", qtaAbituale:1, prezzo:18.00},
      {id:"p16", nome:"Baccalà", unita:"kg", qtaAbituale:1, prezzo:20.00},
    ]
  },
  {
    id:"f4", nome:"Sotto le Stelle", contatto:"",
    consegna:"Su richiesta", colore:C.purple,
    prodotti:[
      {id:"p17", nome:"Olio EVO Bio", unita:"lt", qtaAbituale:5, prezzo:12.00},
      {id:"p18", nome:"Latte vegetale", unita:"lt", qtaAbituale:6, prezzo:3.50},
      {id:"p19", nome:"Salsa Teriyaki Bio", unita:"bt", qtaAbituale:3, prezzo:6.50},
      {id:"p20", nome:"Tahini Bio", unita:"bt", qtaAbituale:2, prezzo:7.00},
      {id:"p21", nome:"Salsa di Soia Bio", unita:"bt", qtaAbituale:4, prezzo:4.50},
    ]
  },
  {
    id:"f5", nome:"Fattoria Lucciano", contatto:"",
    consegna:"Ogni mattina 07:00", colore:C.goldDim,
    prodotti:[
      {id:"p22", nome:"Yogurt Bio", unita:"kg", qtaAbituale:3, prezzo:4.00},
      {id:"p23", nome:"Formaggio fresco", unita:"kg", qtaAbituale:2, prezzo:8.00},
      {id:"p24", nome:"Ricotta Bio", unita:"kg", qtaAbituale:1.5, prezzo:6.00},
    ]
  },
  {
    id:"f6", nome:"HQF Carni", contatto:"",
    consegna:"Martedì e Venerdì", colore:C.red,
    prodotti:[
      {id:"p25", nome:"Manzo premium", unita:"kg", qtaAbituale:2, prezzo:28.00},
      {id:"p26", nome:"Vitello", unita:"kg", qtaAbituale:1.5, prezzo:24.00},
    ]
  },
  {
    id:"f7", nome:"Cartaria Appia", contatto:"",
    consegna:"Su richiesta", colore:C.muted,
    prodotti:[
      {id:"p27", nome:"Tovaglioli", unita:"cf", qtaAbituale:5, prezzo:8.00},
      {id:"p28", nome:"Sacchetti bio", unita:"cf", qtaAbituale:3, prezzo:12.00},
    ]
  },
  {
    id:"f8", nome:"Pratesi", contatto:"",
    consegna:"Su richiesta", colore:C.dark,
    prodotti:[
      {id:"p29", nome:"Attrezzatura varia", unita:"pz", qtaAbituale:1, prezzo:0},
    ]
  },
  {
    id:"f9", nome:"Metro Cash and Carry", contatto:"",
    consegna:"Su richiesta", colore:C.blue,
    prodotti:[
      {id:"p30", nome:"Prodotti vari", unita:"pz", qtaAbituale:1, prezzo:0},
    ]
  },
  {
    id:"f10", nome:"Orsogna Vini", contatto:"",
    consegna:"Su richiesta", colore:C.purple,
    prodotti:[
      {id:"p31", nome:"Vino bianco bio", unita:"bt", qtaAbituale:6, prezzo:8.00},
      {id:"p32", nome:"Vino rosso bio", unita:"bt", qtaAbituale:6, prezzo:8.00},
    ]
  },
  {
    id:"f11", nome:"Rocchi Vini e Liquori", contatto:"",
    consegna:"Su richiesta", colore:C.purple,
    prodotti:[
      {id:"p33", nome:"Vino selezione", unita:"bt", qtaAbituale:6, prezzo:10.00},
      {id:"p34", nome:"Liquori", unita:"bt", qtaAbituale:2, prezzo:15.00},
    ]
  },
  {
    id:"f12", nome:"Ghiaccio Roma", contatto:"",
    consegna:"Su richiesta", colore:C.blue,
    prodotti:[
      {id:"p35", nome:"Ghiaccio", unita:"kg", qtaAbituale:10, prezzo:2.00},
    ]
  },
];

// ─── LAYOUT TAVOLI REALE ──────────────────────────────────────────────────────
// Interno: I1+I2 verticali destra, I3+I4 affiancati centro, I5-I8 blocco 2x2 sinistra
const LAYOUT_INT = [
  {id:"I1",col:3,row:0},{id:"I2",col:3,row:1},
  {id:"I3",col:2,row:2},{id:"I4",col:3,row:2},
  {id:"I5",col:1,row:3},{id:"I6",col:2,row:3},
  {id:"I7",col:1,row:4},{id:"I8",col:2,row:4},
];
// Esterno: Pedana 3x2 (E1-E6), Ingresso E7+E8
const LAYOUT_EST = [
  {id:"E1",col:0,row:0},{id:"E3",col:1,row:0},{id:"E5",col:2,row:0},
  {id:"E2",col:0,row:1},{id:"E4",col:1,row:1},{id:"E6",col:2,row:1},
  {id:"E7",col:0,row:3},{id:"E8",col:1,row:3},
];

// ─── MAGAZZINO: 38 ARTICOLI INIZIALI ─────────────────────────────────────────
const MAGAZZINO_INIT = [
  {id:"mz01", nome:"Pan Brioche Roscioli",   categoria:"Colazioni",      qta:12, soglia:5,  prezzo:4.50, sku:"COL001", foto:""},
  {id:"mz02", nome:"Cornetti Assortiti",      categoria:"Colazioni",      qta:18, soglia:8,  prezzo:2.50, sku:"COL002", foto:""},
  {id:"mz03", nome:"Caffè in Grani 1kg",     categoria:"Colazioni",      qta:6,  soglia:3,  prezzo:18.00,sku:"COL003", foto:""},
  {id:"mz04", nome:"Tartine Miste",           categoria:"Antipasti",      qta:8,  soglia:3,  prezzo:3.50, sku:"ANT001", foto:""},
  {id:"mz05", nome:"Affettati Bio Misti",     categoria:"Antipasti",      qta:10, soglia:4,  prezzo:5.00, sku:"ANT002", foto:""},
  {id:"mz06", nome:"Formaggi Bio Selezione",  categoria:"Antipasti",      qta:6,  soglia:3,  prezzo:4.80, sku:"ANT003", foto:""},
  {id:"mz07", nome:"Riso Integrale",          categoria:"Bowl - Basi",    qta:15, soglia:5,  prezzo:0.80, sku:"BAS001", foto:""},
  {id:"mz08", nome:"Quinoa Mix",              categoria:"Bowl - Basi",    qta:10, soglia:4,  prezzo:1.20, sku:"BAS002", foto:""},
  {id:"mz09", nome:"Pasta Integrale",         categoria:"Bowl - Basi",    qta:12, soglia:5,  prezzo:0.90, sku:"BAS003", foto:""},
  {id:"mz10", nome:"Insalata Mista",          categoria:"Bowl - Basi",    qta:20, soglia:8,  prezzo:0.60, sku:"BAS004", foto:""},
  {id:"mz11", nome:"Cavolo Rosso",            categoria:"Bowl - Basi",    qta:14, soglia:5,  prezzo:0.70, sku:"BAS005", foto:""},
  {id:"mz12", nome:"Petto di Pollo Bio",      categoria:"Bowl - Proteine",qta:8,  soglia:4,  prezzo:3.50, sku:"PRO001", foto:""},
  {id:"mz13", nome:"Salmone Affumicato",      categoria:"Bowl - Proteine",qta:5,  soglia:3,  prezzo:4.80, sku:"PRO002", foto:""},
  {id:"mz14", nome:"Tofu Biologico",          categoria:"Bowl - Proteine",qta:7,  soglia:3,  prezzo:2.80, sku:"PRO003", foto:""},
  {id:"mz15", nome:"Uova Bio",                categoria:"Bowl - Proteine",qta:30, soglia:12, prezzo:1.50, sku:"PRO004", foto:""},
  {id:"mz16", nome:"Legumi Misti",            categoria:"Bowl - Proteine",qta:9,  soglia:4,  prezzo:1.80, sku:"PRO005", foto:""},
  {id:"mz17", nome:"Tempeh",                  categoria:"Bowl - Proteine",qta:4,  soglia:3,  prezzo:3.00, sku:"PRO006", foto:""},
  {id:"mz18", nome:"Avocado",                 categoria:"Bowl - Extra",   qta:6,  soglia:4,  prezzo:1.50, sku:"EXT001", foto:""},
  {id:"mz19", nome:"Frutti di Bosco",         categoria:"Bowl - Extra",   qta:8,  soglia:3,  prezzo:2.00, sku:"EXT002", foto:""},
  {id:"mz20", nome:"Noci Miste",              categoria:"Bowl - Extra",   qta:10, soglia:4,  prezzo:1.80, sku:"EXT003", foto:""},
  {id:"mz21", nome:"Semi di Girasole",        categoria:"Bowl - Extra",   qta:12, soglia:5,  prezzo:0.80, sku:"EXT004", foto:""},
  {id:"mz22", nome:"Hummus",                  categoria:"Bowl - Extra",   qta:7,  soglia:3,  prezzo:1.20, sku:"EXT005", foto:""},
  {id:"mz23", nome:"Tahini",                  categoria:"Bowl - Extra",   qta:5,  soglia:2,  prezzo:1.80, sku:"EXT006", foto:""},
  {id:"mz24", nome:"Germogli Misti",          categoria:"Bowl - Extra",   qta:3,  soglia:3,  prezzo:1.30, sku:"EXT007", foto:""},
  {id:"mz25", nome:"Acqua Naturale 0.5L",     categoria:"Bevande",        qta:30, soglia:12, prezzo:1.50, sku:"BEV001", foto:""},
  {id:"mz26", nome:"Caffè Specialty",         categoria:"Bevande",        qta:25, soglia:10, prezzo:2.50, sku:"BEV002", foto:""},
  {id:"mz27", nome:"Birra Artigianale 33cl",  categoria:"Bevande",        qta:12, soglia:6,  prezzo:4.50, sku:"BEV003", foto:""},
  {id:"mz28", nome:"Succo Bio 250ml",         categoria:"Bevande",        qta:10, soglia:4,  prezzo:3.00, sku:"BEV004", foto:""},
  {id:"mz29", nome:"Tè Sfuso 100g",           categoria:"Bevande",        qta:20, soglia:6,  prezzo:2.00, sku:"BEV005", foto:""},
  {id:"mz30", nome:"Tiramisu Bio",            categoria:"Dolci",          qta:4,  soglia:2,  prezzo:5.50, sku:"DOL001", foto:""},
  {id:"mz31", nome:"Panna Cotta",             categoria:"Dolci",          qta:6,  soglia:3,  prezzo:4.50, sku:"DOL002", foto:""},
  {id:"mz32", nome:"Caffè Macinato 500g",     categoria:"Caffetteria",    qta:3,  soglia:2,  prezzo:8.00, sku:"CAF001", foto:""},
  {id:"mz33", nome:"Tè Pregiato 100g",        categoria:"Caffetteria",    qta:5,  soglia:3,  prezzo:6.50, sku:"CAF002", foto:""},
  {id:"mz34", nome:"Latte Cappuccino 1L",     categoria:"Caffetteria",    qta:25, soglia:10, prezzo:0.50, sku:"CAF003", foto:""},
  {id:"mz35", nome:"Cacao in Polvere 250g",   categoria:"Caffetteria",    qta:15, soglia:5,  prezzo:0.60, sku:"CAF004", foto:""},
  {id:"mz36", nome:"Tovaglioli Bio 100pz",    categoria:"Materiale",      qta:8,  soglia:3,  prezzo:4.00, sku:"MAT001", foto:""},
  {id:"mz37", nome:"Vaschette Compostabili",  categoria:"Materiale",      qta:50, soglia:20, prezzo:0.20, sku:"MAT002", foto:""},
  {id:"mz38", nome:"Sacchetti Asporto",       categoria:"Materiale",      qta:80, soglia:30, prezzo:0.10, sku:"MAT003", foto:""},
];
const CATEGORIE_MAGAZZINO = ["Colazioni","Antipasti","Bowl - Basi","Bowl - Proteine","Bowl - Extra","Bevande","Dolci","Caffetteria","Materiale"];

const MENU_CATALOG_INIT = {
  "Pranzo & Cena":[
    {id:"m1", nome:"Poke Media Bowl",            prezzo:13, ingredienti:"Base 150gr, verdure 150gr, proteina 130gr — una proteina a scelta carne o veggie", disponibile:true,
      opzioni:[
        {nome:"Proteina Base", multiplo:false, obbligatorio:true, items:[
          {nome:"Petto di Pollo", extra:0},
          {nome:"Salmone", extra:2.50},
          {nome:"Tofu Bio", extra:0},
          {nome:"Tonno", extra:2.00},
        ]},
        {nome:"Extra Aggiunte", multiplo:true, obbligatorio:false, items:[
          {nome:"Avocado", extra:1.50},
          {nome:"Frutti di Bosco", extra:2.00},
          {nome:"Extra Proteina", extra:3.00},
          {nome:"Noci Miste", extra:1.80},
          {nome:"Germogli", extra:1.30},
        ]},
      ]
    },
    {id:"m2", nome:"Poke Grande Bowl",           prezzo:15, ingredienti:"Base 200gr, verdure 180gr, proteina 180gr — una proteina a scelta carne o veggie", disponibile:true,
      opzioni:[
        {nome:"Proteina Base", multiplo:false, obbligatorio:true, items:[
          {nome:"Petto di Pollo", extra:0},
          {nome:"Salmone", extra:2.50},
          {nome:"Tofu Bio", extra:0},
          {nome:"Tonno", extra:2.00},
        ]},
        {nome:"Extra Aggiunte", multiplo:true, obbligatorio:false, items:[
          {nome:"Avocado", extra:1.50},
          {nome:"Frutti di Bosco", extra:2.00},
          {nome:"Extra Proteina", extra:3.00},
          {nome:"Noci Miste", extra:1.80},
          {nome:"Germogli", extra:1.30},
        ]},
      ]
    },
    {id:"m3", nome:"Poke Bowl Media Pesce Misto",prezzo:18, ingredienti:"Pesce fresco del giorno — almeno tre varietà", disponibile:true},
    {id:"m4", nome:"Poke Bowl Grande Pesce Misto",prezzo:24,ingredienti:"Pesce fresco del giorno — almeno tre varietà", disponibile:true},
    {id:"m5", nome:"Catalana Mista",             prezzo:17, ingredienti:"Selezione pesce e crostacei crudi, olio EVO, limone", disponibile:true},
    {id:"m6", nome:"Secondo con Contorno",       prezzo:17, ingredienti:"Proteina del giorno con contorno di stagione", disponibile:true,
      opzioni:[
        {nome:"Cottura", multiplo:false, obbligatorio:true, items:[
          {nome:"Al sangue", extra:0},
          {nome:"Media", extra:0},
          {nome:"Ben cotta", extra:0},
        ]},
        {nome:"Salsa", multiplo:false, obbligatorio:false, items:[
          {nome:"Senape Bio", extra:0},
          {nome:"Salsa Verde", extra:0},
          {nome:"Demi Glace", extra:1.50},
        ]},
      ]
    },
    {id:"m7", nome:"Zuppa Inkas",                prezzo:17, ingredienti:"Zuppa tradizionale andina con ingredienti biologici", disponibile:true},
    {id:"m8", nome:"Chicken & Curry With Rice",  prezzo:18, ingredienti:"Pollo bio con curry, riso e verdure", disponibile:false},
    {id:"m9", nome:"Beef Stew Red Wine & Pistacchio", prezzo:22, ingredienti:"Stufato di manzo bio con vino rosso e pistacchio", disponibile:false},
    {id:"m10",nome:"Red Tuna Ceviche With Avocado", prezzo:20, ingredienti:"Ceviche di tonno rosso con avocado fresco", disponibile:false},
    {id:"m11",nome:"Proteina Extra",             prezzo:3,  ingredienti:"Proteina aggiuntiva a scelta", disponibile:true},
    {id:"m12",nome:"Porzione Riso",              prezzo:5,  ingredienti:"Riso a scelta — bianco, integrale, venere o couscous di mais", disponibile:true},
  ],
  "Colazione":[
    {id:"m13",nome:"Avocado Toast",              prezzo:15, ingredienti:"Pane bio integrale al miso tostato, avocado fresco, olio EVO. Aggiunte: scrambled eggs, ceviche salmone, ceviche tonno, hummus", disponibile:true,
      opzioni:[
        {nome:"Aggiunte", multiplo:true, obbligatorio:false, items:[
          {nome:"Scrambled Eggs", extra:2.50},
          {nome:"Ceviche Salmone", extra:4.00},
          {nome:"Ceviche Tonno", extra:4.00},
          {nome:"Hummus", extra:2.00},
        ]},
      ]
    },
    {id:"m14",nome:"Pasticceria",                prezzo:0,  ingredienti:"Selezione pasticceria artigianale del giorno", disponibile:true},
  ],
  "Aperitierra":[
    {id:"m15",nome:"Aperitierra",                prezzo:0,  ingredienti:"Disponibile tutti i giorni dalle 18:00 alle 20:00", disponibile:true},
  ],
  "Contorni":[
    {id:"m16",nome:"Contorno di stagione",       prezzo:0,  ingredienti:"Verdure di stagione biologiche", disponibile:true},
  ],
  "Bevande Alcoliche":[
    {id:"m17",nome:"Vino Bianco Bio",            prezzo:5,  ingredienti:"Selezione naturale del giorno, calice", disponibile:true},
    {id:"m18",nome:"Vino Rosso Bio",             prezzo:5,  ingredienti:"Selezione naturale del giorno, calice", disponibile:true},
    {id:"m19",nome:"Birra Artigianale",          prezzo:5,  ingredienti:"Selezione birre artigianali biologiche", disponibile:true},
  ],
  "Bevande Analcoliche":[
    {id:"m20",nome:"Centrifuga Verde",           prezzo:6,  ingredienti:"Spinaci, mela, zenzero, limone", disponibile:true},
    {id:"m21",nome:"Acqua Naturale",             prezzo:2,  ingredienti:"50cl", disponibile:true},
    {id:"m22",nome:"Acqua Frizzante",            prezzo:2,  ingredienti:"50cl", disponibile:true},
  ],
  "Caffetteria":[
    {id:"m23",nome:"Caffè",                      prezzo:1.5,ingredienti:"Miscela biologica", disponibile:true},
    {id:"m24",nome:"Cappuccino",                 prezzo:2,  ingredienti:"Latte biologico", disponibile:true},
    {id:"m25",nome:"Tè & Infusi",                prezzo:2.5,ingredienti:"Selezione biologica", disponibile:true},
  ],
};

// ════════════════════════════════════════════════════════════════════
// MAGAZZINO_MAPPING — Lookup piatto → articoli magazzino da decrementare
// v8: Mapping FISSO (no condizionali). v9 aggiungerà condizioni su opzioni.
// ════════════════════════════════════════════════════════════════════
const MAGAZZINO_MAPPING = {
  "m1": {"mz07":1, "mz10":1, "mz12":1},          // Poke Media Bowl: Riso + Insalata + Pollo
  "m2": {"mz07":2, "mz10":1, "mz12":2},          // Poke Grande Bowl: Riso x2 + Insalata + Pollo x2
  "m3": {"mz07":1, "mz10":1, "mz13":1},          // Poke Media Pesce: Riso + Insalata + Salmone
  "m4": {"mz07":2, "mz10":1, "mz13":2},          // Poke Grande Pesce: Riso x2 + Insalata + Salmone x2
  "m5": {"mz13":1, "mz04":1},                    // Catalana Mista: Salmone + Tartine
  "m6": {"mz12":1, "mz06":1},                    // Secondo con Contorno: Pollo + Formaggi
  "m7": {"mz16":1, "mz07":1},                    // Zuppa Inkas: Legumi + Riso
  "m11":{"mz12":1},                              // Proteina Extra: Pollo
  "m12":{"mz07":1},                              // Porzione Riso: Riso
  "m13":{"mz01":1, "mz18":1},                    // Avocado Toast: Pan Brioche + Avocado
  "m14":{"mz02":1},                              // Pasticceria: Cornetti
  "m17":{"mz27":0},                              // Vino Bianco (no stock direct mapping)
  "m18":{"mz27":0},                              // Vino Rosso
  "m19":{"mz27":1},                              // Birra Artigianale
  "m21":{"mz25":1},                              // Acqua Naturale
  "m22":{"mz25":1},                              // Acqua Frizzante
  "m23":{"mz26":1},                              // Caffè
  "m24":{"mz26":1, "mz34":1},                    // Cappuccino: Caffè + Latte
  "m25":{"mz29":1},                              // Tè & Infusi
};

// Decrementa magazzino in base all'item dell'ordine (rispetta qty)
const decrementaMagazzino = (itemOrdine, magazzinoAttuale) => {
  const mappingOrdine = MAGAZZINO_MAPPING[itemOrdine.id];
  if (!mappingOrdine) return magazzinoAttuale;

  const qtyOrd = itemOrdine.qty || 1;
  let nuovoMag = [...magazzinoAttuale];

  Object.entries(mappingOrdine).forEach(([magazzinoId, qta]) => {
    if (qta <= 0) return;
    const qtaTotale = qta * qtyOrd;
    nuovoMag = nuovoMag.map(art =>
      art.id === magazzinoId
        ? {...art, qta: Math.max(0, art.qta - qtaTotale)}
        : art
    );
  });

  // Decrementa anche extra opzioni (es. Avocado, Frutti di Bosco)
  if (itemOrdine.opzioniScelte) {
    Object.values(itemOrdine.opzioniScelte).forEach(scelta => {
      const items = Array.isArray(scelta) ? scelta : [scelta];
      items.forEach(it => {
        if (!it || !it.nome) return;
        // Match nome opzione → articolo magazzino
        const matchByNome = nuovoMag.find(art =>
          art.nome.toLowerCase().includes(it.nome.toLowerCase()) ||
          it.nome.toLowerCase().includes(art.nome.toLowerCase().split(" ")[0])
        );
        if (matchByNome) {
          nuovoMag = nuovoMag.map(art =>
            art.id === matchByNome.id
              ? {...art, qta: Math.max(0, art.qta - qtyOrd)}
              : art
          );
        }
      });
    });
  }

  return nuovoMag;
};

const TASK_TEMPLATES = {
  apertura:[
    {title:"Accensione luci e impianti",role:"sala",priority:"alta"},
    {title:"Mise en place tavoli",role:"sala",priority:"alta"},
    {title:"Controllo prenotazioni",role:"manager",priority:"alta"},
    {title:"Accensione fornelli e controllo gas",role:"cucina",priority:"alta"},
    {title:"Controllo temperature frigo",role:"cucina",priority:"alta"},
    {title:"Briefing team",role:"manager",priority:"alta"},
  ],
  chiusura:[
    {title:"Pulizia sala e tavoli",role:"sala",priority:"alta"},
    {title:"Chiusura cassa e POS",role:"manager",priority:"alta"},
    {title:"Pulizia cucina",role:"cucina",priority:"alta"},
    {title:"Inventario fine giornata",role:"magazzino",priority:"media"},
    {title:"Report serale su Lark",role:"manager",priority:"alta"},
  ],
};

const ROLE_COLORS = {owner:C.gold,manager:C.blue,staff:C.muted};
const ROLE_LABELS = {owner:"Proprietario",manager:"Manager",staff:"Staff"};

// ─── STYLES ───────────────────────────────────────────────────────────────────
const gs = `
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;1,400&family=DM+Mono:wght@300;400&family=DM+Sans:wght@300;400;500;600&display=swap');
  *{box-sizing:border-box;margin:0;padding:0;}
  html,body{background:${C.bg};color:${C.text};font-family:'DM Sans',sans-serif;-webkit-font-smoothing:antialiased;}
  input,textarea,select{background:${C.surface2};border:1px solid ${C.border};color:${C.text};border-radius:8px;padding:9px 13px;font-family:'DM Sans',sans-serif;font-size:13px;outline:none;transition:border-color .2s;}
  input:focus,textarea:focus,select:focus{border-color:${C.gold};}
  button{cursor:pointer;font-family:'DM Sans',sans-serif;}
  ::-webkit-scrollbar{width:3px;}
  ::-webkit-scrollbar-thumb{background:${C.gold};border-radius:2px;}
  .fade{animation:fi .35s ease;}
  @keyframes fi{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
  .pulse{animation:pu 1.5s ease-in-out infinite;}
  @keyframes pu{0%,100%{opacity:1}50%{opacity:.35}}
  .row-hover:hover{background:${C.greenLight}!important;transition:background .15s;}
  @media print{
    *{background:transparent!important;box-shadow:none!important;text-shadow:none!important;color:#000!important;border-color:#000!important}
    body{background:#fff!important;color:#000;font-size:11px;padding:0;margin:0;width:100%}
    html{background:#fff}
    h1,h2,h3,h4,h5,h6{page-break-after:avoid;page-break-inside:avoid}
    p,div{orphans:3;widows:3;page-break-inside:avoid}
    table{border-collapse:collapse;width:100%;page-break-inside:avoid}
    td,th{border:1px solid #000;padding:4px;text-align:left}
    a{text-decoration:none;color:#000}
    button,input,textarea,select{border:1px solid #000;background:#fff;color:#000;padding:4px}
    .fade{animation:none;opacity:1}
    .pulse{animation:none}
    img{max-width:100%;height:auto;page-break-inside:avoid}
    .no-print{display:none!important}
    @page{margin:0;size:A4;orphans:0;widows:0}
  }
`;


// ─── UTILS ───────────────────────────────────────────────────────────────────
const uid  = () => Math.random().toString(36).slice(2,9);
const fmt  = n  => "€ "+Number(n||0).toLocaleString("it-IT",{minimumFractionDigits:2});
const now  = ()  => new Date().toLocaleTimeString("it-IT",{hour:"2-digit",minute:"2-digit"});
const todayStr = () => new Date().toLocaleDateString("it-IT",{weekday:"long",day:"2-digit",month:"long",year:"numeric"});
const todayFmt = () => new Date().toLocaleDateString("it-IT",{day:"2-digit",month:"long",year:"numeric"});
const n    = v  => parseFloat(v)||0;

// ─── LARK API (via Netlify Functions — nessun segreto nel browser) ──────────
// Le firme larkToken() e larkSend(token, content) sono mantenute identiche
// al v11 per compatibilità con tutte le chiamate esistenti. Il token non
// è più esposto al browser ma tratta opacamente come "ok" (stringa fittizia).

async function larkToken() {
  // Token gestito lato server dalle Functions. Restituiamo un marker
  // non-null così i try/catch esistenti (if(tok)...) continuano a funzionare.
  return "ok";
}

async function larkSend(_token, content) {
  try {
    const res = await fetch(FN("lark-notify"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ card: content }),
    });
    return await res.json().catch(() => ({ ok: res.ok }));
  } catch (e) {
    console.warn("larkSend failed:", e.message);
    return { ok: false, error: e.message };
  }
}

// ─── LARK BASE DATABASE (via Netlify Functions) ──────────────────────────────
// Firme dbSave(tableName, fields) e setupTables() mantenute identiche.

async function dbSave(tableName, fields) {
  try {
    const res = await fetch(FN("lark-base"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "add_record", tableName, fields }),
    });
    return res.ok;
  } catch (e) {
    console.warn("dbSave failed:", e.message);
    return false;
  }
}

async function setupTables() {
  try {
    const res = await fetch(FN("lark-base"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "setup_tables" }),
    });
    return res.ok;
  } catch (e) {
    console.warn("setupTables failed:", e.message);
    return false;
  }
}

// ─── CLAUDE AI (via Netlify Functions) ──────────────────────────────────────
// Firma callClaude(prompt) mantenuta identica. Il modello (Haiku 4.5,
// più economico e veloce di Sonnet) è configurato lato server.
// Per scansione fatture (con immagine) usare callClaudeVision(prompt, image).

async function callClaude(prompt) {
  try {
    const res = await fetch(FN("claude-proxy"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.warn("callClaude failed:", err.error || res.statusText);
      return "";
    }
    const data = await res.json();
    return data.text || "";
  } catch (e) {
    console.warn("callClaude exception:", e.message);
    return "";
  }
}

async function callClaudeVision(prompt, imageBase64, mediaType = "image/jpeg") {
  try {
    const res = await fetch(FN("claude-proxy"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, imageBase64, mediaType }),
    });
    if (!res.ok) return "";
    const data = await res.json();
    return data.text || "";
  } catch (e) {
    console.warn("callClaudeVision exception:", e.message);
    return "";
  }
}



function buildOrderCard(fornitore, items, utente) {
  const total = items.reduce((s,i)=>s+i.qta*i.prezzo,0);
  const list = items.map(i=>`• ${i.nome}: **${i.qta} ${i.unita}** — ${fmt(i.qta*i.prezzo)}`).join("\n");
  return {
    schema:"2.0",
    header:{template:"blue",title:{tag:"plain_text",content:`🛒 Ordine — ${fornitore.nome}`}},
    body:{elements:[
      {tag:"div",text:{tag:"lark_md",content:`**Data:** ${todayFmt()}\n**Consegna:** ${fornitore.consegna}\n**Ordinato da:** ${utente}`}},
      {tag:"hr"},
      {tag:"div",text:{tag:"lark_md",content:list}},
      {tag:"hr"},
      {tag:"div",text:{tag:"lark_md",content:`**Totale stimato: ${fmt(total)}**`}},
      {tag:"note",elements:[{tag:"lark_md",content:`Tierra OS · ${now()}`}]},
    ]},
  };
}
function buildMenuCard(menuText) {
  return {
    schema:"2.0",
    header:{template:"green",title:{tag:"plain_text",content:`🌿 Menu del Giorno — ${todayFmt()}`}},
    body:{elements:[
      {tag:"div",text:{tag:"lark_md",content:menuText}},
      {tag:"hr"},
      {tag:"note",elements:[{tag:"lark_md",content:"Tierra Organic Bistrot · Via Tirso 34, Roma"}]},
    ]},
  };
}
function buildClosureCard(d) {
  const sc = d.contanti-d.totZ;
  return {
    schema:"2.0",
    header:{template:"green",title:{tag:"plain_text",content:"📊 Chiusura Cassa — "+todayStr()}},
    body:{elements:[
      {tag:"column_set",flex_mode:"stretch",columns:[
        {tag:"column",width:"weighted",weight:1,elements:[{tag:"div",text:{tag:"lark_md",content:`**💵 Cash**\n${fmt(d.cash)}`}}]},
        {tag:"column",width:"weighted",weight:1,elements:[{tag:"div",text:{tag:"lark_md",content:`**💳 POS**\n${fmt(d.pos)}`}}]},
        {tag:"column",width:"weighted",weight:1,elements:[{tag:"div",text:{tag:"lark_md",content:`**🟣 Stripe**\n${fmt(d.stripe)}`}}]},
      ]},
      {tag:"hr"},
      {tag:"div",text:{tag:"lark_md",content:`**🏆 TOT DAY: ${fmt(d.totDay)}**`}},
      {tag:"note",elements:[{tag:"lark_md",content:`${Math.abs(sc)<0.5?"✅":"⚠️"} Scostamento: ${fmt(sc)} · ${now()}`}]},
    ]},
  };
}

// ─── UI ATOMS ────────────────────────────────────────────────────────────────
const Card = ({children,style={}}) => (
  <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,padding:18,...style}}>{children}</div>
);
const Btn = ({children,onClick,variant="primary",small=false,disabled=false,full=false,style={}}) => {
  const v={
    primary:{background:C.gold,color:"#fff",border:"none"},
    ghost:{background:"transparent",color:C.muted,border:`1px solid ${C.border}`},
    danger:{background:C.red+"22",color:C.red,border:`1px solid ${C.red}33`},
    green:{background:C.green+"22",color:C.green,border:`1px solid ${C.green}33`},
    lark:{background:C.lark,color:"#fff",border:"none"},
    dark:{background:C.dark,color:"#fff",border:"none"},
  }[variant]||{};
  return <button disabled={disabled} onClick={onClick} style={{...v,borderRadius:8,padding:small?"6px 12px":"10px 18px",fontSize:small?11:13,fontWeight:500,opacity:disabled?.5:1,width:full?"100%":"auto",transition:"all .15s",...style}}>{children}</button>;
};
const Tag = ({label,color=C.gold}) => (
  <span style={{background:color+"22",color,border:`1px solid ${color}33`,borderRadius:4,padding:"2px 8px",fontSize:10,fontFamily:"'DM Mono',monospace",whiteSpace:"nowrap"}}>{label}</span>
);
const STitle = ({icon,label}) => (
  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:18}}>
    <span style={{fontSize:16}}>{icon}</span>
    <span style={{fontFamily:"'Cormorant Garamond',serif",fontSize:20,fontWeight:600}}>{label}</span>
  </div>
);
const Toggle = ({on,onChange}) => (
  <button onClick={onChange} style={{width:40,height:22,borderRadius:11,border:"none",cursor:"pointer",background:on?C.green:C.border,position:"relative",transition:"background .2s",flexShrink:0}}>
    <div style={{position:"absolute",top:3,width:16,height:16,borderRadius:"50%",background:"#fff",transition:"left .2s",left:on?"21px":"3px"}}/>
  </button>
);

// ═══════════════════════════════════════════════════════════════════════════
// LOGIN SCREEN
// ═══════════════════════════════════════════════════════════════════════════
// ─── SISTEMA PIN (hash + localStorage, nessun PIN in chiaro nel codice) ─────
// I PIN non sono più hardcoded. Al primo login, ogni owner/manager
// imposta il proprio PIN, che viene salvato HASHATO in localStorage.
// Leggibile via DevTools = solo hash, impossibile risalire al PIN originale.

const PIN_REQUIRED_USERS = ["Andres", "Doris", "Farhad"];

function isPinRequired(userName) {
  return PIN_REQUIRED_USERS.includes(userName);
}

function pinStorageKey(userName) {
  return `tierra_pin_${userName}`;
}

function hasUserPin(userName) {
  try {
    const raw = localStorage.getItem(pinStorageKey(userName));
    if (!raw) return false;
    const d = JSON.parse(raw);
    return !!(d?.salt && d?.hash);
  } catch { return false; }
}

async function hashPin(pin, salt) {
  const data = new TextEncoder().encode(pin + "|" + salt);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

function genPinSalt() {
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  return Array.from(arr).map(b => b.toString(16).padStart(2, "0")).join("");
}

async function setUserPin(userName, pin) {
  if (!/^\d{4}$/.test(pin)) throw new Error("PIN deve essere 4 cifre");
  const salt = genPinSalt();
  const hash = await hashPin(pin, salt);
  localStorage.setItem(
    pinStorageKey(userName),
    JSON.stringify({ salt, hash, createdAt: Date.now() })
  );
}

async function verifyUserPin(userName, pin) {
  try {
    const raw = localStorage.getItem(pinStorageKey(userName));
    if (!raw) return false;
    const d = JSON.parse(raw);
    const computed = await hashPin(pin, d.salt);
    return computed === d.hash;
  } catch { return false; }
}

function Login({onLogin}) {
  const [selected,setSelected] = useState(null);
  const [pin,setPin]           = useState("");
  const [pinError,setPinError] = useState(false);
  const [pinMode,setPinMode]   = useState("enter"); // "enter" | "setup"

  const selectedUser = USERS.find(u=>u.nome===selected);
  const requirePin = selected && isPinRequired(selected);

  // Quando l'utente tocca un nome che richiede PIN, decidi se "enter" (già impostato)
  // o "setup" (primo login, deve impostarlo). Staff senza PIN entra diretto.
  const selectUser = (nome) => {
    if (!isPinRequired(nome)) {
      const u = USERS.find(x => x.nome === nome);
      onLogin(u);
      return;
    }
    setSelected(nome);
    setPin("");
    setPinError(false);
    setPinMode(hasUserPin(nome) ? "enter" : "setup");
  };

  const handlePinDigit = (d) => {
    if(pin.length >= 4) return;
    const newPin = pin + d;
    setPin(newPin);
    setPinError(false);
    if(newPin.length === 4) {
      setTimeout(async () => {
        if (pinMode === "setup") {
          // Primo login: imposta il PIN
          try {
            await setUserPin(selected, newPin);
            onLogin(selectedUser);
          } catch(e) {
            setPinError(true);
            setTimeout(()=>{setPin("");setPinError(false);}, 600);
          }
        } else {
          // Login normale: verifica il PIN
          const ok = await verifyUserPin(selected, newPin);
          if (ok) {
            onLogin(selectedUser);
          } else {
            setPinError(true);
            setTimeout(()=>{setPin("");setPinError(false);}, 600);
          }
        }
      }, 150);
    }
  };
  const handlePinDelete = () => { setPin(p=>p.slice(0,-1)); setPinError(false); };

  const enterUser = () => {
    if(requirePin) return; // Aspetta PIN
    onLogin(selectedUser);
  };

  // Schermata PIN
  if(selected && requirePin) {
    return (
      <div style={{minHeight:"100vh",background:C.bg,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:24}}>
        <div style={{textAlign:"center",marginBottom:24}}>
          <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:36,fontWeight:600,color:C.gold,letterSpacing:2}}>TIERRA</div>
          <div style={{fontSize:11,letterSpacing:4,color:C.muted,textTransform:"uppercase",marginTop:4}}>organic · bistrot · cafè</div>
        </div>
        <div style={{background:C.surface,border:`2px solid ${selectedUser.colore}`,borderRadius:16,padding:"20px 24px",display:"flex",alignItems:"center",gap:14,marginBottom:28,width:"100%",maxWidth:320}}>
          <div style={{width:48,height:48,borderRadius:"50%",background:selectedUser.colore+"33",border:`2px solid ${selectedUser.colore}`,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:15,color:selectedUser.colore,flexShrink:0}}>
            {selectedUser.avatar}
          </div>
          <div style={{flex:1}}>
            <div style={{fontWeight:600,fontSize:16}}>{selectedUser.nome}</div>
            <div style={{fontSize:11,color:C.muted,marginTop:2}}>{pinMode==="setup" ? "Imposta il tuo PIN (4 cifre)" : "Inserisci il PIN"}</div>
          </div>
          <button onClick={()=>{setSelected(null);setPin("");setPinError(false);}} style={{background:"none",border:"none",color:C.muted,fontSize:20,cursor:"pointer"}}>✕</button>
        </div>
        {/* Display PIN */}
        <div style={{display:"flex",gap:14,marginBottom:30}}>
          {[0,1,2,3].map(i=>(
            <div key={i} style={{
              width:52,height:60,borderRadius:10,
              background:pinError?C.red+"22":pin.length>i?C.gold+"22":C.surface,
              border:`2px solid ${pinError?C.red:pin.length>i?C.gold:C.border}`,
              display:"flex",alignItems:"center",justifyContent:"center",
              fontSize:28,fontWeight:700,color:pinError?C.red:C.gold,
              transition:"all .2s",
            }}>
              {pin.length>i ? "●" : ""}
            </div>
          ))}
        </div>
        {pinError && <div style={{fontSize:12,color:C.red,marginBottom:16,fontWeight:600}}>⚠ PIN errato</div>}
        {/* Tastierino numerico */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,width:"100%",maxWidth:280}}>
          {[1,2,3,4,5,6,7,8,9].map(d=>(
            <button key={d} onClick={()=>handlePinDigit(String(d))} style={{
              background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,
              padding:"18px 0",fontSize:24,fontWeight:600,color:C.text,cursor:"pointer",
              transition:"all .1s",
            }}>
              {d}
            </button>
          ))}
          <div/>
          <button onClick={()=>handlePinDigit("0")} style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,padding:"18px 0",fontSize:24,fontWeight:600,color:C.text,cursor:"pointer"}}>0</button>
          <button onClick={handlePinDelete} style={{background:"none",border:"none",fontSize:20,color:C.muted,cursor:"pointer"}}>⌫</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{minHeight:"100vh",background:C.bg,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:24}}>
      <div style={{textAlign:"center",marginBottom:36}}>
        <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:42,fontWeight:600,color:C.gold,letterSpacing:2}}>TIERRA</div>
        <div style={{fontSize:11,letterSpacing:4,color:C.muted,textTransform:"uppercase",marginTop:4}}>organic · bistrot · cafè</div>
        <div style={{fontSize:12,color:C.muted,marginTop:16}}>Chi sei oggi?</div>
      </div>
      <div style={{width:"100%",maxWidth:360,display:"flex",flexDirection:"column",gap:10}}>
        {USERS.map(u=>(
          <button key={u.nome} onClick={()=>selectUser(u.nome)} style={{
            background: selected===u.nome ? u.colore+"22" : C.surface,
            border: `2px solid ${selected===u.nome ? u.colore : C.border}`,
            borderRadius:12,padding:"14px 18px",display:"flex",alignItems:"center",gap:14,cursor:"pointer",transition:"all .2s",
          }}>
            <div style={{width:40,height:40,borderRadius:"50%",background:u.colore+"33",border:`2px solid ${u.colore}`,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:13,color:u.colore,flexShrink:0}}>
              {u.avatar}
            </div>
            <div style={{textAlign:"left",flex:1}}>
              <div style={{fontWeight:600,fontSize:15,color:C.text}}>{u.nome}</div>
              <div style={{fontSize:11,color:ROLE_COLORS[u.ruolo]}}>{STAFF_ROLES[u.nome] || ROLE_LABELS[u.ruolo]}</div>
            </div>
            {isPinRequired(u.nome) && <span style={{fontSize:14,color:u.colore}}>🔒</span>}
            {isAdmin({ruolo:u.ruolo}) && !isPinRequired(u.nome) && <Tag label="accesso completo" color={C.gold}/>}
          </button>
        ))}
      </div>
      {selected && !requirePin && (
        <div style={{marginTop:24,width:"100%",maxWidth:360}}>
          <Btn full onClick={enterUser} style={{padding:16,fontSize:16}}>
            Entra come {selected} →
          </Btn>
        </div>
      )}
      <div style={{marginTop:32,fontSize:11,color:C.muted,textAlign:"center"}}>
        Tierra OS · Via Tirso 34, Roma
      </div>
    </div>
  );
}

// ─── DB SETUP BUTTON ─────────────────────────────────────────────────────────
function DbSetupBtn() {
  const [status, setStatus] = useState("idle");
  const run = async () => {
    setStatus("loading");
    const ok = await setupTables();
    setStatus(ok ? "done" : "error");
    setTimeout(() => setStatus("idle"), 3000);
  };
  return (
    <button onClick={run} disabled={status==="loading"} style={{
      background: status==="done" ? C.green+"22" : status==="error" ? C.red+"22" : C.lark,
      color: status==="done" ? C.green : status==="error" ? C.red : "#fff",
      border: "none", borderRadius:8, padding:"8px 14px", fontSize:12, fontWeight:600, cursor:"pointer",
    }}>
      {status==="loading" ? <span className="pulse">Setup…</span>
       : status==="done"  ? "✓ Pronto!"
       : status==="error" ? "✕ Errore"
       : "🔧 Setup DB"}
    </button>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════
function Dashboard({user,tasks,invoices,sales,menuCatalog,fornitori,ordini,setView}) {
  const totVendite = sales.reduce((s,v)=>s+v.importo,0);
  const totSpese   = invoices.reduce((s,i)=>s+i.importo,0);
  const tasksDone  = tasks.filter(t=>t.status==="done").length;
  const scadenti   = invoices.filter(i=>i.stato==="da pagare"&&new Date(i.scadenza)<=new Date(Date.now()+7*86400000));
  const dispMenu   = Object.values(menuCatalog).flat().filter(i=>i.disponibile).length;
  const totMenu    = Object.values(menuCatalog).flat().length;
  const ordiniOggi = ordini.filter(o=>o.data===new Date().toISOString().split("T")[0]).length;

  return (
    <div className="fade" style={{padding:20,maxWidth:720,margin:"0 auto"}}>
      <div style={{marginBottom:20,display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
        <div>
          <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:24,fontWeight:600}}>
            Ciao, {user.nome} 🌿
          </div>
          <div style={{fontSize:11,color:C.muted,marginTop:2}}>{todayStr()}</div>
        </div>
        <div style={{background:ROLE_COLORS[user.ruolo]+"22",border:`1px solid ${ROLE_COLORS[user.ruolo]}33`,borderRadius:8,padding:"4px 10px",fontSize:11,color:ROLE_COLORS[user.ruolo],fontWeight:600}}>
          {ROLE_LABELS[user.ruolo]}
        </div>
      </div>

      {isAdmin(user) && (
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
          {[
            {l:"Fatturato",v:fmt(totVendite),c:C.green,s:`${sales.length} vendite`},
            {l:"Spese",    v:fmt(totSpese),  c:C.red,  s:`${invoices.length} fatture`},
            {l:"Margine",  v:fmt(totVendite-totSpese),c:totVendite-totSpese>=0?C.green:C.red,s:"lordo"},
            {l:"Task oggi",v:`${tasksDone}/${tasks.length}`,c:C.gold,s:"completati"},
          ].map(k=>(
            <Card key={k.l} style={{padding:14}}>
              <div style={{fontSize:10,color:C.muted,textTransform:"uppercase",letterSpacing:1,marginBottom:5}}>{k.l}</div>
              <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:20,fontWeight:600,color:k.c}}>{k.v}</div>
              <div style={{fontSize:10,color:C.muted,marginTop:2}}>{k.s}</div>
            </Card>
          ))}
        </div>
      )}

      {!isAdmin(user) && (
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
          {[
            {l:"Task assegnati",v:tasks.filter(t=>t.assignedTo===user.nome).length,c:C.gold,s:"oggi"},
            {l:"Menu attivo",v:`${dispMenu}/${totMenu}`,c:C.green,s:"piatti disponibili"},
            {l:"Task completati",v:tasks.filter(t=>t.assignedTo===user.nome&&t.status==="done").length,c:C.green,s:"da te oggi"},
            {l:"Ordini inviati",v:ordiniOggi,c:C.blue,s:"oggi"},
          ].map(k=>(
            <Card key={k.l} style={{padding:14}}>
              <div style={{fontSize:10,color:C.muted,textTransform:"uppercase",letterSpacing:1,marginBottom:5}}>{k.l}</div>
              <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:22,fontWeight:600,color:k.c}}>{k.v}</div>
              <div style={{fontSize:10,color:C.muted,marginTop:2}}>{k.s}</div>
            </Card>
          ))}
        </div>
      )}

      {isAdmin(user) && scadenti.length>0 && (
        <Card style={{marginBottom:12,border:`1px solid ${C.red}33`}}>
          <div style={{color:C.red,fontSize:13,fontWeight:600,marginBottom:8}}>⚠ {scadenti.length} fattura/e in scadenza</div>
          {scadenti.map(i=>(
            <div key={i.id} style={{display:"flex",justifyContent:"space-between",fontSize:12,padding:"5px 0",borderTop:`1px solid ${C.border}`,color:C.muted}}>
              <span>{i.fornitore}</span><span style={{color:C.text}}>{fmt(i.importo)} · {i.scadenza}</span>
            </div>
          ))}
        </Card>
      )}

      {isAdmin(user) && (
        <Card style={{marginBottom:12,border:`1px solid ${C.lark}33`}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div>
              <div style={{fontSize:13,fontWeight:600,color:C.lark}}>🗄 Lark Base Database</div>
              <div style={{fontSize:11,color:C.muted,marginTop:2}}>Inizializza le tabelle al primo avvio</div>
            </div>
            <DbSetupBtn/>
          </div>
        </Card>
      )}

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
        {[
          {l:"🌿 Menu del Giorno", v:"menu",    c:C.gold,   all:false},
          {l:"📋 Task",            v:"tasks",   c:C.orange, all:false},
          {l:"🛒 Ordini Fornitori",v:"ordini",  c:C.blue,   all:false},
          {l:"📦 Magazzino",       v:"magazzino",c:C.gold,   all:true},
          {l:"📊 Chiusura Cassa",  v:"chiusura",c:C.green,  all:true},
          {l:"🧾 Fatture",         v:"fatture", c:C.red,    all:true},
          {l:"💰 Vendite",         v:"vendite", c:C.purple, all:true},
        ].filter(a => !a.all || isAdmin(user)).map(a=>(
          <button key={a.v} onClick={()=>setView(a.v)} style={{
            background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,
            padding:"14px",fontSize:13,fontWeight:500,color:a.c,cursor:"pointer",transition:"all .15s",textAlign:"center",
          }}>{a.l}</button>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ORDINI FORNITORI
// ═══════════════════════════════════════════════════════════════════════════
function OrdiniFornitori({fornitori,setFornitori,ordini,setOrdini,user}) {
  const [activeForn,setActiveForn]   = useState(null);
  const [qta,setQta]                 = useState({});
  const [sending,setSending]         = useState(false);
  const [sent,setSent]               = useState(null);
  const [showAddProd,setShowAddProd] = useState(false);
  const [newProd,setNewProd]         = useState({nome:"",unita:"kg",qtaAbituale:"",prezzo:""});
  const [voiceMode,setVoiceMode]     = useState(false);
  const [recording,setRecording]     = useState(false);
  const [transcript,setTranscript]   = useState("");
  const [aiResult,setAiResult]       = useState(null);
  const [processing,setProcessing]   = useState(false);
  const [voiceError,setVoiceError]   = useState("");
  const recognitionRef               = useRef(null);
  const accumulatedRef               = useRef("");

  const forn = fornitori.find(f=>f.id===activeForn);

  const initQta = (f) => {
    const init = {};
    f.prodotti.forEach(p=>{ init[p.id] = p.qtaAbituale; });
    setQta(init);
    setActiveForn(f.id);
    setSent(null);
  };

  const totOrdine = forn ? forn.prodotti.reduce((s,p)=>s+(n(qta[p.id]||0)*p.prezzo),0) : 0;

  const startRecording = () => {
    setVoiceError("");
    setTranscript("");
    setAiResult(null);
    accumulatedRef.current = "";
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if(!SpeechRecognition) {
      setVoiceError("Il tuo browser non supporta la registrazione vocale. Usa Chrome su Android o Safari su iOS.");
      return;
    }
    const rec = new SpeechRecognition();
    rec.lang = "it-IT";
    rec.continuous = true;
    rec.interimResults = true;
    rec.onresult = (e) => {
      let interim = "";
      let final = "";
      for(let i=e.resultIndex;i<e.results.length;i++){
        if(e.results[i].isFinal) final += e.results[i][0].transcript+" ";
        else interim += e.results[i][0].transcript;
      }
      accumulatedRef.current += final;
      setTranscript(accumulatedRef.current + interim);
    };
    rec.onerror = (e) => { setVoiceError("Errore microfono: "+e.error); setRecording(false); };
    rec.onend = () => setRecording(false);
    recognitionRef.current = rec;
    rec.start();
    setRecording(true);
  };

  const stopRecording = () => { recognitionRef.current?.stop(); setRecording(false); };

  const processVoice = async () => {
    const text = accumulatedRef.current || transcript;
    if(!text.trim()) { setVoiceError("Nessun testo registrato. Riprova."); return; }
    setProcessing(true); setVoiceError(""); setAiResult(null);
    const catalogo = fornitori.map(f=>({
      id: f.id, nome: f.nome,
      prodotti: f.prodotti.map(p=>({id:p.id, nome:p.nome, unita:p.unita}))
    }));
    const prompt = `Sei l'assistente ordini di Tierra Organic Bistrot a Roma.
L'operatore ha dettato questo ordine vocale in italiano:
"${text}"

Questi sono i fornitori e i loro prodotti disponibili:
${JSON.stringify(catalogo,null,2)}

Analizza il testo e associa ogni prodotto menzionato al fornitore corretto.
Rispondi SOLO con un JSON valido, niente altro, niente markdown:
[{"fornitoreId":"f1","fornitoreNome":"Nome fornitore","prodotti":[{"prodottoId":"p1","nomeProdotto":"Spinaci Bio","qta":3,"unita":"kg"}]}]

Se un prodotto non è nel catalogo, aggiungilo con prodottoId "nuovo_XXX".
Se la quantità non è chiara, usa la quantità abituale del prodotto.
Raggruppa correttamente per fornitore.`;
    try {
      const raw = await callClaude(prompt);
      const parsed = JSON.parse(raw.replace(/```json|```/g,"").trim());
      setAiResult(parsed);
    } catch(e) {
      setVoiceError("Errore nell'elaborazione AI. Riprova o usa l'inserimento manuale.");
    }
    setProcessing(false);
  };

  const applyAiResult = async () => {
    if(!aiResult) return;
    setSending(true);
    const tok = await larkToken().catch(()=>null);
    for(const gruppo of aiResult) {
      const forn = fornitori.find(f=>f.id===gruppo.fornitoreId);
      if(!forn||gruppo.prodotti.length===0) continue;
      const items = gruppo.prodotti.map(p=>{
        const existing = forn.prodotti.find(fp=>fp.id===p.prodottoId);
        return {
          id: p.prodottoId, nome: p.nomeProdotto,
          unita: p.unita || existing?.unita || "pz",
          prezzo: existing?.prezzo || 0, qta: p.qta,
        };
      });
      const totale = items.reduce((s,i)=>s+i.qta*(i.prezzo||0),0);
      const ordine = {
        id:uid(), fornitoreId:forn.id, fornitoreNome:forn.nome,
        items, totale, utente:user.nome,
        data:new Date().toISOString().split("T")[0], ora:now(),
        stato:"inviato", origine:"vocale"
      };
      setOrdini(prev=>[ordine,...prev]);
      if(tok) { try { await larkSend(tok, buildOrderCard(forn,items,`${user.nome} 🎙️`)); } catch(e){} }
    }
    setSending(false);
    setVoiceMode(false);
    setTranscript("");
    setAiResult(null);
    accumulatedRef.current = "";
    alert(`✅ ${aiResult.length} ordine/i inviati su Lark!`);
  };

  const sendOrder = async () => {
    if(!forn) return;
    setSending(true);
    const items = forn.prodotti.filter(p=>n(qta[p.id])>0).map(p=>({...p,qta:n(qta[p.id])}));
    if(items.length===0){setSending(false);return;}
    const ordine = {
      id:uid(), fornitoreId:forn.id, fornitoreNome:forn.nome,
      items, totale:totOrdine, utente:user.nome,
      data:new Date().toISOString().split("T")[0], ora:now(), stato:"inviato"
    };
    setOrdini(prev=>[ordine,...prev]);
    try { const tok=await larkToken(); await larkSend(tok,buildOrderCard(forn,items,user.nome)); } catch(e){}
    dbSave("Ordini Fornitori", {
      "Data": new Date().toLocaleDateString("it-IT"),
      "Fornitore": forn.nome,
      "Prodotti": items.map(i=>`${i.nome}: ${i.qta} ${i.unita}`).join(", "),
      "Totale": totOrdine, "Operatore": user.nome, "Origine": "manuale",
    }).catch(()=>{});
    setSent(ordine);
    setSending(false);
  };

  const addProdotto = () => {
    if(!newProd.nome||!forn) return;
    setFornitori(prev=>prev.map(f=>f.id===forn.id?{...f,prodotti:[...f.prodotti,{...newProd,id:uid(),qtaAbituale:n(newProd.qtaAbituale),prezzo:n(newProd.prezzo)}]}:f));
    setNewProd({nome:"",unita:"kg",qtaAbituale:"",prezzo:""});
    setShowAddProd(false);
  };

  if(voiceMode) return (
    <div className="fade" style={{padding:20,maxWidth:720,margin:"0 auto"}}>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:20}}>
        <button onClick={()=>{setVoiceMode(false);setTranscript("");setAiResult(null);accumulatedRef.current="";}} style={{background:"none",border:"none",color:C.muted,fontSize:20,cursor:"pointer"}}>←</button>
        <div>
          <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:18,fontWeight:600}}>Ordine Vocale</div>
          <div style={{fontSize:11,color:C.muted}}>Parla liberamente — l'AI divide per fornitore</div>
        </div>
      </div>
      <Card style={{marginBottom:16,background:C.greenLight,border:`1px solid ${C.gold}33`}}>
        <div style={{fontSize:12,color:C.greenDark,lineHeight:1.7}}>
          <strong>Come funziona:</strong><br/>
          Premi il microfono e dicci cosa hai bisogno. Puoi dire tutto insieme, ad esempio:<br/>
          <em style={{color:C.goldDim}}>"Spinaci 3 chili, avocado 15 pezzi, limoni 2 chili. Poi salmone 2 chili, gamberi 1 chilo."</em><br/>
          L'AI capisce da sola quale fornitore e invia ogni ordine separato su Lark.
        </div>
      </Card>
      <div style={{textAlign:"center",marginBottom:20}}>
        <button onClick={recording?stopRecording:startRecording} style={{
          width:100,height:100,borderRadius:"50%",border:"none",cursor:"pointer",
          background: recording ? C.red : C.gold, color:"#fff",fontSize:36,
          boxShadow: recording ? `0 0 0 12px ${C.red}33, 0 0 0 24px ${C.red}11` : `0 4px 20px ${C.gold}44`,
          transition:"all .3s",
        }}>
          {recording ? "⏹" : "🎙"}
        </button>
        <div style={{marginTop:12,fontSize:12,color:recording?C.red:C.muted,fontWeight:recording?600:400}}>
          {recording ? <span className="pulse">● Registrazione in corso… parla!</span> : "Tocca per registrare"}
        </div>
      </div>
      {transcript && (
        <Card style={{marginBottom:14,border:`1px solid ${C.border}`}}>
          <div style={{fontSize:10,color:C.muted,textTransform:"uppercase",letterSpacing:1,marginBottom:8}}>Testo riconosciuto</div>
          <div style={{fontSize:13,lineHeight:1.7,color:C.text,fontStyle:"italic"}}>"{transcript}"</div>
        </Card>
      )}
      {voiceError && (
        <div style={{background:C.red+"22",borderRadius:8,padding:10,marginBottom:14,fontSize:12,color:C.red}}>{voiceError}</div>
      )}
      {transcript && !recording && (
        <Btn full onClick={processVoice} disabled={processing} style={{marginBottom:14,padding:14,fontSize:14}}>
          {processing ? <span className="pulse">🤖 L'AI sta elaborando l'ordine…</span> : "🤖 Elabora con AI"}
        </Btn>
      )}
      {aiResult && (
        <div>
          <div style={{fontSize:13,fontWeight:600,color:C.text,marginBottom:10}}>
            ✓ AI ha trovato {aiResult.length} fornitore/i:
          </div>
          {aiResult.map((gruppo,gi)=>{
            const f = fornitori.find(f=>f.id===gruppo.fornitoreId);
            const totGruppo = gruppo.prodotti.reduce((s,p)=>s+p.qta*(f?.prodotti.find(fp=>fp.id===p.prodottoId)?.prezzo||0),0);
            return (
              <Card key={gi} style={{marginBottom:10,borderLeft:`3px solid ${f?.colore||C.blue}`}}>
                <div style={{fontWeight:600,fontSize:14,marginBottom:8,color:f?.colore||C.text}}>
                  🏪 {gruppo.fornitoreNome}
                </div>
                {gruppo.prodotti.map((p,pi)=>(
                  <div key={pi} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderTop:`1px solid ${C.border}`,fontSize:13}}>
                    <span>{p.nomeProdotto}</span>
                    <span style={{fontFamily:"'DM Mono',monospace",color:C.blue,fontWeight:600}}>{p.qta} {p.unita}</span>
                  </div>
                ))}
                {totGruppo>0&&<div style={{fontSize:11,color:C.muted,marginTop:6,textAlign:"right"}}>Stimato: {fmt(totGruppo)}</div>}
              </Card>
            );
          })}
          <div style={{display:"flex",gap:8,marginTop:4}}>
            <Btn full variant="lark" onClick={applyAiResult} disabled={sending} style={{padding:14,fontSize:14}}>
              {sending?<span className="pulse">Invio ordini su Lark…</span>:"📤 Conferma e invia tutti su Lark"}
            </Btn>
          </div>
          <div style={{marginTop:8,textAlign:"center"}}>
            <button onClick={()=>{setAiResult(null);setTranscript("");accumulatedRef.current="";}} style={{background:"none",border:"none",fontSize:12,color:C.muted,cursor:"pointer"}}>
              ↺ Registra di nuovo
            </button>
          </div>
        </div>
      )}
    </div>
  );

  if(!activeForn) return (
    <div className="fade" style={{padding:20,maxWidth:720,margin:"0 auto"}}>
      <STitle icon="🛒" label="Ordini Fornitori"/>
      <div style={{fontSize:12,color:C.muted,marginBottom:16}}>{todayStr()}</div>
      <button onClick={()=>setVoiceMode(true)} style={{
        width:"100%",background:`linear-gradient(135deg, ${C.gold}, ${C.goldDim})`,
        border:"none",borderRadius:14,padding:"18px 20px",
        display:"flex",alignItems:"center",gap:16,cursor:"pointer",marginBottom:20,
        boxShadow:`0 4px 20px ${C.gold}33`,
      }}>
        <div style={{width:52,height:52,borderRadius:"50%",background:"rgba(255,255,255,0.25)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:26,flexShrink:0}}>🎙</div>
        <div style={{textAlign:"left",flex:1}}>
          <div style={{fontWeight:700,fontSize:16,color:"#fff"}}>Ordine Vocale</div>
          <div style={{fontSize:12,color:"rgba(255,255,255,0.85)",marginTop:2}}>Parla e l'AI compila tutto per fornitore</div>
        </div>
        <span style={{color:"rgba(255,255,255,0.8)",fontSize:20}}>→</span>
      </button>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16}}>
        <div style={{flex:1,height:1,background:C.border}}/>
        <span style={{fontSize:11,color:C.muted}}>oppure seleziona un fornitore</span>
        <div style={{flex:1,height:1,background:C.border}}/>
      </div>
      {ordini.length>0 && (
        <Card style={{marginBottom:16}}>
          <div style={{fontSize:12,fontWeight:600,color:C.muted,textTransform:"uppercase",letterSpacing:1,marginBottom:10}}>Ultimi ordini inviati</div>
          {ordini.slice(0,4).map(o=>(
            <div key={o.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderTop:`1px solid ${C.border}`}}>
              <div>
                <div style={{fontSize:13,fontWeight:500}}>{o.fornitoreNome} {o.origine==="vocale"&&"🎙"}</div>
                <div style={{fontSize:11,color:C.muted}}>{o.data} · {o.ora} · {o.utente}</div>
              </div>
              <div style={{display:"flex",gap:6,alignItems:"center"}}>
                <Tag label={fmt(o.totale)} color={C.blue}/>
                <Tag label="✓ inviato" color={C.green}/>
              </div>
            </div>
          ))}
        </Card>
      )}
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {fornitori.map(f=>(
          <button key={f.id} onClick={()=>initQta(f)} style={{
            background:C.surface,border:`2px solid ${C.border}`,borderRadius:12,
            padding:"16px 18px",display:"flex",alignItems:"center",gap:14,cursor:"pointer",
            transition:"all .2s",textAlign:"left",
          }}>
            <div style={{width:44,height:44,borderRadius:10,background:f.colore+"22",border:`2px solid ${f.colore}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>🏪</div>
            <div style={{flex:1}}>
              <div style={{fontWeight:600,fontSize:15,color:C.text}}>{f.nome}</div>
              <div style={{fontSize:11,color:C.muted,marginTop:2}}>📅 {f.consegna} · {f.prodotti.length} prodotti</div>
            </div>
            <span style={{color:f.colore,fontSize:18}}>→</span>
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="fade" style={{padding:20,maxWidth:720,margin:"0 auto"}}>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:20}}>
        <button onClick={()=>{setActiveForn(null);setSent(null);}} style={{background:"none",border:"none",color:C.muted,fontSize:20,cursor:"pointer"}}>←</button>
        <div>
          <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:18,fontWeight:600}}>{forn.nome}</div>
          <div style={{fontSize:11,color:C.muted}}>📅 {forn.consegna}{forn.contatto?" · "+forn.contatto:""}</div>
        </div>
      </div>
      {sent ? (
        <Card style={{textAlign:"center",border:`1px solid ${C.green}33`,padding:32}}>
          <div style={{fontSize:32,marginBottom:12}}>✅</div>
          <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:20,marginBottom:8}}>Ordine inviato su Lark!</div>
          <div style={{fontSize:13,color:C.muted,marginBottom:4}}>Totale stimato: <strong>{fmt(sent.totale)}</strong></div>
          <div style={{fontSize:12,color:C.muted,marginBottom:20}}>{sent.items.length} prodotti · {sent.ora}</div>
          <div style={{display:"flex",gap:8,justifyContent:"center"}}>
            <Btn variant="ghost" onClick={()=>{setSent(null);initQta(forn);}}>Nuovo ordine</Btn>
            <Btn variant="ghost" onClick={()=>{setActiveForn(null);setSent(null);}}>Torna ai fornitori</Btn>
          </div>
        </Card>
      ) : (
        <>
          <Card style={{marginBottom:12}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
              <div style={{fontSize:11,color:C.muted,textTransform:"uppercase",letterSpacing:1,fontWeight:600}}>Prodotti da ordinare</div>
              <Btn small variant="ghost" onClick={()=>setShowAddProd(!showAddProd)}>+ Prodotto</Btn>
            </div>
            {showAddProd && (
              <div style={{background:C.surface2,borderRadius:8,padding:12,marginBottom:12}}>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
                  <div><div style={{fontSize:10,color:C.muted,marginBottom:3}}>Nome</div><input value={newProd.nome} onChange={e=>setNewProd(p=>({...p,nome:e.target.value}))} style={{width:"100%"}} placeholder="Es. Basilico fresco"/></div>
                  <div><div style={{fontSize:10,color:C.muted,marginBottom:3}}>Unità</div>
                    <select value={newProd.unita} onChange={e=>setNewProd(p=>({...p,unita:e.target.value}))} style={{width:"100%"}}>
                      {["kg","g","lt","ml","pz","bt","cf","busta"].map(u=><option key={u}>{u}</option>)}
                    </select></div>
                  <div><div style={{fontSize:10,color:C.muted,marginBottom:3}}>Qtà abituale</div><input type="number" value={newProd.qtaAbituale} onChange={e=>setNewProd(p=>({...p,qtaAbituale:e.target.value}))} style={{width:"100%"}}/></div>
                  <div><div style={{fontSize:10,color:C.muted,marginBottom:3}}>Prezzo/unità (€)</div><input type="number" value={newProd.prezzo} onChange={e=>setNewProd(p=>({...p,prezzo:e.target.value}))} style={{width:"100%"}}/></div>
                </div>
                <div style={{display:"flex",gap:6}}><Btn small onClick={addProdotto}>Aggiungi</Btn><Btn small variant="ghost" onClick={()=>setShowAddProd(false)}>Annulla</Btn></div>
              </div>
            )}
            {forn.prodotti.map(prod=>(
              <div key={prod.id} className="row-hover" style={{display:"flex",alignItems:"center",gap:10,padding:"10px 6px",borderTop:`1px solid ${C.border}`,borderRadius:6}}>
                <div style={{flex:1}}>
                  <div style={{fontSize:13,fontWeight:500}}>{prod.nome}</div>
                  <div style={{fontSize:11,color:C.muted}}>{fmt(prod.prezzo)}/{prod.unita}</div>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:6}}>
                  <button onClick={()=>setQta(p=>({...p,[prod.id]:Math.max(0,(n(p[prod.id])||0)-0.5)}))} style={{width:28,height:28,borderRadius:6,border:`1px solid ${C.border}`,background:C.surface2,fontSize:16,cursor:"pointer",color:C.muted}}>−</button>
                  <input type="number" value={qta[prod.id]??prod.qtaAbituale} onChange={e=>setQta(p=>({...p,[prod.id]:e.target.value}))}
                    style={{width:55,textAlign:"center",fontFamily:"'DM Mono',monospace",fontSize:13,padding:"5px 6px"}}/>
                  <button onClick={()=>setQta(p=>({...p,[prod.id]:(n(p[prod.id])||0)+0.5}))} style={{width:28,height:28,borderRadius:6,border:`1px solid ${C.border}`,background:C.surface2,fontSize:16,cursor:"pointer",color:C.gold}}>+</button>
                  <span style={{fontSize:10,color:C.muted,width:28,textAlign:"right"}}>{prod.unita}</span>
                </div>
                <span style={{fontFamily:"'DM Mono',monospace",fontSize:11,color:C.blue,width:56,textAlign:"right"}}>
                  {fmt(n(qta[prod.id]??prod.qtaAbituale)*prod.prezzo)}
                </span>
              </div>
            ))}
          </Card>
          <Card style={{marginBottom:14,border:`1px solid ${C.blue}33`}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span style={{fontSize:14,fontWeight:600}}>Totale ordine stimato</span>
              <span style={{fontFamily:"'DM Mono',monospace",fontSize:18,fontWeight:700,color:C.blue}}>{fmt(totOrdine)}</span>
            </div>
          </Card>
          <Btn full onClick={sendOrder} disabled={sending} variant="lark" style={{padding:14,fontSize:15}}>
            {sending?<span className="pulse">Invio ordine su Lark…</span>:`📤 Invia ordine a ${forn.nome}`}
          </Btn>
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MENU DEL GIORNO
// ═══════════════════════════════════════════════════════════════════════════
function MenuGiorno({menuCatalog,setMenuCatalog,user}) {
  const [tab,setTab]             = useState("disponibilita");
  const [noteChef,setNoteChef]   = useState("");
  const [vino,setVino]           = useState("");
  const [generating,setGenerating] = useState(false);
  const [menuText,setMenuText]   = useState("");
  const [sendStatus,setSendStatus] = useState("idle");
  const [editItem,setEditItem]   = useState(null);
  const [showAdd,setShowAdd]     = useState(null);
  const [newItem,setNewItem]     = useState({nome:"",prezzo:"",ingredienti:"",disponibile:true});

  const toggle = async (cat,id) => {
    let updatedItem = null;
    setMenuCatalog(p => {
      const next = {...p,[cat]:p[cat].map(i=>{
        if(i.id===id) { updatedItem={...i,disponibile:!i.disponibile}; return updatedItem; }
        return i;
      })};
      return next;
    });
    if(updatedItem) await syncMenuToSite([updatedItem]);
  };
  const updateItem = async (cat,updated) => {
    setMenuCatalog(p=>({...p,[cat]:p[cat].map(i=>i.id===updated.id?updated:i)}));
    setEditItem(null);
    await syncMenuToSite([updated]);
  };
  const deleteItem = (cat,id) => setMenuCatalog(p=>({...p,[cat]:p[cat].filter(i=>i.id!==id)}));
  const addItem = (cat) => {
    if(!newItem.nome) return;
    setMenuCatalog(p=>({...p,[cat]:[...p[cat],{...newItem,id:uid(),prezzo:n(newItem.prezzo)}]}));
    setNewItem({nome:"",prezzo:"",ingredienti:"",disponibile:true}); setShowAdd(null);
  };

  const disponibili = Object.entries(menuCatalog).reduce((acc,[cat,items])=>{
    const d=items.filter(i=>i.disponibile); if(d.length) acc[cat]=d; return acc;
  },{});

  const generateMenu = async () => {
    setGenerating(true); setMenuText("");
    const list = Object.entries(disponibili).map(([cat,items])=>`${cat}:\n${items.map(i=>`- ${i.nome} (€${i.prezzo}) — ${i.ingredienti}`).join("\n")}`).join("\n\n");
    const result = await callClaude(`Sei il responsabile comunicazione di Tierra Organic Bistrot, bistrot biologico a Roma, Via Tirso 34.
Scrivi il menu del giorno per ${todayFmt()} in italiano elegante e autentico.

PIATTI DISPONIBILI:
${list}

NOTE CHEF: ${noteChef||"nessuna"}
VINO/BEVANDA: ${vino||"selezione naturale del giorno"}

Tono: caldo, genuino, mai commerciale. Includi "Il consiglio del giorno" con 1-2 piatti in evidenza, suggerimento vino abbinato, firma "Andres e il team Tierra 🌿". Max 280 parole.`);
    setMenuText(result); setGenerating(false);
  };

  const sendToLark = async () => {
    setSendStatus("loading");
    try { const tok=await larkToken(); await larkSend(tok,buildMenuCard(menuText)); setSendStatus("success"); }
    catch(e) { setSendStatus("error"); }
    setTimeout(()=>setSendStatus("idle"),3000);
  };

  const downloadMenu = () => {
    const html = `<!DOCTYPE html><html lang="it"><head><meta charset="UTF-8">
<style>@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;1,400&family=DM+Sans:wght@300;400&display=swap');
*{margin:0;padding:0;box-sizing:border-box;}body{font-family:'DM Sans',sans-serif;background:#fafaf7;color:#2c2c24;padding:48px;max-width:560px;margin:0 auto;}
.hdr{text-align:center;margin-bottom:36px;padding-bottom:24px;border-bottom:2px solid #8ba25a;}
.logo{font-family:'Cormorant Garamond',serif;font-size:40px;color:#8ba25a;font-weight:600;}
.sub{font-size:10px;letter-spacing:4px;color:#7a7260;text-transform:uppercase;margin-top:6px;}
.data{font-size:13px;color:#8b4513;margin-top:10px;font-style:italic;}
.body{white-space:pre-wrap;font-size:14px;line-height:1.9;color:#2c2c24;}
.ftr{margin-top:44px;padding-top:20px;border-top:1px solid #e4dfd0;text-align:center;font-size:11px;color:#7a7260;}
@media print{body{padding:20px;}}</style></head><body>
<div class="hdr"><div class="logo">Tierra</div><div class="sub">organic · bistrot · cafè</div><div class="data">Menu del Giorno — ${todayFmt()}</div></div>
<div class="body">${menuText.replace(/</g,"&lt;").replace(/>/g,"&gt;")}</div>
<div class="ftr">Via Tirso 34, Roma · +39 347 991 5420 · tierraorganicbistrot@gmail.com</div>
</body></html>`;
    const blob = new Blob([html],{type:"text/html"});
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `tierra-menu-${new Date().toISOString().split("T")[0]}.html`;
    a.click();
  };

  return (
    <div className="fade" style={{padding:20,maxWidth:720,margin:"0 auto"}}>
      <STitle icon="🌿" label="Menu del Giorno"/>
      <div style={{display:"flex",gap:0,marginBottom:20,borderBottom:`1px solid ${C.border}`}}>
        {[["disponibilita","📦 Disponibilità"],["genera","✨ Genera"],["sito","🌐 Sito Web"],["opzioni","🎨 Opzioni"]].map(([id,lbl])=>(
          <button key={id} onClick={()=>setTab(id)} style={{background:"none",border:"none",borderBottom:`2px solid ${tab===id?C.gold:"transparent"}`,color:tab===id?C.gold:C.muted,padding:"10px 16px",fontSize:12,fontWeight:500,cursor:"pointer"}}>{lbl}</button>
        ))}
      </div>

      {tab==="disponibilita" && Object.entries(menuCatalog).map(([cat,items])=>(
        <Card key={cat} style={{marginBottom:12}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
            <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:15,fontWeight:600}}>{cat}</div>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <span style={{fontSize:11,color:C.muted}}>{items.filter(i=>i.disponibile).length}/{items.length}</span>
              <Btn small variant="ghost" onClick={()=>setShowAdd(showAdd===cat?null:cat)}>+ Aggiungi</Btn>
            </div>
          </div>
          {showAdd===cat&&(
            <div style={{background:C.surface2,borderRadius:8,padding:12,marginBottom:10}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
                <div><div style={{fontSize:10,color:C.muted,marginBottom:3}}>Nome</div><input value={newItem.nome} onChange={e=>setNewItem(p=>({...p,nome:e.target.value}))} style={{width:"100%"}}/></div>
                <div><div style={{fontSize:10,color:C.muted,marginBottom:3}}>Prezzo (€)</div><input type="number" value={newItem.prezzo} onChange={e=>setNewItem(p=>({...p,prezzo:e.target.value}))} style={{width:"100%"}}/></div>
              </div>
              <div style={{marginBottom:8}}><div style={{fontSize:10,color:C.muted,marginBottom:3}}>Ingredienti</div><input value={newItem.ingredienti} onChange={e=>setNewItem(p=>({...p,ingredienti:e.target.value}))} style={{width:"100%"}}/></div>
              <div style={{display:"flex",gap:6}}><Btn small onClick={()=>addItem(cat)}>Aggiungi</Btn><Btn small variant="ghost" onClick={()=>setShowAdd(null)}>Annulla</Btn></div>
            </div>
          )}
          {items.map(item=>(
            editItem?.id===item.id ? (
              <div key={item.id} style={{background:C.surface2,borderRadius:8,padding:12,marginBottom:6}}>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
                  <div><div style={{fontSize:10,color:C.muted,marginBottom:3}}>Nome</div><input value={editItem.nome} onChange={e=>setEditItem(p=>({...p,nome:e.target.value}))} style={{width:"100%"}}/></div>
                  <div><div style={{fontSize:10,color:C.muted,marginBottom:3}}>Prezzo</div><input type="number" value={editItem.prezzo} onChange={e=>setEditItem(p=>({...p,prezzo:n(e.target.value)}))} style={{width:"100%"}}/></div>
                </div>
                <div style={{marginBottom:8}}><div style={{fontSize:10,color:C.muted,marginBottom:3}}>Ingredienti</div><textarea value={editItem.ingredienti} onChange={e=>setEditItem(p=>({...p,ingredienti:e.target.value}))} style={{width:"100%",minHeight:45,resize:"vertical"}}/></div>
                <div style={{display:"flex",gap:6}}><Btn small onClick={()=>updateItem(cat,editItem)}>Salva</Btn><Btn small variant="ghost" onClick={()=>setEditItem(null)}>Annulla</Btn></div>
              </div>
            ) : (
              <div key={item.id} className="row-hover" style={{display:"flex",alignItems:"center",gap:10,padding:"8px 6px",borderTop:`1px solid ${C.border}`,borderRadius:6,opacity:item.disponibile?1:.45}}>
                <Toggle on={item.disponibile} onChange={()=>toggle(cat,item.id)}/>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:13,fontWeight:500,display:"flex",gap:6,alignItems:"center"}}>
                    {item.nome}<span style={{fontFamily:"'DM Mono',monospace",fontSize:11,color:C.gold}}>€{item.prezzo}</span>
                    {!item.disponibile&&<Tag label="non disp." color={C.muted}/>}
                  </div>
                  <div style={{fontSize:11,color:C.muted,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{item.ingredienti}</div>
                </div>
                <Btn small variant="ghost" onClick={()=>setEditItem({...item})}>✎</Btn>
                <Btn small variant="danger" onClick={()=>deleteItem(cat,item.id)}>✕</Btn>
              </div>
            )
          ))}
        </Card>
      ))}

      {tab==="genera" && (
        <div>
          <Card style={{marginBottom:12,border:`1px solid ${C.gold}33`}}>
            <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:15,fontWeight:600,marginBottom:10}}>Disponibili oggi</div>
            {Object.keys(disponibili).length===0
              ? <div style={{fontSize:12,color:C.red}}>⚠ Nessun piatto attivo — vai in Disponibilità</div>
              : Object.entries(disponibili).map(([cat,items])=>(
                <div key={cat} style={{marginBottom:8}}>
                  <div style={{fontSize:10,color:C.gold,textTransform:"uppercase",letterSpacing:1,marginBottom:4}}>{cat}</div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                    {items.map(i=><Tag key={i.id} label={i.nome} color={C.green}/>)}
                  </div>
                </div>
              ))
            }
          </Card>
          <Card style={{marginBottom:12}}>
            <div style={{fontSize:11,color:C.muted,textTransform:"uppercase",letterSpacing:1,marginBottom:6}}>Note dello Chef</div>
            <textarea value={noteChef} onChange={e=>setNoteChef(e.target.value)} placeholder="Es. gamberi freschissimi oggi, topinambur di stagione..." style={{width:"100%",minHeight:65,resize:"vertical"}}/>
            <div style={{marginTop:10}}>
              <div style={{fontSize:11,color:C.muted,textTransform:"uppercase",letterSpacing:1,marginBottom:6}}>Vino / Bevanda del giorno</div>
              <input value={vino} onChange={e=>setVino(e.target.value)} placeholder="Es. Vermentino bio Sardegna..." style={{width:"100%"}}/>
            </div>
          </Card>
          <Btn full onClick={generateMenu} disabled={generating||Object.keys(disponibili).length===0} style={{padding:14,fontSize:14,marginBottom:14}}>
            {generating?<span className="pulse">✨ Generazione…</span>:"✨ Genera Menu del Giorno"}
          </Btn>
          {menuText && (
            <Card style={{border:`1px solid ${C.gold}33`}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10,flexWrap:"wrap",gap:6}}>
                <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:15,fontWeight:600}}>Menu generato</div>
                <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                  <Btn small variant="ghost" onClick={()=>navigator.clipboard.writeText(menuText)}>📋 Copia</Btn>
                  <Btn small variant="ghost" onClick={downloadMenu}>⬇ Scarica</Btn>
                  <Btn small variant="lark" onClick={sendToLark} disabled={sendStatus==="loading"}>
                    {sendStatus==="loading"?<span className="pulse">…</span>:sendStatus==="success"?"✓ Inviato!":"📤 Lark"}
                  </Btn>
                </div>
              </div>
              <div style={{whiteSpace:"pre-wrap",fontSize:13,lineHeight:1.8,background:C.surface2,borderRadius:8,padding:14,borderLeft:`3px solid ${C.gold}`}}>
                {menuText}
              </div>
              <div style={{marginTop:10,display:"flex",justifyContent:"flex-end"}}>
                <Btn small variant="ghost" onClick={generateMenu} disabled={generating}>↺ Rigenera</Btn>
              </div>
            </Card>
          )}
        </div>
      )}

      {tab==="sito" && <MenuSito user={user}/>}
      {tab==="opzioni" && <MenuOpzioni user={user}/>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MENU SITO WEB — CRUD completo via admin API
// ═══════════════════════════════════════════════════════════════════════════
function MenuSito({user}) {
  const [loggedIn, setLoggedIn] = useState(isAdminLoggedIn());
  const [email, setEmail] = useState("admin@tierraorganic.it");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginStatus, setLoginStatus] = useState("idle");

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [catFilter, setCatFilter] = useState("");
  const [editingItem, setEditingItem] = useState(null);
  const [showNew, setShowNew] = useState(false);
  const [newItem, setNewItem] = useState({
    category_slug:"colazione",
    name:"",
    description:"",
    price:"",
    badge:"",
    available:true,
    order:0,
    customization_preset:"none", // none / poke / secondo
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  const doLogin = async () => {
    setLoginStatus("loading");
    setLoginError("");
    const res = await adminLogin(email, password);
    if(res.ok) {
      setLoggedIn(true);
      setLoginStatus("success");
      loadItems();
    } else {
      setLoginError(res.error || "Errore login");
      setLoginStatus("error");
    }
  };
  const doLogout = () => {
    adminLogout();
    setLoggedIn(false);
    setItems([]);
  };

  const loadItems = async () => {
    setLoading(true);
    const res = await adminMenu.list();
    if(res.ok) {
      setItems(res.data || []);
    } else if(res.error === "TOKEN_EXPIRED" || res.error === "NOT_LOGGED_IN") {
      setLoggedIn(false);
    } else {
      setMessage({type:"error", text: "Errore caricamento: "+res.error});
    }
    setLoading(false);
  };

  const showMsg = (type, text, ms=2500) => {
    setMessage({type, text});
    setTimeout(()=>setMessage(null), ms);
  };

  const toggleAvail = async (item) => {
    const res = await adminMenu.toggle(item.id);
    if(res.ok) {
      setItems(prev => prev.map(i => i.id===item.id ? {...i, available:!i.available} : i));
      showMsg("success", `${item.name}: ${!item.available?"attivato":"disattivato"}`);
    } else {
      showMsg("error", "Errore toggle: "+res.error);
    }
  };

  const saveEdit = async () => {
    if(!editingItem) return;
    setSaving(true);
    const patch = {
      name: editingItem.name,
      description: editingItem.description,
      price: parseFloat(editingItem.price)||0,
      badge: editingItem.badge || null,
      order: parseInt(editingItem.order)||0,
      category_slug: editingItem.category_slug,
    };
    const res = await adminMenu.update(editingItem.id, patch);
    if(res.ok) {
      setItems(prev => prev.map(i => i.id===editingItem.id ? {...i, ...patch} : i));
      setEditingItem(null);
      showMsg("success", "✓ Modifiche salvate");
    } else {
      showMsg("error", "Errore: "+res.error);
    }
    setSaving(false);
  };

  const createItem = async () => {
    if(!newItem.name || !newItem.category_slug) {
      showMsg("error", "Nome e categoria obbligatori");
      return;
    }
    setSaving(true);
    const body = {
      category_slug: newItem.category_slug,
      name: newItem.name,
      description: newItem.description || null,
      price: parseFloat(newItem.price)||0,
      badge: newItem.badge || null,
      available: newItem.available,
      order: parseInt(newItem.order)||0,
    };
    // Aggiungi customization groups se preset selezionato
    if(newItem.customization_preset === "poke") {
      body.customization_groups = buildPokeCustomization();
    } else if(newItem.customization_preset === "secondo") {
      body.customization_groups = buildSecondoCustomization();
    }
    const res = await adminMenu.create(body);
    if(res.ok) {
      setItems(prev => [...prev, res.data]);
      setNewItem({category_slug:"colazione",name:"",description:"",price:"",badge:"",available:true,order:0,customization_preset:"none"});
      setShowNew(false);
      showMsg("success", "✓ Piatto creato sul sito!");
    } else {
      showMsg("error", "Errore creazione: "+res.error);
    }
    setSaving(false);
  };

  const deleteItem = async (item) => {
    if(!confirm(`Eliminare "${item.name}" dal sito?`)) return;
    const res = await adminMenu.del(item.id);
    if(res.ok) {
      setItems(prev => prev.filter(i => i.id!==item.id));
      showMsg("success", "✓ Piatto eliminato");
    } else {
      showMsg("error", "Errore: "+res.error);
    }
  };

  // Auto-load items se già loggato
  if(loggedIn && items.length===0 && !loading) {
    loadItems();
  }

  // === LOGIN SCREEN ===
  if(!loggedIn) {
    return (
      <Card style={{padding:24,border:`1px solid ${C.lark}33`}}>
        <div style={{textAlign:"center",marginBottom:20}}>
          <div style={{fontSize:32,marginBottom:8}}>🔐</div>
          <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:20,fontWeight:600}}>Login Sito Admin</div>
          <div style={{fontSize:12,color:C.muted,marginTop:4}}>Accedi come admin per gestire il menu del sito</div>
        </div>
        <div style={{marginBottom:12}}>
          <div style={{fontSize:10,color:C.muted,textTransform:"uppercase",letterSpacing:1,marginBottom:4}}>Email</div>
          <input type="email" value={email} onChange={e=>setEmail(e.target.value)} style={{width:"100%"}}/>
        </div>
        <div style={{marginBottom:16}}>
          <div style={{fontSize:10,color:C.muted,textTransform:"uppercase",letterSpacing:1,marginBottom:4}}>Password</div>
          <input type="password" value={password} onChange={e=>setPassword(e.target.value)} onKeyDown={e=>e.key==="Enter"&&doLogin()} style={{width:"100%"}}/>
        </div>
        {loginError&&<div style={{background:C.red+"22",borderRadius:8,padding:10,marginBottom:14,fontSize:12,color:C.red}}>⚠ {loginError}</div>}
        <Btn full variant="lark" onClick={doLogin} disabled={loginStatus==="loading"} style={{padding:14,fontSize:14}}>
          {loginStatus==="loading"?<span className="pulse">Accesso…</span>:"🔐 Accedi"}
        </Btn>
      </Card>
    );
  }

  // === MAIN UI ===
  const filtered = catFilter ? items.filter(i=>i.category_slug===catFilter) : items;
  const byCat = SITE_CATEGORIES.map(c => ({
    ...c,
    items: items.filter(i=>i.category_slug===c.slug),
  }));

  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14,flexWrap:"wrap",gap:8}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:11,color:C.green,fontWeight:600}}>✓ Connesso come admin</span>
          <Btn small variant="ghost" onClick={doLogout}>Logout</Btn>
        </div>
        <div style={{display:"flex",gap:6}}>
          <Btn small variant="ghost" onClick={loadItems} disabled={loading}>
            {loading?<span className="pulse">⟳</span>:"🔄 Ricarica"}
          </Btn>
          <Btn small onClick={()=>setShowNew(!showNew)}>+ Nuovo piatto</Btn>
        </div>
      </div>

      {message&&(
        <div style={{
          background: message.type==="success"?C.green+"22":C.red+"22",
          borderRadius:8, padding:10, marginBottom:12, fontSize:12,
          color: message.type==="success"?C.green:C.red, fontWeight:600,
        }}>
          {message.text}
        </div>
      )}

      {/* FORM NUOVO PIATTO */}
      {showNew && (
        <Card style={{marginBottom:14,border:`2px solid ${C.gold}`}}>
          <div style={{fontSize:13,fontWeight:700,color:C.gold,marginBottom:14,textTransform:"uppercase",letterSpacing:1}}>➕ Nuovo Piatto</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
            <div>
              <div style={{fontSize:10,color:C.muted,marginBottom:4}}>Categoria *</div>
              <select value={newItem.category_slug} onChange={e=>setNewItem(p=>({...p,category_slug:e.target.value}))} style={{width:"100%"}}>
                {SITE_CATEGORIES.map(c=><option key={c.slug} value={c.slug}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <div style={{fontSize:10,color:C.muted,marginBottom:4}}>Ordine</div>
              <input type="number" value={newItem.order} onChange={e=>setNewItem(p=>({...p,order:e.target.value}))} style={{width:"100%"}}/>
            </div>
          </div>
          <div style={{marginBottom:10}}>
            <div style={{fontSize:10,color:C.muted,marginBottom:4}}>Nome *</div>
            <input value={newItem.name} onChange={e=>setNewItem(p=>({...p,name:e.target.value}))} placeholder="Es. Avocado Toast" style={{width:"100%"}}/>
          </div>
          <div style={{marginBottom:10}}>
            <div style={{fontSize:10,color:C.muted,marginBottom:4}}>Descrizione</div>
            <textarea value={newItem.description} onChange={e=>setNewItem(p=>({...p,description:e.target.value}))} placeholder="Ingredienti, descrizione…" style={{width:"100%",minHeight:60,resize:"vertical"}}/>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
            <div>
              <div style={{fontSize:10,color:C.muted,marginBottom:4}}>Prezzo (€)</div>
              <input type="number" step="0.01" value={newItem.price} onChange={e=>setNewItem(p=>({...p,price:e.target.value}))} style={{width:"100%"}}/>
            </div>
            <div>
              <div style={{fontSize:10,color:C.muted,marginBottom:4}}>Badge (es. Nuovo, Chef)</div>
              <input value={newItem.badge} onChange={e=>setNewItem(p=>({...p,badge:e.target.value}))} style={{width:"100%"}}/>
            </div>
          </div>
          <div style={{marginBottom:14}}>
            <div style={{fontSize:10,color:C.muted,marginBottom:4}}>Personalizzazione</div>
            <select value={newItem.customization_preset} onChange={e=>setNewItem(p=>({...p,customization_preset:e.target.value}))} style={{width:"100%"}}>
              <option value="none">Nessuna (piatto semplice)</option>
              <option value="poke">🐟 Poke Bowl (Base + Proteina + Extra)</option>
              <option value="secondo">🍽️ Secondo con Contorno (2 Proteine + Extra)</option>
            </select>
            {newItem.customization_preset!=="none" && (
              <div style={{fontSize:10,color:C.muted,marginTop:4,fontStyle:"italic"}}>
                ⓘ Verranno aggiunte automaticamente le opzioni standard Tierra
              </div>
            )}
          </div>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:14}}>
            <Toggle on={newItem.available} onChange={()=>setNewItem(p=>({...p,available:!p.available}))}/>
            <span style={{fontSize:12,color:C.muted}}>Disponibile subito</span>
          </div>
          <div style={{display:"flex",gap:8}}>
            <Btn onClick={createItem} disabled={saving}>{saving?<span className="pulse">Salvataggio…</span>:"✓ Crea piatto"}</Btn>
            <Btn variant="ghost" onClick={()=>setShowNew(false)}>Annulla</Btn>
          </div>
        </Card>
      )}

      {/* FILTRO CATEGORIE */}
      <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:14}}>
        <button onClick={()=>setCatFilter("")} style={{
          background:catFilter===""?C.gold:C.surface,color:catFilter===""?"#fff":C.muted,
          border:`1px solid ${catFilter===""?C.gold:C.border}`,borderRadius:6,padding:"5px 12px",fontSize:11,fontWeight:500,cursor:"pointer",
        }}>Tutti ({items.length})</button>
        {SITE_CATEGORIES.map(c=>{
          const count = items.filter(i=>i.category_slug===c.slug).length;
          return (
            <button key={c.slug} onClick={()=>setCatFilter(c.slug)} style={{
              background:catFilter===c.slug?C.gold:C.surface,color:catFilter===c.slug?"#fff":C.muted,
              border:`1px solid ${catFilter===c.slug?C.gold:C.border}`,borderRadius:6,padding:"5px 12px",fontSize:11,fontWeight:500,cursor:"pointer",
            }}>{c.label} ({count})</button>
          );
        })}
      </div>

      {loading && items.length===0 && (
        <Card style={{textAlign:"center",padding:40}}>
          <span className="pulse" style={{fontSize:12,color:C.muted}}>⟳ Caricamento menu dal sito…</span>
        </Card>
      )}

      {/* LISTA PIATTI */}
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {filtered.length===0 && !loading && (
          <div style={{textAlign:"center",color:C.muted,padding:40,fontSize:13}}>Nessun piatto in questa categoria</div>
        )}
        {filtered.map(item => editingItem?.id===item.id ? (
          <Card key={item.id} style={{border:`2px solid ${C.blue}`}}>
            <div style={{fontSize:11,color:C.blue,textTransform:"uppercase",letterSpacing:1,marginBottom:12,fontWeight:700}}>✏️ Modifica piatto</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
              <div>
                <div style={{fontSize:10,color:C.muted,marginBottom:4}}>Categoria</div>
                <select value={editingItem.category_slug} onChange={e=>setEditingItem(p=>({...p,category_slug:e.target.value}))} style={{width:"100%"}}>
                  {SITE_CATEGORIES.map(c=><option key={c.slug} value={c.slug}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <div style={{fontSize:10,color:C.muted,marginBottom:4}}>Ordine</div>
                <input type="number" value={editingItem.order||0} onChange={e=>setEditingItem(p=>({...p,order:e.target.value}))} style={{width:"100%"}}/>
              </div>
            </div>
            <div style={{marginBottom:10}}>
              <div style={{fontSize:10,color:C.muted,marginBottom:4}}>Nome</div>
              <input value={editingItem.name} onChange={e=>setEditingItem(p=>({...p,name:e.target.value}))} style={{width:"100%"}}/>
            </div>
            <div style={{marginBottom:10}}>
              <div style={{fontSize:10,color:C.muted,marginBottom:4}}>Descrizione</div>
              <textarea value={editingItem.description||""} onChange={e=>setEditingItem(p=>({...p,description:e.target.value}))} style={{width:"100%",minHeight:60,resize:"vertical"}}/>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
              <div>
                <div style={{fontSize:10,color:C.muted,marginBottom:4}}>Prezzo (€)</div>
                <input type="number" step="0.01" value={editingItem.price} onChange={e=>setEditingItem(p=>({...p,price:e.target.value}))} style={{width:"100%"}}/>
              </div>
              <div>
                <div style={{fontSize:10,color:C.muted,marginBottom:4}}>Badge</div>
                <input value={editingItem.badge||""} onChange={e=>setEditingItem(p=>({...p,badge:e.target.value}))} style={{width:"100%"}}/>
              </div>
            </div>
            <div style={{display:"flex",gap:8}}>
              <Btn onClick={saveEdit} disabled={saving}>{saving?<span className="pulse">Salvataggio…</span>:"✓ Salva modifiche"}</Btn>
              <Btn variant="ghost" onClick={()=>setEditingItem(null)}>Annulla</Btn>
            </div>
          </Card>
        ) : (
          <Card key={item.id} style={{padding:12,opacity:item.available?1:.55,borderLeft:`3px solid ${item.available?C.green:C.muted}`}}>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <Toggle on={item.available} onChange={()=>toggleAvail(item)}/>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
                  <span style={{fontSize:14,fontWeight:600}}>{item.name}</span>
                  <span style={{fontFamily:"'DM Mono',monospace",fontSize:12,color:C.gold,fontWeight:600}}>€{Number(item.price||0).toFixed(2)}</span>
                  {item.badge&&<Tag label={item.badge} color={C.orange}/>}
                  {item.is_special&&<Tag label="⭐ Special" color={C.gold}/>}
                  {item.customization_groups&&item.customization_groups.length>0&&<Tag label={`${item.customization_groups.length} opzioni`} color={C.blue}/>}
                </div>
                <div style={{fontSize:11,color:C.muted,marginTop:2}}>
                  <span style={{textTransform:"uppercase",letterSpacing:.5}}>{SITE_CATEGORIES.find(c=>c.slug===item.category_slug)?.label||item.category_slug}</span>
                  {item.description&&<> · {item.description.length>60?item.description.slice(0,60)+"…":item.description}</>}
                </div>
              </div>
              <Btn small variant="ghost" onClick={()=>setEditingItem({...item})}>✎</Btn>
              <Btn small variant="danger" onClick={()=>deleteItem(item)}>✕</Btn>
            </div>
          </Card>
        ))}
      </div>

      {items.length>0&&(
        <Card style={{marginTop:14,padding:12,background:C.surface2}}>
          <div style={{fontSize:11,color:C.muted,marginBottom:6,fontWeight:600}}>📊 Riepilogo</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:10}}>
            <div style={{fontSize:12}}>Totale: <strong>{items.length}</strong></div>
            <div style={{fontSize:12,color:C.green}}>Attivi: <strong>{items.filter(i=>i.available).length}</strong></div>
            <div style={{fontSize:12,color:C.muted}}>Disattivi: <strong>{items.filter(i=>!i.available).length}</strong></div>
          </div>
        </Card>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MENU OPZIONI — editor per Basi, Proteine, Extras
// ═══════════════════════════════════════════════════════════════════════════
function MenuOpzioni({user}) {
  const GROUPS = [
    {key:"basi",      label:"🌾 Basi di carboidrati", hint:"Riso, couscous, ecc. Prezzo 0 = incluso nel piatto", defaultArr:DEFAULT_BASI_CARBOIDRATI},
    {key:"prot_prem", label:"🐟 Proteine Premium (+€3)", hint:"Pesci pregiati, polpo, gamberi", defaultArr:DEFAULT_PROTEINE_PREMIUM},
    {key:"prot_std",  label:"🍗 Proteine Standard (+€2)", hint:"Pollo, hummus, veggie", defaultArr:DEFAULT_PROTEINE_STANDARD},
    {key:"extras",    label:"➕ Extras", hint:"Avocado, focaccia, porzioni aggiuntive", defaultArr:DEFAULT_EXTRAS_AGGIUNTIVI},
  ];

  const [activeGroup, setActiveGroup] = useState("basi");
  const [items, setItems] = useState(loadOpz("basi", DEFAULT_BASI_CARBOIDRATI));
  const [editing, setEditing] = useState(null);
  const [showNew, setShowNew] = useState(false);
  const [newItem, setNewItem] = useState({name:"",price:"",desc:""});
  const [message, setMessage] = useState(null);

  const changeGroup = (k) => {
    const g = GROUPS.find(g=>g.key===k);
    setActiveGroup(k);
    setItems(loadOpz(k, g.defaultArr));
    setEditing(null);
    setShowNew(false);
  };

  const showMsg = (type, text, ms=2200) => {
    setMessage({type, text});
    setTimeout(()=>setMessage(null), ms);
  };

  const saveList = (newList) => {
    setItems(newList);
    saveOpz(activeGroup, newList);
  };

  const addItem = () => {
    if(!newItem.name) { showMsg("error","Nome obbligatorio"); return; }
    saveList([...items, {name:newItem.name, price:parseFloat(newItem.price)||0, desc:newItem.desc||""}]);
    setNewItem({name:"",price:"",desc:""});
    setShowNew(false);
    showMsg("success","✓ Opzione aggiunta");
  };

  const updateItem = (idx, patch) => {
    saveList(items.map((it,i)=>i===idx?{...it,...patch}:it));
  };

  const deleteItem = (idx) => {
    if(!confirm(`Eliminare "${items[idx].name}"?`)) return;
    saveList(items.filter((_,i)=>i!==idx));
    showMsg("success","✓ Eliminata");
  };

  const resetGroup = () => {
    const g = GROUPS.find(g=>g.key===activeGroup);
    if(!confirm(`Ripristinare "${g.label}" ai valori di default? Perderai le modifiche.`)) return;
    saveList(g.defaultArr);
    showMsg("success","✓ Ripristinato al default");
  };

  const saveEdit = () => {
    if(!editing || !editing.name) { showMsg("error","Nome obbligatorio"); return; }
    saveList(items.map((it,i)=>i===editing.idx?{name:editing.name,price:parseFloat(editing.price)||0,desc:editing.desc||""}:it));
    setEditing(null);
    showMsg("success","✓ Modificata");
  };

  const currentGroup = GROUPS.find(g=>g.key===activeGroup);

  return (
    <div>
      <Card style={{marginBottom:14,background:C.gold+"11",border:`1px solid ${C.gold}33`}}>
        <div style={{fontSize:12,color:C.gold,fontWeight:700,marginBottom:6,textTransform:"uppercase",letterSpacing:1}}>ℹ️ Come funziona</div>
        <div style={{fontSize:12,color:C.text,lineHeight:1.6}}>
          Qui gestisci le opzioni di personalizzazione (Basi, Proteine, Extras) usate dai piatti <strong>Poke Bowl</strong> e <strong>Secondo con Contorno</strong>. Le modifiche valgono per i piatti creati <strong>dopo</strong> l'aggiornamento. Per applicarle a piatti esistenti sul sito, ricreali.
        </div>
      </Card>

      {/* Selettore gruppo */}
      <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:14}}>
        {GROUPS.map(g=>(
          <button key={g.key} onClick={()=>changeGroup(g.key)} style={{
            background:activeGroup===g.key?C.gold:C.surface,color:activeGroup===g.key?"#fff":C.muted,
            border:`1px solid ${activeGroup===g.key?C.gold:C.border}`,borderRadius:6,padding:"7px 14px",
            fontSize:12,fontWeight:500,cursor:"pointer",
          }}>{g.label}</button>
        ))}
      </div>

      {message&&(
        <div style={{
          background: message.type==="success"?C.green+"22":C.red+"22",
          borderRadius:8, padding:10, marginBottom:12, fontSize:12,
          color: message.type==="success"?C.green:C.red, fontWeight:600,
        }}>{message.text}</div>
      )}

      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12,flexWrap:"wrap",gap:8}}>
        <div style={{fontSize:11,color:C.muted,fontStyle:"italic"}}>{currentGroup.hint}</div>
        <div style={{display:"flex",gap:6}}>
          <Btn small variant="ghost" onClick={resetGroup}>🔄 Reset default</Btn>
          <Btn small onClick={()=>setShowNew(!showNew)}>+ Aggiungi</Btn>
        </div>
      </div>

      {showNew&&(
        <Card style={{marginBottom:14,border:`2px solid ${C.gold}`}}>
          <div style={{fontSize:13,fontWeight:700,color:C.gold,marginBottom:12}}>➕ Nuova opzione</div>
          <div style={{marginBottom:10}}>
            <div style={{fontSize:10,color:C.muted,marginBottom:4}}>Nome</div>
            <input value={newItem.name} onChange={e=>setNewItem(p=>({...p,name:e.target.value}))} placeholder="Es. Quinoa" style={{width:"100%"}}/>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 2fr",gap:10,marginBottom:12}}>
            <div>
              <div style={{fontSize:10,color:C.muted,marginBottom:4}}>Prezzo (€)</div>
              <input type="number" step="0.01" value={newItem.price} onChange={e=>setNewItem(p=>({...p,price:e.target.value}))} placeholder="0.00" style={{width:"100%"}}/>
            </div>
            <div>
              <div style={{fontSize:10,color:C.muted,marginBottom:4}}>Descrizione</div>
              <input value={newItem.desc} onChange={e=>setNewItem(p=>({...p,desc:e.target.value}))} placeholder="Opzionale" style={{width:"100%"}}/>
            </div>
          </div>
          <div style={{display:"flex",gap:8}}>
            <Btn onClick={addItem}>✓ Aggiungi</Btn>
            <Btn variant="ghost" onClick={()=>{setShowNew(false);setNewItem({name:"",price:"",desc:""});}}>Annulla</Btn>
          </div>
        </Card>
      )}

      <div style={{display:"flex",flexDirection:"column",gap:6}}>
        {items.length===0&&<div style={{textAlign:"center",color:C.muted,padding:30,fontSize:13}}>Nessuna opzione. Aggiungine una!</div>}
        {items.map((item,idx)=>editing?.idx===idx?(
          <Card key={idx} style={{border:`2px solid ${C.blue}`,padding:12}}>
            <div style={{fontSize:11,color:C.blue,marginBottom:8,fontWeight:700}}>✏️ Modifica</div>
            <div style={{marginBottom:8}}>
              <input value={editing.name} onChange={e=>setEditing(p=>({...p,name:e.target.value}))} placeholder="Nome" style={{width:"100%"}}/>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 2fr",gap:8,marginBottom:10}}>
              <input type="number" step="0.01" value={editing.price} onChange={e=>setEditing(p=>({...p,price:e.target.value}))} placeholder="Prezzo" style={{width:"100%"}}/>
              <input value={editing.desc||""} onChange={e=>setEditing(p=>({...p,desc:e.target.value}))} placeholder="Descrizione" style={{width:"100%"}}/>
            </div>
            <div style={{display:"flex",gap:6}}>
              <Btn small onClick={saveEdit}>✓ Salva</Btn>
              <Btn small variant="ghost" onClick={()=>setEditing(null)}>Annulla</Btn>
            </div>
          </Card>
        ):(
          <Card key={idx} className="row-hover" style={{padding:"10px 14px",display:"flex",alignItems:"center",gap:10}}>
            <div style={{flex:1,minWidth:0}}>
              <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                <span style={{fontSize:13,fontWeight:600}}>{item.name}</span>
                <span style={{fontFamily:"'DM Mono',monospace",fontSize:12,color:item.price===0?C.green:C.gold,fontWeight:600}}>
                  {item.price===0?"Incluso":"+€"+Number(item.price).toFixed(2)}
                </span>
              </div>
              {item.desc&&<div style={{fontSize:11,color:C.muted,marginTop:2}}>{item.desc}</div>}
            </div>
            <Btn small variant="ghost" onClick={()=>setEditing({idx,name:item.name,price:String(item.price),desc:item.desc||""})}>✎</Btn>
            <Btn small variant="danger" onClick={()=>deleteItem(idx)}>✕</Btn>
          </Card>
        ))}
      </div>

      {items.length>0&&(
        <div style={{textAlign:"center",fontSize:11,color:C.muted,marginTop:14}}>
          {items.length} opzione/i · salvate automaticamente
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TASKS
// ═══════════════════════════════════════════════════════════════════════════
function Tasks({tasks,setTasks,user}) {
  const [filter,setFilter] = useState("tutti");
  const [showNew,setShowNew] = useState(false);
  const [showLoad,setShowLoad] = useState(false);
  const [sending,setSending] = useState(null);
  const [form,setForm] = useState({title:"",role:"sala",priority:"media",assignedTo:user.nome,type:"extra"});

  const roleColors = {sala:C.blue,cucina:C.orange,magazzino:C.purple,manager:C.gold};
  const prioColor  = p => p==="alta"?C.red:p==="media"?C.orange:C.muted;
  const statColor  = s => s==="done"?C.green:s==="inprogress"?C.orange:C.muted;
  const statLabel  = s => s==="done"?"✓ Fatto":s==="inprogress"?"● In corso":"○ In attesa";

  const myTasks   = tasks.filter(t=>t.assignedTo===user.nome||isAdmin(user));
  const filtered  = filter==="tutti"?myTasks:filter==="pending"?myTasks.filter(t=>t.status==="pending"):filter==="inprogress"?myTasks.filter(t=>t.status==="inprogress"):filter==="done"?myTasks.filter(t=>t.status==="done"):myTasks.filter(t=>t.role===filter);

  const addTask = () => {
    if(!form.title) return;
    setTasks(p=>[...p,{...form,id:uid(),status:"pending",startTime:null,endTime:null}]);
    setForm({title:"",role:"sala",priority:"media",assignedTo:user.nome,type:"extra"});
    setShowNew(false);
  };
  const loadTemplate = k => {
    setTasks(p=>[...p,...TASK_TEMPLATES[k].map(t=>({...t,id:uid(),status:"pending",startTime:null,endTime:null,type:"fisso",assignedTo:""}))]);
    setShowLoad(false);
  };
  const startTask = async id => {
    const t = tasks.find(t=>t.id===id);
    setTasks(p=>p.map(t=>t.id===id?{...t,status:"inprogress",startTime:now(),assignedTo:user.nome}:t));
    setSending(id);
    try { const tok=await larkToken(); await larkSend(tok,{schema:"2.0",header:{template:"yellow",title:{tag:"plain_text",content:`🟡 INIZIATO — ${t.title}`}},body:{elements:[{tag:"div",text:{tag:"lark_md",content:`**${user.nome}** ha iniziato: ${t.title}\n${now()}`}},{tag:"note",elements:[{tag:"lark_md",content:`Tierra OS · ${todayStr()}`}]}]}}); } catch(e){}
    setSending(null);
  };
  const doneTask = async id => {
    const t = tasks.find(t=>t.id===id);
    setTasks(p=>p.map(t=>t.id===id?{...t,status:"done",endTime:now()}:t));
    if(t) dbSave("Task", {
      "Data": new Date().toLocaleDateString("it-IT"),
      "Titolo": t.title, "Ruolo": t.role,
      "Operatore": user.nome, "Inizio": t.startTime||"",
      "Fine": now(), "Stato": "completato",
    }).catch(()=>{});
    setSending(id);
    try { const tok=await larkToken(); await larkSend(tok,{schema:"2.0",header:{template:"green",title:{tag:"plain_text",content:`✅ COMPLETATO — ${t.title}`}},body:{elements:[{tag:"div",text:{tag:"lark_md",content:`**${user.nome}** ha completato: ${t.title}\nDurata: ${t.startTime} → ${now()}`}},{tag:"note",elements:[{tag:"lark_md",content:`Tierra OS · ${todayStr()}`}]}]}}); } catch(e){}
    setSending(null);
  };

  return (
    <div className="fade" style={{padding:20,maxWidth:720,margin:"0 auto"}}>
      <STitle icon="📋" label="Task & Protocollo"/>
      <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:14}}>
        {[["tutti","Tutti"],["pending","In attesa"],["inprogress","In corso"],["done","Completati"]].map(([v,l])=>(
          <button key={v} onClick={()=>setFilter(v)} style={{background:filter===v?C.gold:C.surface,color:filter===v?"#fff":C.muted,border:`1px solid ${filter===v?C.gold:C.border}`,borderRadius:6,padding:"5px 12px",fontSize:11,fontWeight:500,cursor:"pointer"}}>{l}</button>
        ))}
      </div>
      <div style={{display:"flex",gap:8,marginBottom:16,flexWrap:"wrap"}}>
        {isAdmin(user)&&<Btn small onClick={()=>setShowNew(!showNew)}>+ Nuovo task</Btn>}
        {isAdmin(user)&&<Btn small variant="ghost" onClick={()=>setShowLoad(!showLoad)}>📂 Protocollo</Btn>}
      </div>
      {showLoad&&isAdmin(user)&&(
        <Card style={{marginBottom:14}}>
          <div style={{fontSize:12,fontWeight:600,marginBottom:10,color:C.muted}}>Carica protocollo</div>
          <div style={{display:"flex",gap:8}}>
            <Btn small variant="ghost" onClick={()=>loadTemplate("apertura")}>🌅 Apertura</Btn>
            <Btn small variant="ghost" onClick={()=>loadTemplate("chiusura")}>🌙 Chiusura</Btn>
          </div>
        </Card>
      )}
      {showNew&&isAdmin(user)&&(
        <Card style={{marginBottom:14,border:`1px solid ${C.gold}33`}}>
          <div style={{marginBottom:10}}><div style={{fontSize:10,color:C.muted,marginBottom:4}}>Descrizione</div><input value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} placeholder="Descrivi il task…" style={{width:"100%"}}/></div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
            <div><div style={{fontSize:10,color:C.muted,marginBottom:4}}>Ruolo</div>
              <select value={form.role} onChange={e=>setForm(f=>({...f,role:e.target.value}))} style={{width:"100%"}}>
                {["sala","cucina","magazzino","manager"].map(r=><option key={r} value={r}>{r.charAt(0).toUpperCase()+r.slice(1)}</option>)}
              </select></div>
            <div><div style={{fontSize:10,color:C.muted,marginBottom:4}}>Priorità</div>
              <select value={form.priority} onChange={e=>setForm(f=>({...f,priority:e.target.value}))} style={{width:"100%"}}>
                <option value="alta">Alta</option><option value="media">Media</option><option value="bassa">Bassa</option>
              </select></div>
          </div>
          <div style={{marginBottom:10}}><div style={{fontSize:10,color:C.muted,marginBottom:4}}>Assegna a</div><input value={form.assignedTo} onChange={e=>setForm(f=>({...f,assignedTo:e.target.value}))} placeholder="Nome operatore" style={{width:"100%"}}/></div>
          <div style={{display:"flex",gap:8}}><Btn onClick={addTask}>Aggiungi</Btn><Btn variant="ghost" onClick={()=>setShowNew(false)}>Annulla</Btn></div>
        </Card>
      )}
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {filtered.length===0&&<div style={{textAlign:"center",color:C.muted,fontSize:13,padding:24}}>Nessun task</div>}
        {filtered.map(task=>(
          <div key={task.id} style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,padding:14,opacity:task.status==="done"?.55:1,borderLeft:`3px solid ${prioColor(task.priority)}`}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8}}>
              <div style={{flex:1}}>
                <div style={{fontSize:14,fontWeight:500,marginBottom:5,textDecoration:task.status==="done"?"line-through":"none",color:task.status==="done"?C.muted:C.text}}>{task.title}</div>
                <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
                  <Tag label={task.role} color={roleColors[task.role]||C.muted}/>
                  <Tag label={task.priority} color={prioColor(task.priority)}/>
                  <Tag label={statLabel(task.status)} color={statColor(task.status)}/>
                </div>
                {task.assignedTo&&<div style={{fontSize:11,color:C.muted,marginTop:4}}>👤 {task.assignedTo}</div>}
                {task.startTime&&<div style={{fontSize:11,color:C.orange,marginTop:2}}>▶ {task.startTime}{task.endTime?` · ✓ ${task.endTime}`:""}</div>}
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:5,flexShrink:0}}>
                {task.status==="pending"&&<Btn small variant="ghost" onClick={()=>startTask(task.id)} disabled={sending===task.id}>{sending===task.id?<span className="pulse">…</span>:"▶ Inizia"}</Btn>}
                {task.status==="inprogress"&&<Btn small variant="green" onClick={()=>doneTask(task.id)} disabled={sending===task.id}>{sending===task.id?<span className="pulse">…</span>:"✓ Fatto"}</Btn>}
                {isAdmin(user)&&<Btn small variant="danger" onClick={()=>setTasks(p=>p.filter(t=>t.id!==task.id))}>✕</Btn>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// CHIUSURA CASSA
// ═══════════════════════════════════════════════════════════════════════════
function Chiusura() {
  const [f,setF] = useState({cash:"",pos:"",ticket:"",fatCash:"",fatPos:"",stripe:"",commStr:"",cashZ:"",scontrZ:"",contFis:"",note:""});
  // Fondo cassa per taglio
  const [fondo,setFondo] = useState({t50:0,t20:0,t10:0,t5:0,t2:0,t1:0,c50:0,c20:0,c10:0});
  const TAGLI = [
    {k:"t50",l:"€ 50",v:50},{k:"t20",l:"€ 20",v:20},{k:"t10",l:"€ 10",v:10},
    {k:"t5",l:"€ 5",v:5},{k:"t2",l:"€ 2",v:2},{k:"t1",l:"€ 1",v:1},
    {k:"c50",l:"50 ¢",v:0.50},{k:"c20",l:"20 ¢",v:0.20},{k:"c10",l:"10 ¢",v:0.10},
  ];
  const fondoTot = TAGLI.reduce((s,{k,v})=>s+(fondo[k]||0)*v,0);

  const [status,setStatus] = useState("idle");
  const [errMsg,setErrMsg] = useState("");

  // ─── FORMULE EXCEL ESATTE ──────────────────────────
  // Mappatura celle Excel → campi OS:
  //   B2 VENDITE = f.cash       B3 POS = f.pos        B4 TICKET = f.ticket
  //   B5 FATT CASH = f.fatCash  B6 FATT POS = f.fatPos
  //   B7 TOT DA VERSARE  = B2 + B5 − (B3 − B6)
  //   B8 CASH Z          = fondo conteggio − 150 − fatt POS
  //   B9 SCONTRINI Z     = f.scontrZ (manuale)
  //   B10 TOT Z          = B8 − B9
  //   B11 TOT DAY        = B3 + B4 + B7 + B10
  const daVersare = n(f.cash) + n(f.fatCash) - (n(f.pos) - n(f.fatPos));
  const FONDO_FISSO = 150;
  const cashZ = fondoTot - FONDO_FISSO - n(f.fatPos);
  const totZ = cashZ - n(f.scontrZ);
  const totDay = n(f.pos) + n(f.ticket) + daVersare + totZ;
  // Stripe (info separata, non entra nel TOT DAY del sistema Excel)
  const stripeNet = n(f.stripe) - n(f.commStr);
  // Incassi lordi (info, somma di tutti gli incassi del giorno)
  const totIncassi = n(f.cash) + n(f.pos) + n(f.ticket) + n(f.fatCash) + n(f.fatPos) + stripeNet;
  // Scostamento = contanti fisici contati vs cash Z teorico
  const scost = n(f.contFis) - cashZ;

  const campo = (label,k) => (
    <div style={{marginBottom:12}} key={k}>
      <div style={{fontSize:10,color:C.muted,textTransform:"uppercase",letterSpacing:1,marginBottom:4}}>{label}</div>
      <input type="number" value={f[k]} onChange={e=>setF(p=>({...p,[k]:e.target.value}))} style={{width:"100%",fontFamily:"'DM Mono',monospace"}}/>
    </div>
  );
  const send=async()=>{
    setStatus("loading");setErrMsg("");
    try{
      const tok=await larkToken();
      if(!tok)throw new Error("Token non valido");
      const res=await larkSend(tok,buildClosureCard({cash:n(f.cash),pos:n(f.pos),stripe:n(f.stripe)-n(f.commStr),totDay,totZ,contanti:n(f.contFis),note:f.note}));
      if(res.code&&res.code!==0)throw new Error(res.msg||"Errore Lark");
      setStatus("success");
    }catch(e){setStatus("error");setErrMsg(e.message);}
  };
  return(
    <div className="fade" style={{padding:20,maxWidth:720,margin:"0 auto"}}>
      <STitle icon="📊" label="Chiusura Cassa"/>
      <div style={{fontSize:12,color:C.muted,marginBottom:20}}>{todayStr()}</div>
      <Card style={{marginBottom:12}}>
        <div style={{fontSize:11,color:C.gold,textTransform:"uppercase",letterSpacing:1,marginBottom:12,fontWeight:600}}>Incassi</div>
        {campo("Vendite fiscali (scontrini)","cash")}{campo("POS","pos")}{campo("Ticket","ticket")}
        {campo("Fatture clienti Cash","fatCash")}{campo("Fatture clienti POS","fatPos")}
        <div style={{height:1,background:C.border,margin:"10px 0"}}/>
        <div style={{fontSize:11,color:C.purple,textTransform:"uppercase",letterSpacing:1,marginBottom:12,fontWeight:600}}>Stripe</div>
        {campo("Stripe incassi","stripe")}{campo("Commissioni (−)","commStr")}
      </Card>
      <Card style={{marginBottom:12}}>
        <div style={{fontSize:11,color:C.gold,textTransform:"uppercase",letterSpacing:1,marginBottom:12,fontWeight:600}}>Conteggio Cassa</div>
        {campo("Scontrini lasciati in cassa","scontrZ")}
        {campo("Contanti fisici (contati a mano)","contFis")}
        <div style={{display:"flex",justifyContent:"space-between",padding:"7px 10px",background:C.surface2,borderRadius:8,marginTop:4}}>
          <span style={{fontSize:12,color:C.muted}}>Cash Z (auto) = Fondo conteggio − Fondo fisso 150€ − Fatt. POS</span>
          <span style={{fontFamily:"'DM Mono',monospace",fontSize:14,fontWeight:600,color:C.purple}}>{fmt(cashZ)}</span>
        </div>
      </Card>

      {/* FONDO CASSA PER TAGLIO */}
      <Card style={{marginBottom:12}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
          <div style={{fontSize:11,color:C.gold,textTransform:"uppercase",letterSpacing:1,fontWeight:600}}>Fondo Cassa per Taglio</div>
          <div style={{fontFamily:"'DM Mono',monospace",fontSize:15,fontWeight:700,color:C.blue}}>{fmt(fondoTot)}</div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
          {TAGLI.map(({k,l,v})=>(
            <div key={k} style={{background:C.surface2,borderRadius:8,padding:"8px 10px"}}>
              <div style={{fontSize:11,color:C.muted,fontWeight:600,marginBottom:6}}>{l}</div>
              <div style={{display:"flex",alignItems:"center",gap:4}}>
                <button onClick={()=>setFondo(p=>({...p,[k]:Math.max(0,(p[k]||0)-1)}))} style={{width:26,height:26,borderRadius:6,border:`1px solid ${C.border}`,background:C.surface,fontSize:14,cursor:"pointer",color:C.muted}}>−</button>
                <input type="number" value={fondo[k]||0} onChange={e=>setFondo(p=>({...p,[k]:parseInt(e.target.value)||0}))} style={{width:"100%",textAlign:"center",fontFamily:"'DM Mono',monospace",fontSize:13,padding:"4px 6px"}}/>
                <button onClick={()=>setFondo(p=>({...p,[k]:(p[k]||0)+1}))} style={{width:26,height:26,borderRadius:6,border:`1px solid ${C.border}`,background:C.surface,fontSize:14,cursor:"pointer",color:C.gold}}>+</button>
              </div>
              <div style={{fontSize:10,color:C.muted,fontFamily:"'DM Mono',monospace",textAlign:"right",marginTop:4}}>{fmt((fondo[k]||0)*v)}</div>
            </div>
          ))}
        </div>
      </Card>

      <Card style={{marginBottom:12}}>
        <div style={{fontSize:10,color:C.muted,marginBottom:6}}>Note</div>
        <textarea value={f.note} onChange={e=>setF(p=>({...p,note:e.target.value}))} style={{width:"100%",minHeight:55,resize:"vertical"}}/>
      </Card>
      <Card style={{marginBottom:14,border:`1px solid ${C.gold}33`}}>
        {[
          ["Tot. incassi lordi",totIncassi,C.green],
          ["Tot. da versare banca",daVersare,C.gold],
          ["Cash Z (calcolato)",cashZ,C.purple],
          ["Tot Z",totZ,C.blue],
          ["TOT DAY",totDay,C.gold],
          ["Fondo cassa conteggio",fondoTot,C.blue],
        ].map(([l,v,c])=>(
          <div key={l} style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:`1px solid ${C.border}`}}>
            <span style={{fontSize:13,color:C.muted}}>{l}</span>
            <span style={{fontFamily:"'DM Mono',monospace",fontSize:14,fontWeight:600,color:c}}>{fmt(v)}</span>
          </div>
        ))}
        <div style={{display:"flex",justifyContent:"space-between",padding:"9px 0 0"}}>
          <span style={{fontSize:13,color:C.muted}}>Scostamento (Contanti − Cash Z)</span>
          <span style={{fontFamily:"'DM Mono',monospace",fontSize:14,fontWeight:600,color:Math.abs(scost)<0.5?C.green:scost>0?C.orange:C.red}}>{fmt(scost)} {Math.abs(scost)<0.5?"✓":"⚠"}</span>
        </div>
      </Card>
      <div style={{display:"flex",gap:8}}>
        <button onClick={send} disabled={status==="loading"} style={{flex:1,background:status==="loading"?C.border:C.lark,color:"#fff",border:"none",borderRadius:10,padding:14,fontSize:14,fontWeight:600,display:"flex",alignItems:"center",justifyContent:"center",gap:8,cursor:"pointer"}}>
          {status==="loading"?<><span className="pulse">⟳</span> Invio…</>:"📤 Invia su Lark"}
        </button>
        <button onClick={async()=>{
          const ok = await printChiusura({cash:n(f.cash), pos:n(f.pos), stripe:stripeNet, totDay, coperti:0});
          if(!ok) alert("⚠️ Stampante non raggiungibile.");
        }} style={{flex:1,background:C.gold,color:"#fff",border:"none",borderRadius:10,padding:14,fontSize:14,fontWeight:600,display:"flex",alignItems:"center",justifyContent:"center",gap:8,cursor:"pointer"}}>
          🖨 Stampa scontrino
        </button>
      </div>
      {status==="success"&&<div style={{marginTop:10,background:C.green+"22",borderRadius:8,padding:10,fontSize:13,color:C.green,textAlign:"center"}}>✓ Inviato su Lark!</div>}
      {status==="error"&&<div style={{marginTop:10,background:C.red+"22",borderRadius:8,padding:10,fontSize:12,color:C.red}}>{errMsg}</div>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// FATTURE
// ═══════════════════════════════════════════════════════════════════════════
function Fatture({invoices,setInvoices}) {
  const [showForm,setShowForm]=useState(false);
  const [scanning,setScanning]=useState(false);
  const [scanMsg,setScanMsg]=useState("");
  const fileRef=useRef();
  const [form,setForm]=useState({fornitore:"",importo:"",data:"",scadenza:"",categoria:"",stato:"da pagare",note:""});
  const handleScan=async(e)=>{
    const file=e.target.files[0];if(!file)return;
    setScanning(true);setScanMsg("");
    try{
      const b64=await new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result.split(",")[1]);r.onerror=rej;r.readAsDataURL(file);});
      const raw=await callClaude(`Analizza questa fattura italiana. Rispondi SOLO con JSON valido:\n{"fornitore":"","importo":0,"data":"YYYY-MM-DD","scadenza":"YYYY-MM-DD","categoria":"","note":""}\nCategorie: Verdure/Frutta, Carne, Pesce, Latticini, Bevande, Condimenti, Altro.`);
      const parsed=JSON.parse(raw.replace(/```json|```/g,"").trim());
      setForm(f=>({...f,...parsed,importo:String(parsed.importo),stato:"da pagare"}));
      setScanMsg("✓ Fattura letta");setShowForm(true);
    }catch{setScanMsg("⚠ Lettura non riuscita");setShowForm(true);}
    setScanning(false);e.target.value="";
  };
  const save=()=>{
    if(!form.fornitore||!form.importo)return;
    setInvoices(p=>[{...form,id:uid(),importo:parseFloat(form.importo)},...p]);
    setForm({fornitore:"",importo:"",data:"",scadenza:"",categoria:"",stato:"da pagare",note:""});
    setShowForm(false);setScanMsg("");
  };
  return(
    <div className="fade" style={{padding:20,maxWidth:720,margin:"0 auto"}}>
      <STitle icon="🧾" label="Fatture Fornitori"/>
      <div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"}}>
        <input type="file" accept="image/*" ref={fileRef} style={{display:"none"}} onChange={handleScan}/>
        <Btn small variant="ghost" onClick={()=>fileRef.current.click()}>{scanning?<span className="pulse">Scansione…</span>:"📷 Scansiona"}</Btn>
        <Btn small onClick={()=>setShowForm(!showForm)}>+ Aggiungi</Btn>
      </div>
      {scanMsg&&<div style={{background:scanMsg.startsWith("✓")?C.green+"22":C.red+"22",borderRadius:8,padding:10,marginBottom:12,fontSize:12,color:scanMsg.startsWith("✓")?C.green:C.red}}>{scanMsg}</div>}
      {showForm&&(
        <Card style={{marginBottom:14,border:`1px solid ${C.gold}33`}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
            {[["Fornitore","fornitore","text"],["Importo (€)","importo","number"],["Data","data","date"],["Scadenza","scadenza","date"],["Categoria","categoria","text"]].map(([l,k,t])=>(
              <div key={k}><div style={{fontSize:10,color:C.muted,marginBottom:4}}>{l}</div><input type={t} value={form[k]} onChange={e=>setForm(f=>({...f,[k]:e.target.value}))} style={{width:"100%"}}/></div>
            ))}
            <div><div style={{fontSize:10,color:C.muted,marginBottom:4}}>Stato</div>
              <select value={form.stato} onChange={e=>setForm(f=>({...f,stato:e.target.value}))} style={{width:"100%"}}>
                <option value="da pagare">Da pagare</option><option value="pagata">Pagata</option>
              </select></div>
          </div>
          <div style={{display:"flex",gap:8}}><Btn onClick={save}>Salva</Btn><Btn variant="ghost" onClick={()=>setShowForm(false)}>Annulla</Btn></div>
        </Card>
      )}
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {invoices.map(inv=>(
          <Card key={inv.id} style={{display:"flex",alignItems:"center",gap:10,padding:14,opacity:inv.stato==="pagata"?.6:1,borderLeft:`3px solid ${inv.stato==="pagata"?C.green:C.red}`}}>
            <div style={{flex:1}}>
              <div style={{fontWeight:500,fontSize:13}}>{inv.fornitore}</div>
              <div style={{fontSize:11,color:C.muted,marginTop:2}}>{inv.data} → {inv.scadenza} · {inv.categoria}</div>
            </div>
            <Tag label={fmt(inv.importo)} color={inv.stato==="pagata"?C.green:C.red}/>
            <Btn small variant={inv.stato==="pagata"?"ghost":"green"} onClick={()=>setInvoices(p=>p.map(i=>i.id===inv.id?{...i,stato:i.stato==="pagata"?"da pagare":"pagata"}:i))}>
              {inv.stato==="pagata"?"↩":"✓"}
            </Btn>
            <Btn small variant="danger" onClick={()=>setInvoices(p=>p.filter(i=>i.id!==inv.id))}>✕</Btn>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// VENDITE
// ═══════════════════════════════════════════════════════════════════════════
function Vendite({sales,setSales}) {
  const [showForm,setShowForm]=useState(false);
  const [form,setForm]=useState({data:new Date().toISOString().split("T")[0],servizio:"Pranzo",importo:"",coperti:"",note:""});
  const save=()=>{
    if(!form.importo)return;
    const newVendita = {...form,id:uid(),importo:parseFloat(form.importo),coperti:parseInt(form.coperti)||0};
    setSales(p=>[newVendita,...p]);
    setTimeout(()=>dbSave("Vendite",{"Data":form.data,"Servizio":form.servizio,"Importo":parseFloat(form.importo)||0,"Coperti":parseInt(form.coperti)||0,"Note":form.note}).catch(()=>{}),0);
    setForm({data:new Date().toISOString().split("T")[0],servizio:"Pranzo",importo:"",coperti:"",note:""});
    setShowForm(false);
  };
  const totMese=sales.reduce((s,v)=>s+v.importo,0);
  const mediaGiorno=sales.length?totMese/sales.length:0;
  return(
    <div className="fade" style={{padding:20,maxWidth:720,margin:"0 auto"}}>
      <STitle icon="💰" label="Registro Vendite"/>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:16}}>
        {[["Totale",fmt(totMese),C.green],["Scontrino medio",fmt(mediaGiorno),C.gold],["Giorni",String(sales.length),C.blue]].map(([l,v,c])=>(
          <Card key={l} style={{padding:12,textAlign:"center"}}>
            <div style={{fontSize:10,color:C.muted,textTransform:"uppercase",letterSpacing:1,marginBottom:4}}>{l}</div>
            <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:18,fontWeight:600,color:c}}>{v}</div>
          </Card>
        ))}
      </div>
      <div style={{marginBottom:14}}><Btn small onClick={()=>setShowForm(!showForm)}>+ Registra vendita</Btn></div>
      {showForm&&(
        <Card style={{marginBottom:14,border:`1px solid ${C.gold}33`}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
            <div><div style={{fontSize:10,color:C.muted,marginBottom:4}}>Data</div><input type="date" value={form.data} onChange={e=>setForm(f=>({...f,data:e.target.value}))} style={{width:"100%"}}/></div>
            <div><div style={{fontSize:10,color:C.muted,marginBottom:4}}>Servizio</div>
              <select value={form.servizio} onChange={e=>setForm(f=>({...f,servizio:e.target.value}))} style={{width:"100%"}}>
                {["Pranzo","Cena","Brunch","Catering","Asporto"].map(s=><option key={s}>{s}</option>)}
              </select></div>
            <div><div style={{fontSize:10,color:C.muted,marginBottom:4}}>Incasso (€)</div><input type="number" value={form.importo} onChange={e=>setForm(f=>({...f,importo:e.target.value}))} style={{width:"100%"}}/></div>
            <div><div style={{fontSize:10,color:C.muted,marginBottom:4}}>Coperti</div><input type="number" value={form.coperti} onChange={e=>setForm(f=>({...f,coperti:e.target.value}))} style={{width:"100%"}}/></div>
          </div>
          <div style={{display:"flex",gap:8}}><Btn onClick={save}>Salva</Btn><Btn variant="ghost" onClick={()=>setShowForm(false)}>Annulla</Btn></div>
        </Card>
      )}
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {sales.map(v=>(
          <Card key={v.id} style={{display:"flex",alignItems:"center",gap:10,padding:14,borderLeft:`3px solid ${C.green}`}}>
            <div style={{flex:1}}>
              <div style={{fontWeight:500,fontSize:13}}>{v.servizio}</div>
              <div style={{fontSize:11,color:C.muted,marginTop:2}}>{v.data}{v.coperti?` · ${v.coperti} coperti · media ${fmt(v.importo/v.coperti)}`:""}</div>
            </div>
            <Tag label={fmt(v.importo)} color={C.green}/>
            <Btn small variant="danger" onClick={()=>setSales(p=>p.filter(s=>s.id!==v.id))}>✕</Btn>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// OPZIONI MODAL — Selezione configurazioni piatto (proteine, extra, etc)
// ═══════════════════════════════════════════════════════════════════════════
function OpzioniModal({piatto, qty = 1, onConfirm, onCancel}) {
  const [scelte, setScelte] = useState({});

  // Valida scelte obbligatorie
  const isValid = (() => {
    if (!piatto.opzioni) return true;
    return piatto.opzioni.every(opt => {
      if (!opt.obbligatorio) return true;
      const v = scelte[opt.nome];
      if (opt.multiplo) return Array.isArray(v) && v.length > 0;
      return v !== undefined && v !== null;
    });
  })();

  // Calcola totale con extra
  const calcolaTotale = () => {
    let extra = 0;
    if (!piatto.opzioni) return piatto.prezzo;
    piatto.opzioni.forEach(opt => {
      const sc = scelte[opt.nome];
      if (!sc) return;
      if (opt.multiplo) {
        if (Array.isArray(sc)) sc.forEach(item => { extra += item.extra || 0; });
      } else {
        extra += sc.extra || 0;
      }
    });
    return piatto.prezzo + extra;
  };

  const handleToggleExtra = (opzioneName, item) => {
    setScelte(prev => {
      const arr = [...(prev[opzioneName] || [])];
      const idx = arr.findIndex(x => x.nome === item.nome);
      if (idx >= 0) arr.splice(idx, 1);
      else arr.push(item);
      return {...prev, [opzioneName]: arr};
    });
  };

  const handleRadio = (opzioneName, item) => {
    setScelte(prev => ({...prev, [opzioneName]: item}));
  };

  return (
    <div style={{
      position:"fixed", top:0, left:0, right:0, bottom:0,
      background:"rgba(0,0,0,0.6)",
      display:"flex", alignItems:"center", justifyContent:"center",
      zIndex:9999, padding:16,
    }}>
      <div style={{
        background:C.surface, border:`1px solid ${C.border}`, borderRadius:12,
        maxWidth:460, width:"100%", maxHeight:"85vh", overflow:"auto",
        padding:20,
      }}>
        {/* Header */}
        <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8}}>
          <div style={{fontSize:17, fontWeight:700, color:C.text}}>{piatto.nome}</div>
          <button
            onClick={onCancel}
            style={{background:"none", border:"none", fontSize:22, cursor:"pointer", color:C.muted}}
          >✕</button>
        </div>
        <div style={{fontSize:12, color:C.muted, marginBottom:18}}>
          Prezzo base: {fmt(piatto.prezzo)}
        </div>

        {/* Lista opzioni */}
        {piatto.opzioni && piatto.opzioni.map((opt, idx) => (
          <div key={idx} style={{marginBottom:18, paddingBottom:14, borderBottom:`1px solid ${C.border}`}}>
            <div style={{fontSize:13, fontWeight:600, marginBottom:4, color:C.text}}>
              {opt.nome}
              {opt.obbligatorio && <span style={{color:C.orange}}> *</span>}
            </div>
            <div style={{fontSize:11, color:C.muted, marginBottom:10}}>
              {opt.multiplo ? "Scegli quante vuoi" : (opt.obbligatorio ? "Scegli una" : "Scegli una (opzionale)")}
            </div>

            {opt.multiplo ? (
              <div style={{display:"flex", flexDirection:"column", gap:8}}>
                {opt.items.map((item, i) => {
                  const checked = (scelte[opt.nome] || []).some(x => x.nome === item.nome);
                  return (
                    <label key={i} style={{
                      display:"flex", alignItems:"center", gap:10, cursor:"pointer",
                      padding:"8px 10px", borderRadius:8,
                      background: checked ? C.gold+"22" : "transparent",
                      border: `1px solid ${checked ? C.gold+"66" : C.border}`,
                    }}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => handleToggleExtra(opt.nome, item)}
                        style={{cursor:"pointer", width:18, height:18}}
                      />
                      <span style={{flex:1, fontSize:13, color:C.text}}>{item.nome}</span>
                      <span style={{color: item.extra > 0 ? C.gold : C.muted, fontSize:12, fontWeight:600}}>
                        {item.extra > 0 ? `+${fmt(item.extra)}` : "incluso"}
                      </span>
                    </label>
                  );
                })}
              </div>
            ) : (
              <div style={{display:"flex", flexDirection:"column", gap:8}}>
                {opt.items.map((item, i) => {
                  const sel = (scelte[opt.nome]?.nome) === item.nome;
                  return (
                    <label key={i} style={{
                      display:"flex", alignItems:"center", gap:10, cursor:"pointer",
                      padding:"8px 10px", borderRadius:8,
                      background: sel ? C.gold+"22" : "transparent",
                      border: `1px solid ${sel ? C.gold+"66" : C.border}`,
                    }}>
                      <input
                        type="radio"
                        name={`opt_${piatto.id}_${idx}`}
                        checked={sel}
                        onChange={() => handleRadio(opt.nome, item)}
                        style={{cursor:"pointer", width:18, height:18}}
                      />
                      <span style={{flex:1, fontSize:13, color:C.text}}>{item.nome}</span>
                      <span style={{color: item.extra > 0 ? C.gold : C.muted, fontSize:12, fontWeight:600}}>
                        {item.extra > 0 ? `+${fmt(item.extra)}` : "incluso"}
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        ))}

        {/* Totale */}
        <div style={{
          background:C.surface2, border:`1px solid ${C.border}`, borderRadius:8,
          padding:12, marginBottom:14, textAlign:"right",
        }}>
          <div style={{fontSize:12, color:C.muted, marginBottom:4}}>Totale (× {qty}):</div>
          <div style={{fontSize:20, fontWeight:700, color:C.gold}}>
            {fmt(calcolaTotale() * qty)}
          </div>
        </div>

        {!isValid && (
          <div style={{
            background:C.orange+"22", border:`1px solid ${C.orange}55`, borderRadius:8,
            padding:"8px 10px", fontSize:12, color:C.orange, marginBottom:10,
          }}>
            ⚠️ Compila le opzioni obbligatorie (segnate con *)
          </div>
        )}

        {/* Bottoni */}
        <div style={{display:"flex", gap:8}}>
          <Btn
            onClick={() => onConfirm(scelte, calcolaTotale())}
            disabled={!isValid}
            style={{flex:1, opacity: isValid ? 1 : 0.5}}
          >
            ✅ Aggiungi (qty: {qty})
          </Btn>
          <Btn variant="ghost" onClick={onCancel} style={{flex:1}}>Annulla</Btn>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ORDINI TAVOLI
// ═══════════════════════════════════════════════════════════════════════════
function OrdiniTavoli({ordini, setOrdini, user, menuCatalog, magazzino, setMagazzino}) {
  const [printerIp, setPrinterIp]   = useState(PRINTER_IP);
  const [showConfig, setShowConfig] = useState(false);
  const [filter, setFilter]         = useState("tutti");
  const [printing, setPrinting]     = useState(null);
  const [showNuovo, setShowNuovo]   = useState(false);

  // Edit mode & posizioni custom
  const [editMode, setEditMode] = useState(false);
  const [posCustom, setPosCustom] = useState(() => {
    try { return JSON.parse(localStorage.getItem("tierra_pos") || "{}"); }
    catch(e) { return {}; }
  });
  const [dragging, setDragging] = useState(null);
  const [dragOffset, setDragOffset] = useState({x:0,y:0});

  const getPos = (id, defCol, defRow) => {
    if(posCustom[id]) return posCustom[id];
    return {col:defCol, row:defRow};
  };
  const savePositions = (newPos) => {
    setPosCustom(newPos);
    try { localStorage.setItem("tierra_pos", JSON.stringify(newPos)); } catch(e) {}
  };
  const resetLayout = () => {
    if(!confirm("Sicuro di ripristinare il layout originale?")) return;
    savePositions({});
  };
  const [formNuovo, setFormNuovo]   = useState({tavolo:"", cliente:"", pax:1, pagamento:"cassa", items:[]});
  const [zonaSelector, setZonaSelector] = useState("INT");
  const [selectedPiatto, setSelectedPiatto] = useState("");
  const [qtyPiatto, setQtyPiatto]   = useState("1");
  const [showOpzioniModal, setShowOpzioniModal] = useState(null);

  // Accorpamento tavoli tap+tap
  const [tavSelezionato, setTavSelezionato] = useState(null);
  const [accorpati, setAccorpati]           = useState({});

  const handleTapMappa = (code) => {
    if(tavSelezionato === null) {
      setTavSelezionato(code);
    } else if(tavSelezionato === code) {
      setTavSelezionato(null);
    } else {
      const key = [tavSelezionato, code].sort().join("+");
      setAccorpati(prev => {
        if(prev[key]) { const nxt={...prev}; delete nxt[key]; return nxt; }
        return {...prev, [key]:true};
      });
      setTavSelezionato(null);
    }
  };

  // Apre form ordine col tavolo preselezionato
  const apriFormOrdine = (code) => {
    if(code) {
      setFormNuovo(f=>({...f, tavolo:code}));
      setZonaSelector(code.startsWith("INT")?"INT":"EST");
    }
    setShowNuovo(true);
    setTavSelezionato(null);
    setTimeout(()=>{ window.scrollTo({top:0,behavior:"smooth"}); },50);
  };
  const isAccorpato = (code) => Object.keys(accorpati).some(k=>k.includes(code));

  const totDaFare = ordini.filter(o=>o.stato==="nuovo").length;
  const statoColor = s => s==="nuovo"?C.orange:s==="in_prep"?C.blue:s==="pronto"?C.green:C.muted;
  const statoLabel = s => s==="nuovo"?"🔔 Nuovo":s==="in_prep"?"👨‍🍳 In prep":s==="pronto"?"✅ Pronto":"📦 Consegnato";
  const filtered = filter==="tutti" ? ordini : ordini.filter(o=>o.stato===filter);

  const aggiornaStato = async (id, nuovoStato) => {
    setOrdini(prev=>prev.map(o=>o.id===id?{...o,stato:nuovoStato}:o));
    if(nuovoStato==="pronto") {
      const ord = ordini.find(o=>o.id===id);
      if(ord) {
        // 🔻 DECREMENTO MAGAZZINO automatico
        if (setMagazzino && magazzino) {
          let newMag = magazzino;
          ord.items.forEach(item => {
            newMag = decrementaMagazzino(item, newMag);
          });
          setMagazzino(newMag);
        }

        // Notifica Lark
        try {
          const tok = await larkToken();
          const righe = ord.items.map(i=>"• "+i.qty+"x "+i.nome).join("\n");
          await larkSend(tok, {
            schema:"2.0",
            header:{template:"green",title:{tag:"plain_text",content:"✅ PRONTO — Tavolo "+ord.tavolo}},
            body:{elements:[
              {tag:"div",text:{tag:"lark_md",content:"**Tavolo "+ord.tavolo+"** — "+ord.cliente+"\n"+righe}},
              {tag:"note",elements:[{tag:"lark_md",content:"Tierra OS · "+now()}]},
            ]},
          });
        } catch(e){}
      }
    }
  };

  const stampaOrdine = async (ordine) => {
    setPrinting(ordine.id);
    await printOrder(ordine);
    setTimeout(()=>setPrinting(null), 2000);
  };

  const allPiatti = Object.entries(menuCatalog).flatMap(([cat,piatti])=>
    piatti.filter(p=>p.disponibile).map(p=>({...p,cat}))
  );

  const aggiungiPiatto = () => {
    const piatto = allPiatti.find(p=>p.id===selectedPiatto);
    if(!piatto) return;
    const qty = parseInt(qtyPiatto) || 1;

    if (piatto.opzioni && piatto.opzioni.length > 0) {
      // Apri modal scelta opzioni
      setShowOpzioniModal({
        piatto,
        qty,
        callback: (scelte, prezzoFinale) => {
          setFormNuovo(f => ({
            ...f,
            items: [...f.items, {
              ...piatto,
              qty,
              opzioniScelte: scelte,
              prezzoFinale,
            }]
          }));
          setShowOpzioniModal(null);
          setSelectedPiatto("");
          setQtyPiatto("1");
        }
      });
    } else {
      // No opzioni → aggiungi diretto
      setFormNuovo(f=>({...f, items:[...f.items,{...piatto,qty,prezzoFinale:piatto.prezzo}]}));
      setSelectedPiatto(""); setQtyPiatto("1");
    }
  };

  const inviaOrdine = async () => {
    if(!formNuovo.tavolo||formNuovo.items.length===0) return;
    const totale = formNuovo.items.reduce((s,i)=>s+(i.prezzoFinale||i.prezzo)*i.qty,0);
    const ordine = {
      ...formNuovo, id:uid(), stato:"nuovo",
      totale, ora:now(),
      data:new Date().toISOString().split("T")[0],
      operatore:user.nome,
    };
    setOrdini(prev=>[ordine,...prev]);
    setShowNuovo(false);
    setFormNuovo({tavolo:"",cliente:"",pax:1,pagamento:"cassa",items:[]});

    await stampaOrdine(ordine);

    tierraOrders.create({
      table_code: formNuovo.tavolo,
      waiter: user.nome,
      customer_name: formNuovo.cliente,
      items: formNuovo.items.map(i=>({
        item_id: i.id, name: i.nome,
        quantity: i.qty, unit_price: (i.prezzoFinale||i.prezzo),
        customizations: i.opzioniScelte ? Object.entries(i.opzioniScelte).flatMap(([k,v])=>{
          const arr = Array.isArray(v) ? v : [v];
          return arr.filter(x=>x && x.nome).map(x=>({group:k, name:x.nome, extra:x.extra||0}));
        }) : [],
      })),
      notes: "PAX: "+formNuovo.pax+" | Pagamento: "+(formNuovo.pagamento==="stripe"?"Online Stripe":"Al conto"),
    }).catch(()=>{});

    // Notifica Lark — ✅ FIX: concatenazione stringa, niente template literal multiriga
    try {
      const tok = await larkToken();
      const righeOrdine = ordine.items.map(i=>{
        const prz = (i.prezzoFinale||i.prezzo)*i.qty;
        let line = "• "+i.qty+"x "+i.nome+" — €"+prz.toFixed(2);
        if (i.opzioniScelte) {
          Object.values(i.opzioniScelte).forEach(sc => {
            const arr = Array.isArray(sc) ? sc : [sc];
            arr.forEach(s => { if(s && s.nome) line += "\n  · "+s.nome+(s.extra>0?" +€"+s.extra.toFixed(2):""); });
          });
        }
        return line;
      }).join("\n");
      await larkSend(tok, {
        schema:"2.0",
        header:{template:"orange",title:{tag:"plain_text",content:"🔔 NUOVO ORDINE — Tavolo "+ordine.tavolo}},
        body:{elements:[
          {tag:"div",text:{tag:"lark_md",content:"**Tavolo "+ordine.tavolo+"** — "+ordine.cliente+" ("+ordine.pax+" PAX)\n"+righeOrdine+"\n\n**Totale: €"+totale.toFixed(2)+"**\nPagamento: "+(ordine.pagamento==="stripe"?"Online":"Al conto")}},
          {tag:"note",elements:[{tag:"lark_md",content:"Tierra OS · "+now()}]},
        ]},
      });
    } catch(e){}
  };

  return (
    <div className="fade" style={{padding:20,maxWidth:720,margin:"0 auto"}}>
      {/* MODAL OPZIONI PIATTI */}
      {showOpzioniModal && (
        <OpzioniModal
          piatto={showOpzioniModal.piatto}
          qty={showOpzioniModal.qty}
          onConfirm={showOpzioniModal.callback}
          onCancel={() => setShowOpzioniModal(null)}
        />
      )}

      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16}}>
        <div>
          <STitle icon="🍽️" label="Ordini Tavoli"/>
          {totDaFare>0&&<div style={{background:C.orange+"22",border:`1px solid ${C.orange}33`,borderRadius:8,padding:"6px 12px",fontSize:12,color:C.orange,marginTop:-8,marginBottom:8}}>
            🔔 {totDaFare} ordine/i nuovi da preparare
          </div>}
        </div>
        <div style={{display:"flex",gap:8}}>
          <Btn small variant="ghost" onClick={()=>setShowConfig(!showConfig)}>🖨 Stampante</Btn>
          <Btn small onClick={()=>apriFormOrdine(null)}>+ Nuovo ordine</Btn>
        </div>
      </div>

      {/* Controlli Edit Layout */}
      <div style={{display:"flex",justifyContent:"flex-end",gap:8,marginBottom:10}}>
        {editMode && (
          <Btn small variant="ghost" onClick={resetLayout}>🔄 Reset layout</Btn>
        )}
        <Btn small variant={editMode?"primary":"ghost"} onClick={()=>{setEditMode(!editMode);setTavSelezionato(null);}}>
          {editMode?"💾 Salva layout":"✏️ Modifica layout"}
        </Btn>
      </div>

      {/* FORM NUOVO ORDINE — VISIBILE SUBITO IN ALTO */}
      {showNuovo&&(
        <Card style={{marginBottom:14,border:`2px solid ${C.gold}`}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
            <div style={{fontSize:11,color:C.gold,textTransform:"uppercase",letterSpacing:1,fontWeight:700}}>📝 Nuovo Ordine Manuale</div>
            <button onClick={()=>setShowNuovo(false)} style={{background:"none",border:"none",fontSize:18,color:C.muted,cursor:"pointer"}}>✕</button>
          </div>

          {/* Selettore Tavolo */}
          <div style={{marginBottom:12}}>
            <div style={{fontSize:10,color:C.muted,marginBottom:6,textTransform:"uppercase",letterSpacing:1}}>Tavolo</div>
            <div style={{display:"flex",gap:0,marginBottom:8,borderRadius:8,overflow:"hidden",border:`1px solid ${C.border}`,width:"fit-content"}}>
              {[["INT","🏠 Interno"],["EST","🌿 Esterno"]].map(([zona,lbl])=>(
                <button key={zona} onClick={()=>{setZonaSelector(zona);setFormNuovo(f=>({...f,tavolo:""}));}} style={{
                  padding:"7px 18px",fontSize:12,fontWeight:600,cursor:"pointer",transition:"all .15s",border:"none",
                  background:zonaSelector===zona?C.gold:"transparent",
                  color:zonaSelector===zona?"#fff":C.muted,
                }}>{lbl}</button>
              ))}
            </div>
            {/* Accorpati di questa zona */}
            {Object.keys(accorpati).filter(k=>k.startsWith(zonaSelector)).length>0 && (
              <div style={{marginBottom:8,display:"flex",flexWrap:"wrap",gap:6}}>
                {Object.keys(accorpati).filter(k=>k.startsWith(zonaSelector)).map(k=>{
                  const active = formNuovo.tavolo===k;
                  const tavoli = k.split("+");
                  return (
                    <button key={k} onClick={()=>setFormNuovo(f=>({...f,tavolo:k,pax:tavoli.length*3}))} style={{
                      padding:"8px 14px",borderRadius:8,fontSize:13,fontWeight:700,cursor:"pointer",
                      background:active?"#daa520":"#daa52022",
                      color:active?"#fff":"#8b6914",
                      border:"2px solid "+(active?"#8b6914":"#daa52055"),
                      fontFamily:"'DM Mono',monospace",
                    }}>🔗 {k}</button>
                  );
                })}
              </div>
            )}
            {/* Numeri singoli — escludendo quelli accorpati */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(8,1fr)",gap:6}}>
              {[1,2,3,4,5,6,7,8].map(num=>{
                const code = zonaSelector+num;
                const isInAccorpo = Object.keys(accorpati).some(k=>k.split("+").includes(code));
                if(isInAccorpo) return null; // Skip se è già parte di un accorpato
                const active = formNuovo.tavolo===code;
                return (
                  <button key={num} onClick={()=>setFormNuovo(f=>({...f,tavolo:code,pax:1}))} style={{
                    padding:"10px 4px",borderRadius:8,fontSize:14,fontWeight:700,cursor:"pointer",transition:"all .15s",
                    background:active?C.gold:C.surface2,
                    color:active?"#fff":C.text,
                    border:"2px solid "+(active?C.gold:C.border),
                    boxShadow:active?"0 0 0 3px "+C.gold+"33":"none",
                  }}>{num}</button>
                );
              })}
            </div>
            {formNuovo.tavolo&&(
              formNuovo.tavolo.includes("+") ? (
                <div style={{marginTop:8,padding:8,background:"#daa52022",border:"1px solid #daa52055",borderRadius:8,fontSize:12,color:"#8b6914",fontWeight:600,textAlign:"center"}}>
                  🔗 Ordine su tavoli accorpati: <span style={{fontFamily:"'DM Mono',monospace"}}>{formNuovo.tavolo}</span>
                </div>
              ) : (
                <div style={{marginTop:6,fontSize:11,color:C.gold,fontWeight:600}}>
                  ✓ Tavolo selezionato: <span style={{fontFamily:"'DM Mono',monospace"}}>{formNuovo.tavolo}</span>
                </div>
              )
            )}
          </div>

          {/* Nome cliente + PAX */}
          <div style={{display:"grid",gridTemplateColumns:"1fr auto",gap:10,marginBottom:10}}>
            <div>
              <div style={{fontSize:10,color:C.muted,marginBottom:4}}>Nome Cliente</div>
              <input value={formNuovo.cliente} onChange={e=>setFormNuovo(f=>({...f,cliente:e.target.value}))} placeholder="Es. Marco" style={{width:"100%"}}/>
            </div>
            <div>
              <div style={{fontSize:10,color:C.muted,marginBottom:4}}>PAX</div>
              <div style={{display:"flex",alignItems:"center",gap:4}}>
                <button onClick={()=>setFormNuovo(f=>({...f,pax:Math.max(1,(f.pax||1)-1)}))} style={{width:28,height:28,borderRadius:6,border:`1px solid ${C.border}`,background:C.surface2,fontSize:16,cursor:"pointer",color:C.muted}}>−</button>
                <span style={{fontFamily:"'DM Mono',monospace",fontSize:16,fontWeight:700,color:C.text,minWidth:24,textAlign:"center"}}>{formNuovo.pax||1}</span>
                <button onClick={()=>setFormNuovo(f=>({...f,pax:(f.pax||1)+1}))} style={{width:28,height:28,borderRadius:6,border:`1px solid ${C.border}`,background:C.surface2,fontSize:16,cursor:"pointer",color:C.gold}}>+</button>
              </div>
            </div>
          </div>

          {/* Pagamento */}
          <div style={{marginBottom:10}}>
            <div style={{fontSize:10,color:C.muted,marginBottom:4}}>Pagamento</div>
            <div style={{display:"flex",gap:8}}>
              {[["cassa","💵 Al conto"],["stripe","💳 Online Stripe"]].map(([val,lbl])=>(
                <button key={val} onClick={()=>setFormNuovo(f=>({...f,pagamento:val}))} style={{
                  flex:1,padding:"8px",borderRadius:8,fontSize:12,fontWeight:500,cursor:"pointer",
                  background:formNuovo.pagamento===val?C.gold:"transparent",
                  color:formNuovo.pagamento===val?"#fff":C.muted,
                  border:`1px solid ${formNuovo.pagamento===val?C.gold:C.border}`,
                }}>{lbl}</button>
              ))}
            </div>
          </div>

          {/* Aggiungi piatti */}
          <div style={{marginBottom:10}}>
            <div style={{fontSize:10,color:C.muted,marginBottom:4}}>Aggiungi piatti</div>
            <div style={{display:"flex",gap:8}}>
              <select value={selectedPiatto} onChange={e=>setSelectedPiatto(e.target.value)} style={{flex:1}}>
                <option value="">Seleziona piatto…</option>
                {Object.entries(menuCatalog).map(([cat,piatti])=>(
                  <optgroup key={cat} label={cat}>
                    {piatti.filter(p=>p.disponibile).map(p=>(
                      <option key={p.id} value={p.id}>{p.nome} — €{p.prezzo}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
              <input type="number" value={qtyPiatto} onChange={e=>setQtyPiatto(e.target.value)} style={{width:50,textAlign:"center"}} min="1"/>
              <Btn small onClick={aggiungiPiatto}>+</Btn>
            </div>
          </div>

          {formNuovo.items.length>0&&(
            <div style={{background:C.surface2,borderRadius:8,padding:10,marginBottom:10}}>
              {formNuovo.items.map((item,i)=>{
                const prz = (item.prezzoFinale||item.prezzo)*item.qty;
                return (
                  <div key={i} style={{padding:"6px 0",borderBottom:`1px solid ${C.border}`}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                      <span style={{fontSize:13,fontWeight:600}}>{item.qty}x {item.nome}</span>
                      <div style={{display:"flex",gap:8,alignItems:"center"}}>
                        <span style={{fontFamily:"'DM Mono',monospace",fontSize:12,color:C.gold,fontWeight:700}}>€{prz.toFixed(2)}</span>
                        <button onClick={()=>setFormNuovo(f=>({...f,items:f.items.filter((_,j)=>j!==i)}))} style={{background:"none",border:"none",color:C.red,cursor:"pointer",fontSize:14}}>✕</button>
                      </div>
                    </div>
                    {item.opzioniScelte && Object.entries(item.opzioniScelte).map(([opzName, value]) => {
                      if (!value || (Array.isArray(value) && value.length === 0)) return null;
                      const arr = Array.isArray(value) ? value : [value];
                      return arr.filter(x=>x && x.nome).map((v, vi) => (
                        <div key={`${opzName}-${vi}`} style={{fontSize:11,color:C.muted,paddingLeft:12,marginTop:2}}>
                          · {v.nome}{v.extra > 0 ? ` +€${v.extra.toFixed(2)}` : ""}
                        </div>
                      ));
                    })}
                  </div>
                );
              })}
              <div style={{display:"flex",justifyContent:"space-between",padding:"8px 0 0",fontWeight:700}}>
                <span>Totale</span>
                <span style={{fontFamily:"'DM Mono',monospace",color:C.gold}}>€{formNuovo.items.reduce((s,i)=>s+(i.prezzoFinale||i.prezzo)*i.qty,0).toFixed(2)}</span>
              </div>
            </div>
          )}

          <div style={{display:"flex",gap:8}}>
            <Btn onClick={inviaOrdine} disabled={!formNuovo.tavolo||formNuovo.items.length===0}>
              📤 Invia + Stampa
            </Btn>
            <Btn variant="ghost" onClick={()=>setShowNuovo(false)}>Annulla</Btn>
          </div>
        </Card>
      )}

      {/* MAPPA TAVOLI REALE */}
      {[["🏠 Interno","INT",LAYOUT_INT,5],["🌿 Esterno","EST",LAYOUT_EST,4]].map(([label,zona,layout,rows])=>(
        <Card key={zona} style={{marginBottom:12,padding:"12px 14px"}}>
          <div style={{fontSize:10,color:C.muted,textTransform:"uppercase",letterSpacing:1,fontWeight:600,marginBottom:10}}>{label}{editMode?" — ✏️ trascina per spostare":""}</div>
          <div
            style={{position:"relative",height:rows*62+8,minHeight:80, background:editMode?"repeating-linear-gradient(0deg,transparent 0,transparent 61px,"+C.border+" 61px,"+C.border+" 62px),repeating-linear-gradient(90deg,transparent 0,transparent 61px,"+C.border+" 61px,"+C.border+" 62px)":"none"}}
            onMouseMove={editMode&&dragging?(e)=>{
              const rect = e.currentTarget.getBoundingClientRect();
              const x = e.clientX - rect.left - dragOffset.x;
              const y = e.clientY - rect.top - dragOffset.y;
              const col = Math.max(0,Math.round(x/62));
              const row = Math.max(0,Math.round(y/62));
              savePositions({...posCustom,[dragging]:{col,row}});
            }:undefined}
            onMouseUp={editMode?()=>setDragging(null):undefined}
            onMouseLeave={editMode?()=>setDragging(null):undefined}
            onTouchMove={editMode&&dragging?(e)=>{
              const t = e.touches[0];
              const rect = e.currentTarget.getBoundingClientRect();
              const x = t.clientX - rect.left - dragOffset.x;
              const y = t.clientY - rect.top - dragOffset.y;
              const col = Math.max(0,Math.round(x/62));
              const row = Math.max(0,Math.round(y/62));
              savePositions({...posCustom,[dragging]:{col,row}});
            }:undefined}
            onTouchEnd={editMode?()=>setDragging(null):undefined}
          >
            {layout.map(tav=>{
              const code = tav.id;
              const pos = getPos(code, tav.col, tav.row);
              const attivi = ordini.filter(o=>o.tavolo===code && o.stato!=="consegnato");
              const hasNew = attivi.some(o=>o.stato==="nuovo");
              const hasPrep = attivi.some(o=>o.stato==="in_prep");
              const hasReady = attivi.some(o=>o.stato==="pronto");
              const accorpato = isAccorpato(code);
              const sel = tavSelezionato===code;
              const isDragging = dragging===code;
              const bg = editMode?(isDragging?C.blue:C.surface2):(sel?C.gold:accorpato?"#b8860b":hasNew?C.orange:hasReady?C.green:hasPrep?C.blue:C.surface2);
              const col = editMode?(isDragging?"#fff":C.text):((sel||accorpato||hasNew||hasReady||hasPrep)?"#fff":C.muted);
              return (
                <div
                  key={code}
                  onClick={editMode?undefined:()=>handleTapMappa(code)}
                  onMouseDown={editMode?(e)=>{
                    const rect = e.currentTarget.getBoundingClientRect();
                    setDragOffset({x:e.clientX-rect.left,y:e.clientY-rect.top});
                    setDragging(code);
                  }:undefined}
                  onTouchStart={editMode?(e)=>{
                    const t = e.touches[0];
                    const rect = e.currentTarget.getBoundingClientRect();
                    setDragOffset({x:t.clientX-rect.left,y:t.clientY-rect.top});
                    setDragging(code);
                  }:undefined}
                  title={attivi.length>0?attivi.map(o=>o.cliente||"—").join(", "):""}
                  style={{
                    position:"absolute",
                    left: pos.col*62+4,
                    top:  pos.row*62+4,
                    width:54, height:54,
                    borderRadius:10, textAlign:"center",
                    background:bg,
                    border:"2px solid "+(editMode?(isDragging?C.blue:C.gold):(sel?C.gold:accorpato?"#daa520":(hasNew||hasReady||hasPrep)?bg:C.border)),
                    boxShadow:sel?"0 0 0 4px "+C.gold+"44":isDragging?"0 8px 20px rgba(0,0,0,0.3)":"none",
                    transition:isDragging?"none":"all .2s",
                    cursor:editMode?"grab":"pointer",
                    display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
                    zIndex:isDragging?10:1,
                    userSelect:"none",
                  }}
                >
                  <div style={{fontSize:11,fontWeight:700,color:col}}>{code}</div>
                  <div style={{fontSize:7,color:col,opacity:.85,marginTop:1}}>
                    {editMode?"✏️":sel?"TAP+":accorpato?"ACC":hasNew?"NUOVO":hasReady?"PRONTO":hasPrep?"PREP":"libero"}
                  </div>
                </div>
              );
            })}
          </div>
          {!editMode&&tavSelezionato&&<div style={{marginTop:8,padding:8,background:C.gold+"11",border:`1px dashed ${C.gold}`,borderRadius:8,textAlign:"center"}}>
            <div style={{fontSize:11,color:C.gold,marginBottom:6,fontWeight:600}}>✓ Tavolo <span style={{fontFamily:"'DM Mono',monospace"}}>{tavSelezionato}</span> selezionato</div>
            <div style={{display:"flex",gap:6,justifyContent:"center",flexWrap:"wrap"}}>
              <Btn small onClick={()=>apriFormOrdine(tavSelezionato)}>📝 Ordina su {tavSelezionato}</Btn>
              <Btn small variant="ghost" onClick={()=>setTavSelezionato(null)}>✕ Annulla</Btn>
            </div>
            <div style={{fontSize:10,color:C.muted,marginTop:6}}>Oppure tap su un altro tavolo per accorparli</div>
          </div>}
          {editMode&&<div style={{fontSize:11,color:C.blue,marginTop:6,textAlign:"center"}}>✏️ Trascina i tavoli per riposizionarli · le posizioni vengono salvate automaticamente</div>}
        </Card>
      ))}

      {/* Tavoli accorpati */}
      {Object.keys(accorpati).length>0&&(
        <Card style={{marginBottom:12,border:"1px solid #daa52033",background:"#b8860b11"}}>
          <div style={{fontSize:11,color:"#8b6914",fontWeight:600,marginBottom:8}}>🔗 Tavoli accorpati — tap "Ordina" per fare un ordine unico</div>
          <div style={{display:"flex",flexDirection:"column",gap:6}}>
            {Object.keys(accorpati).map(k=>{
              const tavoliInAccorpo = k.split("+");
              const paxStimati = tavoliInAccorpo.length * 3; // 3 PAX per tavolo di default
              return (
                <div key={k} style={{display:"flex",alignItems:"center",gap:8,background:"#daa52022",borderRadius:8,padding:"6px 10px",flexWrap:"wrap"}}>
                  <span style={{fontSize:13,fontWeight:700,color:"#8b6914",fontFamily:"'DM Mono',monospace"}}>🔗 {k}</span>
                  <span style={{fontSize:11,color:"#8b6914",opacity:0.8}}>({tavoliInAccorpo.length} tavoli · ~{paxStimati} PAX)</span>
                  <div style={{flex:1}}/>
                  <Btn small onClick={()=>{
                    setFormNuovo(f=>({...f, tavolo:k, pax:paxStimati}));
                    setZonaSelector(k.startsWith("INT")?"INT":"EST");
                    setShowNuovo(true);
                    setTimeout(()=>{ window.scrollTo({top:0,behavior:"smooth"}); },50);
                  }}>📝 Ordina</Btn>
                  <button onClick={()=>setAccorpati(p=>{const nxt={...p};delete nxt[k];return nxt;})} style={{background:"none",border:"1px solid #8b691433",color:"#8b6914",cursor:"pointer",fontSize:11,borderRadius:6,padding:"4px 8px"}}>✕ Disaccorpa</button>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Config stampante */}
      {showConfig&&(
        <Card style={{marginBottom:14,border:`1px solid ${C.blue}33`}}>
          <div style={{fontSize:11,color:C.blue,textTransform:"uppercase",letterSpacing:1,marginBottom:10,fontWeight:600}}>Configurazione Stampante Termica WiFi</div>
          <div style={{fontSize:12,color:C.muted,marginBottom:8}}>
            Inserisci l'indirizzo IP della stampante Epson TM / Star TSP sulla rete WiFi del ristorante.
          </div>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            <input value={printerIp} onChange={e=>setPrinterIp(e.target.value)} placeholder="Es. 192.168.1.100" style={{flex:1,fontFamily:"'DM Mono',monospace"}}/>
            <Btn small onClick={()=>{PRINTER_IP=printerIp;localStorage.setItem("tierra_printer_ip",printerIp);setShowConfig(false);}}>Salva</Btn>
          </div>
          <div style={{fontSize:11,color:C.muted,marginTop:8}}>
            💡 Se non hai la stampante WiFi, la stampa aprirà una finestra del browser — funziona comunque!
          </div>
        </Card>
      )}

      {/* Filtri */}
      <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:14}}>
        {[["tutti","Tutti"],["nuovo","Nuovi"],["in_prep","In prep"],["pronto","Pronti"],["consegnato","Consegnati"]].map(([val,lbl])=>(
          <button key={val} onClick={()=>setFilter(val)} style={{
            background:filter===val?C.gold:C.surface,color:filter===val?"#fff":C.muted,
            border:`1px solid ${filter===val?C.gold:C.border}`,borderRadius:6,padding:"5px 12px",fontSize:11,fontWeight:500,cursor:"pointer",
          }}>{lbl}</button>
        ))}
      </div>

      {filtered.length===0
        ? <div style={{textAlign:"center",color:C.muted,padding:40,fontSize:14}}>
            <div style={{fontSize:40,marginBottom:12}}>🍽️</div>
            Nessun ordine {filter!=="tutti"?`"${filter}"`:""}
          </div>
        : <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {filtered.map(ord=>(
            <Card key={ord.id} style={{borderLeft:`3px solid ${statoColor(ord.stato)}`}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                <div>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <span style={{fontFamily:"'Cormorant Garamond',serif",fontSize:20,fontWeight:700}}>Tavolo {ord.tavolo}</span>
                    <Tag label={statoLabel(ord.stato)} color={statoColor(ord.stato)}/>
                    {ord.pax&&<Tag label={ord.pax+" PAX"} color={C.muted}/>}
                  </div>
                  <div style={{fontSize:12,color:C.muted,marginTop:2}}>
                    👤 {ord.cliente} · {ord.ora} · {ord.pagamento==="stripe"?"💳 Online":"💵 Al conto"}
                  </div>
                </div>
                <span style={{fontFamily:"'DM Mono',monospace",fontSize:16,fontWeight:700,color:C.gold}}>€{ord.totale?.toFixed(2)}</span>
              </div>
              <div style={{background:C.surface2,borderRadius:8,padding:10,marginBottom:10}}>
                {ord.items.map((item,i)=>(
                  <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"4px 0",borderBottom:`1px solid ${C.border}`,fontSize:13}}>
                    <span><strong>{item.qty}x</strong> {item.nome}</span>
                    <span style={{fontFamily:"'DM Mono',monospace",color:C.muted}}>€{(item.prezzo*item.qty).toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                {ord.stato==="nuovo"&&<Btn small variant="ghost" onClick={()=>aggiornaStato(ord.id,"in_prep")}>👨‍🍳 Inizia prep</Btn>}
                {ord.stato==="in_prep"&&<Btn small variant="green" onClick={()=>aggiornaStato(ord.id,"pronto")}>✅ Pronto</Btn>}
                {ord.stato==="pronto"&&<Btn small variant="ghost" onClick={()=>aggiornaStato(ord.id,"consegnato")}>📦 Consegnato</Btn>}
                <Btn small variant="ghost" onClick={async()=>{setPrinting(ord.id); await printComanda(ord); setTimeout(()=>setPrinting(null),1500);}} disabled={printing===ord.id}>
                  🖨 Comanda
                </Btn>
                <Btn small variant="ghost" onClick={async()=>{setPrinting(ord.id); await printScontrino(ord); setTimeout(()=>setPrinting(null),1500);}} disabled={printing===ord.id}>
                  🧾 Scontrino
                </Btn>
                <Btn small variant="ghost" onClick={()=>stampaOrdine(ord)} disabled={printing===ord.id}>
                  {printing===ord.id?<span className="pulse">⟳ …</span>:"🖨 Tutto"}
                </Btn>
                {isAdmin(user)&&<Btn small variant="danger" onClick={()=>setOrdini(p=>p.filter(o=>o.id!==ord.id))}>✕</Btn>}
              </div>
            </Card>
          ))}
        </div>
      }

      {ordini.length>0&&(
        <Card style={{marginTop:14}}>
          <div style={{display:"flex",gap:20,flexWrap:"wrap"}}>
            {[
              ["Nuovi",    ordini.filter(o=>o.stato==="nuovo").length,      C.orange],
              ["In prep",  ordini.filter(o=>o.stato==="in_prep").length,    C.blue],
              ["Pronti",   ordini.filter(o=>o.stato==="pronto").length,     C.green],
              ["Consegnati",ordini.filter(o=>o.stato==="consegnato").length,C.muted],
              ["Totale €", ordini.reduce((s,o)=>s+(o.totale||0),0).toFixed(2), C.gold],
            ].map(([l,v,c])=>(
              <div key={l}>
                <div style={{fontSize:10,color:C.muted,textTransform:"uppercase",letterSpacing:1}}>{l}</div>
                <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:20,color:c,fontWeight:600}}>{v}</div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ROOT APP
// ═══════════════════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════════════════
// MAGAZZINO
// ═══════════════════════════════════════════════════════════════════════════
function Magazzino({magazzino, setMagazzino}) {
  const [filter,setFilter]       = useState("");
  const [search,setSearch]       = useState("");
  const [viewMode,setViewMode]   = useState("table");
  const [showForm,setShowForm]   = useState(false);
  const [editingId,setEditingId] = useState(null);
  const [form,setForm]           = useState({nome:"",categoria:"Colazioni",qta:"",soglia:"",prezzo:"",sku:"",foto:""});
  const fileRef = useRef(null);

  const reset = () => {
    setForm({nome:"",categoria:"Colazioni",qta:"",soglia:"",prezzo:"",sku:"",foto:""});
    setEditingId(null); setShowForm(false);
  };
  const save = () => {
    if(!form.nome || !form.categoria || form.prezzo===""){ alert("Compila Nome, Categoria, Prezzo"); return; }
    const item = {...form, qta:parseInt(form.qta)||0, soglia:parseInt(form.soglia)||0, prezzo:parseFloat(form.prezzo)||0};
    if(editingId){
      setMagazzino(p => p.map(x => x.id===editingId ? {...x,...item} : x));
      setTimeout(()=>dbSave("Magazzino",{...item,"Action":"update","ID":editingId}).catch(()=>{}),0);
    } else {
      const nuovo = {...item, id:uid()};
      setMagazzino(p => [nuovo, ...p]);
      setTimeout(()=>dbSave("Magazzino",{"Nome":nuovo.nome,"Categoria":nuovo.categoria,"Quantita":nuovo.qta,"Soglia":nuovo.soglia,"Prezzo":nuovo.prezzo,"SKU":nuovo.sku}).catch(()=>{}),0);
    }
    reset();
  };
  const edit = (item) => {
    setEditingId(item.id);
    setForm({nome:item.nome, categoria:item.categoria, qta:String(item.qta), soglia:String(item.soglia), prezzo:String(item.prezzo), sku:item.sku||"", foto:item.foto||""});
    setShowForm(true);
  };
  const del = (id) => { if(confirm("Eliminare questo articolo?")) setMagazzino(p => p.filter(x => x.id!==id)); };
  const handleFoto = (e) => {
    const file = e.target.files?.[0]; if(!file) return;
    const r = new FileReader();
    r.onload = ev => setForm(f => ({...f, foto: ev.target.result}));
    r.readAsDataURL(file);
  };

  const filtered = magazzino
    .filter(x => !filter || x.categoria===filter)
    .filter(x => !search || x.nome.toLowerCase().includes(search.toLowerCase()) || (x.sku||"").toLowerCase().includes(search.toLowerCase()));
  const stockColor = (item) => item.qta===0 ? C.red : item.qta<=item.soglia ? C.orange : C.green;
  const totValore   = filtered.reduce((s,x)=>s + (x.qta*x.prezzo), 0);
  const nTerminati  = filtered.filter(x=>x.qta===0).length;
  const nSottoSogl  = filtered.filter(x=>x.qta>0 && x.qta<=x.soglia).length;

  return (
    <div className="fade" style={{padding:20,maxWidth:900,margin:"0 auto"}}>
      <STitle icon="📦" label="Magazzino"/>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:8,marginBottom:14}}>
        {[["Articoli",String(filtered.length),C.gold],["Valore",fmt(totValore),C.green],["Terminati",String(nTerminati),C.red],["Sotto soglia",String(nSottoSogl),C.orange]].map(([l,v,c])=>(
          <Card key={l} style={{padding:10,textAlign:"center"}}>
            <div style={{fontSize:9,color:C.muted,textTransform:"uppercase",letterSpacing:1,marginBottom:3}}>{l}</div>
            <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:15,fontWeight:600,color:c}}>{v}</div>
          </Card>
        ))}
      </div>

      <div style={{display:"flex",gap:8,marginBottom:12,flexWrap:"wrap",alignItems:"center"}}>
        <input placeholder="🔍 Cerca nome o SKU..." value={search} onChange={e=>setSearch(e.target.value)} style={{flex:"1 1 200px",minWidth:160,padding:"8px 10px",border:`1px solid ${C.border}`,borderRadius:8,fontSize:12}}/>
        <select value={filter} onChange={e=>setFilter(e.target.value)} style={{padding:"8px 10px",border:`1px solid ${C.border}`,borderRadius:8,fontSize:12,background:"#fff"}}>
          <option value="">Tutte le categorie</option>
          {CATEGORIE_MAGAZZINO.map(c=><option key={c} value={c}>{c}</option>)}
        </select>
        <button onClick={()=>setViewMode(viewMode==="table"?"grid":"table")} style={{padding:"8px 10px",border:`1px solid ${C.border}`,borderRadius:8,background:"#fff",cursor:"pointer",fontSize:12}}>
          {viewMode==="table"?"⊞ Grid":"☰ Tabella"}
        </button>
        <Btn small onClick={()=>{reset(); setShowForm(true);}}>+ Articolo</Btn>
      </div>

      {showForm && (
        <Card style={{marginBottom:14,border:`1px solid ${C.gold}33`}}>
          <div style={{fontSize:13,fontWeight:600,marginBottom:10,color:C.gold}}>{editingId ? "✏️ Modifica articolo" : "+ Nuovo articolo"}</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
            <div><div style={{fontSize:10,color:C.muted,marginBottom:4}}>Nome *</div><input value={form.nome} onChange={e=>setForm(f=>({...f,nome:e.target.value}))} style={{width:"100%"}}/></div>
            <div><div style={{fontSize:10,color:C.muted,marginBottom:4}}>Categoria *</div><select value={form.categoria} onChange={e=>setForm(f=>({...f,categoria:e.target.value}))} style={{width:"100%"}}>{CATEGORIE_MAGAZZINO.map(c=><option key={c} value={c}>{c}</option>)}</select></div>
            <div><div style={{fontSize:10,color:C.muted,marginBottom:4}}>Quantità</div><input type="number" value={form.qta} onChange={e=>setForm(f=>({...f,qta:e.target.value}))} style={{width:"100%"}}/></div>
            <div><div style={{fontSize:10,color:C.muted,marginBottom:4}}>Soglia min.</div><input type="number" value={form.soglia} onChange={e=>setForm(f=>({...f,soglia:e.target.value}))} style={{width:"100%"}}/></div>
            <div><div style={{fontSize:10,color:C.muted,marginBottom:4}}>Prezzo (€) *</div><input type="number" step="0.01" value={form.prezzo} onChange={e=>setForm(f=>({...f,prezzo:e.target.value}))} style={{width:"100%"}}/></div>
            <div><div style={{fontSize:10,color:C.muted,marginBottom:4}}>SKU</div><input value={form.sku} onChange={e=>setForm(f=>({...f,sku:e.target.value}))} style={{width:"100%"}}/></div>
          </div>
          <div style={{marginBottom:10}}>
            <div style={{fontSize:10,color:C.muted,marginBottom:4}}>Foto</div>
            <div style={{display:"flex",gap:8,alignItems:"center"}}>
              <input ref={fileRef} type="file" accept="image/*" onChange={handleFoto} style={{display:"none"}}/>
              <Btn small variant="ghost" onClick={()=>fileRef.current?.click()}>📷 Carica</Btn>
              {form.foto && <img src={form.foto} alt="" style={{width:48,height:48,borderRadius:6,objectFit:"cover",border:`1px solid ${C.border}`}}/>}
              {form.foto && <Btn small variant="danger" onClick={()=>setForm(f=>({...f,foto:""}))}>✕</Btn>}
            </div>
          </div>
          <div style={{display:"flex",gap:8}}>
            <Btn onClick={save}>{editingId?"Aggiorna":"Salva"}</Btn>
            <Btn variant="ghost" onClick={reset}>Annulla</Btn>
          </div>
        </Card>
      )}

      {viewMode==="table" && (
        <Card style={{padding:0,overflow:"hidden"}}>
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
              <thead>
                <tr style={{background:C.surface2,borderBottom:`1px solid ${C.border}`}}>
                  <th style={{padding:"10px 12px",textAlign:"left",fontWeight:600,color:C.muted,fontSize:10,textTransform:"uppercase",letterSpacing:0.5}}>Articolo</th>
                  <th style={{padding:"10px 8px",textAlign:"left",fontWeight:600,color:C.muted,fontSize:10,textTransform:"uppercase",letterSpacing:0.5}}>Cat.</th>
                  <th style={{padding:"10px 8px",textAlign:"center",fontWeight:600,color:C.muted,fontSize:10,textTransform:"uppercase",letterSpacing:0.5}}>Stock</th>
                  <th style={{padding:"10px 8px",textAlign:"right",fontWeight:600,color:C.muted,fontSize:10,textTransform:"uppercase",letterSpacing:0.5}}>Prezzo</th>
                  <th style={{padding:"10px 8px",textAlign:"center",fontWeight:600,color:C.muted,fontSize:10,textTransform:"uppercase",letterSpacing:0.5}}></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(item=>{
                  const sc = stockColor(item);
                  return (
                    <tr key={item.id} style={{borderBottom:`1px solid ${C.border}`,background:item.qta===0?(C.redLight||"#ffe5e5")+"55":"transparent"}}>
                      <td style={{padding:"10px 12px"}}>
                        <div style={{display:"flex",alignItems:"center",gap:8}}>
                          {item.foto ? <img src={item.foto} alt="" style={{width:28,height:28,borderRadius:4,objectFit:"cover"}}/> : <div style={{width:28,height:28,borderRadius:4,background:C.surface2,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,color:C.muted}}>📦</div>}
                          <div>
                            <div style={{fontWeight:500,fontSize:12}}>{item.nome}</div>
                            {item.sku && <div style={{fontSize:9,color:C.muted,fontFamily:"'DM Mono',monospace"}}>{item.sku}</div>}
                          </div>
                        </div>
                      </td>
                      <td style={{padding:"10px 8px",fontSize:11,color:C.muted}}>{item.categoria}</td>
                      <td style={{padding:"10px 8px",textAlign:"center"}}><Tag label={`${item.qta}${item.qta===0?" ⚠":""}`} color={sc}/></td>
                      <td style={{padding:"10px 8px",textAlign:"right",fontWeight:500}}>{fmt(item.prezzo)}</td>
                      <td style={{padding:"10px 8px",textAlign:"center",whiteSpace:"nowrap"}}>
                        <Btn small variant="ghost" onClick={()=>edit(item)}>✎</Btn>
                        <Btn small variant="danger" onClick={()=>del(item.id)} style={{marginLeft:4}}>✕</Btn>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {viewMode==="grid" && (
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))",gap:10}}>
          {filtered.map(item=>{
            const sc = stockColor(item);
            return (
              <Card key={item.id} style={{padding:12,borderLeft:`3px solid ${sc}`,background:item.qta===0?(C.redLight||"#ffe5e5")+"55":C.surface}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:60,marginBottom:8,background:C.surface2,borderRadius:6}}>
                  {item.foto ? <img src={item.foto} alt="" style={{maxWidth:"100%",maxHeight:60,borderRadius:6,objectFit:"cover"}}/> : <span style={{fontSize:24,color:C.muted}}>📦</span>}
                </div>
                <div style={{fontWeight:500,fontSize:12,marginBottom:2,minHeight:32}}>{item.nome}</div>
                <div style={{fontSize:10,color:C.muted,marginBottom:6}}>{item.categoria}</div>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                  <Tag label={`${item.qta} pz`} color={sc}/>
                  <span style={{fontWeight:600,fontSize:12}}>{fmt(item.prezzo)}</span>
                </div>
                <div style={{display:"flex",gap:4}}>
                  <Btn small variant="ghost" full onClick={()=>edit(item)}>✎ Modifica</Btn>
                  <Btn small variant="danger" onClick={()=>del(item.id)}>✕</Btn>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {filtered.length===0 && <Card style={{textAlign:"center",padding:40}}><div style={{fontSize:32,marginBottom:8}}>📭</div><div style={{color:C.muted,fontSize:13}}>Nessun articolo trovato</div></Card>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ROOT APP
// ═══════════════════════════════════════════════════════════════════════════
export default function App() {
  const [user,setUser]           = useState(null);
  const [view,setView]           = useState("dashboard");
  const [ordiniTavoli,setOrdiniTavoli] = useState([]);
  const [tasks,setTasks]         = useState(TASK_TEMPLATES.apertura.map(t=>({...t,id:uid(),status:"pending",startTime:null,endTime:null,type:"fisso",assignedTo:""})));
  const [invoices,setInvoices]   = useState([
    {id:uid(),fornitore:"Zeno",importo:312.50,data:"2025-04-10",scadenza:"2025-04-25",categoria:"Verdure",stato:"da pagare",note:""},
    {id:uid(),fornitore:"Market Cantalupo",importo:580.00,data:"2025-04-08",scadenza:"2025-04-30",categoria:"Carne",stato:"pagata",note:""},
  ]);
  const [sales,setSales]         = useState([
    {id:uid(),data:"2025-04-18",servizio:"Pranzo",importo:1840,coperti:42,note:""},
    {id:uid(),data:"2025-04-17",servizio:"Pranzo",importo:1620,coperti:38,note:""},
  ]);
  const [menuCatalog,setMenuCatalog] = useState(()=>{
    const init={};
    Object.entries(MENU_CATALOG_INIT).forEach(([cat,items])=>{init[cat]=items.map(i=>({...i}));});
    return init;
  });
  const [fornitori,setFornitori] = useState(FORNITORI_INIT);
  const [ordini,setOrdini]       = useState([]);
  const [magazzino,setMagazzino] = useState(MAGAZZINO_INIT);

  const logout = () => { setUser(null); setView("dashboard"); };

  const NAV_ADMIN = [
    {id:"dashboard",   icon:"◈", label:"Home"},
    {id:"menu",        icon:"🌿",label:"Menu"},
    {id:"tavoli",      icon:"🍽️", label:"Tavoli"},
    {id:"tasks",       icon:"📋",label:"Task"},
    {id:"ordini",      icon:"🛒",label:"Ordini"},
    {id:"magazzino",   icon:"📦",label:"Magaz."},
    {id:"chiusura",    icon:"📊",label:"Cassa"},
    {id:"fatture",     icon:"🧾",label:"Fatture"},
    {id:"vendite",     icon:"💰",label:"Vendite"},
  ];
  const NAV_STAFF = [
    {id:"dashboard",icon:"◈",  label:"Home"},
    {id:"menu",     icon:"🌿", label:"Menu"},
    {id:"tavoli",   icon:"🍽️", label:"Tavoli"},
    {id:"tasks",    icon:"📋", label:"Task"},
    {id:"ordini",   icon:"🛒", label:"Ordini"},
  ];

  if(!user) return <><style>{gs}</style><Login onLogin={u=>{setUser(u);setView("dashboard");}}/></>;

  const NAV = isAdmin(user) ? NAV_ADMIN : NAV_STAFF;

  return (
    <>
      <style>{gs}</style>
      <div style={{minHeight:"100vh",background:C.bg,paddingBottom:76}}>
        <div style={{background:C.surface,borderBottom:`1px solid ${C.border}`,padding:"10px 20px",display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,zIndex:20}}>
          <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:17,fontWeight:600,color:C.gold,letterSpacing:1}}>
            TIERRA <span style={{color:C.muted,fontSize:10,fontWeight:400,fontFamily:"'DM Sans',sans-serif",letterSpacing:2}}>OS</span>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{width:28,height:28,borderRadius:"50%",background:user.colore+"33",border:`2px solid ${user.colore}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,color:user.colore}}>
              {user.avatar}
            </div>
            <button onClick={logout} style={{background:"none",border:"none",fontSize:11,color:C.muted,cursor:"pointer"}}>Esci</button>
          </div>
        </div>

        {view==="dashboard" && <Dashboard user={user} tasks={tasks} invoices={invoices} sales={sales} menuCatalog={menuCatalog} fornitori={fornitori} ordini={ordini} setView={setView}/>}
        {view==="menu"      && <MenuGiorno menuCatalog={menuCatalog} setMenuCatalog={setMenuCatalog} user={user}/>}
        {view==="tavoli"    && <OrdiniTavoli ordini={ordiniTavoli} setOrdini={setOrdiniTavoli} user={user} menuCatalog={menuCatalog} magazzino={magazzino} setMagazzino={setMagazzino}/>}
        {view==="tasks"     && <Tasks tasks={tasks} setTasks={setTasks} user={user}/>}
        {view==="ordini"    && <OrdiniFornitori fornitori={fornitori} setFornitori={setFornitori} ordini={ordini} setOrdini={setOrdini} user={user}/>}
        {view==="magazzino" && isAdmin(user) && <Magazzino magazzino={magazzino} setMagazzino={setMagazzino}/>}
        {view==="chiusura"  && isAdmin(user) && <Chiusura/>}
        {view==="fatture"   && isAdmin(user) && <Fatture invoices={invoices} setInvoices={setInvoices}/>}
        {view==="vendite"   && isAdmin(user) && <Vendite sales={sales} setSales={setSales}/>}

        <div style={{position:"fixed",bottom:0,left:0,right:0,background:C.surface,borderTop:`1px solid ${C.border}`,display:"flex",zIndex:20}}>
          {NAV.map(nav=>(
            <button key={nav.id} onClick={()=>setView(nav.id)} style={{
              flex:1,background:"none",border:"none",padding:"9px 2px 7px",
              display:"flex",flexDirection:"column",alignItems:"center",gap:1,
              color:view===nav.id?C.gold:C.muted,
              borderTop:view===nav.id?`2px solid ${C.gold}`:"2px solid transparent",
              cursor:"pointer",transition:"all .15s",
            }}>
              <span style={{fontSize:14}}>{nav.icon}</span>
              <span style={{fontSize:9,fontWeight:view===nav.id?600:400,letterSpacing:.3}}>{nav.label}</span>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
