#!/usr/bin/env python3
# tierra_v9_patch.py — Patcha App.jsx con il modulo Prenotazioni v9
# Uso: python3 tierra_v9_patch.py

import sys
import os
import shutil
from datetime import datetime

APP_PATH = os.path.expanduser("~/Downloads/tierra-os-build/src/App.jsx")
BACKUP_DIR = os.path.dirname(APP_PATH)

PRENOTAZIONI_MODULE = '''// ═══════════════════════════════════════════════════════════════════════════
// PRENOTAZIONI — Sync parallela Lark Base + Google Calendar (v9)
// ═══════════════════════════════════════════════════════════════════════════
const prenoApi = {
  gcalCreate: async (prenotazione) => {
    const res = await fetch(FN("gcal-prenotazioni"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "create", prenotazione }),
    });
    return res.json();
  },
  gcalUpdate: async (eventId, prenotazione) => {
    const res = await fetch(FN("gcal-prenotazioni"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update", eventId, prenotazione }),
    });
    return res.json();
  },
  gcalDelete: async (eventId) => {
    const res = await fetch(FN("gcal-prenotazioni"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", eventId }),
    });
    return res.json();
  },
  larkCreate: async (fields) => {
    const res = await fetch(FN("lark-prenotazioni"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "create", fields }),
    });
    return res.json();
  },
  larkUpdate: async (recordId, fields) => {
    const res = await fetch(FN("lark-prenotazioni"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update", recordId, fields }),
    });
    return res.json();
  },
  larkDelete: async (recordId) => {
    const res = await fetch(FN("lark-prenotazioni"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", recordId }),
    });
    return res.json();
  },
  larkList: async () => {
    const res = await fetch(FN("lark-prenotazioni"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "list", pageSize: 200 }),
    });
    return res.json();
  },
};

function prenoToLarkFields(p) {
  return {
    booking_id: p.booking_id || p.id,
    cliente:    p.cliente || "",
    data:       p.data || "",
    ora:        p.ora || "",
    pax:        Number(p.pax) || 1,
    tavolo:     p.tavolo || "",
    telefono:   p.telefono || "",
    email:      p.email || "",
    note:       p.note || "",
    status:     p.status || "confermata",
    gcal_event_id: p.gcal_event_id || "",
    source:     p.source || "tierra_os",
  };
}

function larkRecordToPreno(record) {
  const f = record.fields || {};
  return {
    id: f.booking_id || record.recordId,
    booking_id: f.booking_id || record.recordId,
    recordId: record.recordId,
    cliente:  f.cliente || "",
    data:     f.data || "",
    ora:      f.ora || "",
    pax:      Number(f.pax) || 1,
    tavolo:   f.tavolo || "",
    telefono: f.telefono || "",
    email:    f.email || "",
    note:     f.note || "",
    status:   f.status || "confermata",
    gcal_event_id: f.gcal_event_id || "",
    source:   f.source || "tierra_os",
  };
}

function Prenotazioni({ user }) {
  const [list, setList] = useState(() => {
    try { return JSON.parse(localStorage.getItem("tierra_prenotazioni") || "[]"); }
    catch(e) { return []; }
  });
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [filter, setFilter] = useState("future");
  const [syncStatus, setSyncStatus] = useState({ loading: false, error: null, lastSync: null });
  const [migrating, setMigrating] = useState(false);
  const [form, setForm] = useState({
    cliente: "", data: new Date().toISOString().split("T")[0],
    ora: "20:00", pax: 2, tavolo: "", telefono: "", email: "", note: "",
    status: "confermata",
  });

  const persistLocal = (newList) => {
    setList(newList);
    try { localStorage.setItem("tierra_prenotazioni", JSON.stringify(newList)); } catch(e) {}
  };

  const loadFromLark = async () => {
    setSyncStatus(s => ({ ...s, loading: true, error: null }));
    try {
      const res = await prenoApi.larkList();
      if (res.ok && Array.isArray(res.items)) {
        const remote = res.items.map(larkRecordToPreno);
        persistLocal(remote);
        setSyncStatus({ loading: false, error: null, lastSync: new Date() });
      } else {
        throw new Error(res.error || "Risposta Lark non valida");
      }
    } catch(e) {
      setSyncStatus({ loading: false, error: e.message, lastSync: null });
    }
  };

  useEffect(() => {
    loadFromLark();
    const interval = setInterval(() => { loadFromLark(); }, 60000);
    return () => clearInterval(interval);
  }, []);

  const migrateLocalToLark = async () => {
    if (!confirm("Carica tutte le prenotazioni locali su Lark Base?")) return;
    setMigrating(true);
    let success = 0, failed = 0;
    for (const p of list) {
      if (p.recordId) { success++; continue; }
      try {
        const res = await prenoApi.larkCreate(prenoToLarkFields(p));
        if (res.ok) {
          success++;
          persistLocal(list.map(x => x.id === p.id ? { ...x, recordId: res.recordId } : x));
        } else { failed++; }
      } catch(e) { failed++; }
    }
    setMigrating(false);
    alert("Migrazione: " + success + " OK / " + failed + " errori");
    await loadFromLark();
  };

  const salva = async () => {
    if (!form.cliente || !form.data || !form.ora) {
      alert("Compila almeno Cliente, Data e Ora"); return;
    }
    setSyncStatus(s => ({ ...s, loading: true, error: null }));
    const isEdit = !!editing;
    const bookingId = isEdit ? editing.booking_id : uid();
    const prenotazione = { ...form, booking_id: bookingId, pax: Number(form.pax) || 1 };

    try {
      if (isEdit) {
        const promises = [];
        if (editing.recordId) {
          promises.push(prenoApi.larkUpdate(editing.recordId, prenoToLarkFields({
            ...prenotazione, gcal_event_id: editing.gcal_event_id || "",
          })));
        }
        if (editing.gcal_event_id) {
          promises.push(prenoApi.gcalUpdate(editing.gcal_event_id, prenotazione));
        } else {
          promises.push(prenoApi.gcalCreate(prenotazione));
        }
        const results = await Promise.all(promises);
        const gcalRes = results[results.length - 1];
        const newGcalId = (gcalRes && gcalRes.eventId) || editing.gcal_event_id || "";
        if (!editing.gcal_event_id && newGcalId && editing.recordId) {
          await prenoApi.larkUpdate(editing.recordId, { gcal_event_id: newGcalId });
        }
        const updated = { ...editing, ...prenotazione, id: bookingId, gcal_event_id: newGcalId };
        persistLocal(list.map(x => x.id === editing.id ? updated : x));
      } else {
        const [larkRes, gcalRes] = await Promise.all([
          prenoApi.larkCreate(prenoToLarkFields(prenotazione)),
          prenoApi.gcalCreate(prenotazione),
        ]);
        const recordId = larkRes && larkRes.ok ? larkRes.recordId : null;
        const eventId  = gcalRes && gcalRes.ok ? gcalRes.eventId  : null;
        if (recordId && eventId) {
          await prenoApi.larkUpdate(recordId, { gcal_event_id: eventId });
        }
        if (!recordId && !eventId) {
          throw new Error("Lark: " + (larkRes && larkRes.error || "?") + " · GCal: " + (gcalRes && gcalRes.error || "?"));
        }
        const nuova = { ...prenotazione, id: bookingId, recordId, gcal_event_id: eventId || "" };
        persistLocal([nuova, ...list]);
      }

      setForm({
        cliente: "", data: new Date().toISOString().split("T")[0],
        ora: "20:00", pax: 2, tavolo: "", telefono: "", email: "", note: "",
        status: "confermata",
      });
      setShowForm(false);
      setEditing(null);
      setSyncStatus({ loading: false, error: null, lastSync: new Date() });

      try {
        const tok = await larkToken();
        await larkSend(tok, {
          schema: "2.0",
          header: { template: "green", title: { tag: "plain_text", content: "📅 " + (isEdit ? "Modificata" : "Nuova") + " prenotazione" }},
          body: { elements: [
            { tag: "div", text: { tag: "lark_md", content:
              "**" + prenotazione.cliente + "** — " + prenotazione.pax + " pax\\n" +
              "📅 " + prenotazione.data + " alle " + prenotazione.ora + "\\n" +
              (prenotazione.tavolo ? "🍽️ Tavolo " + prenotazione.tavolo + "\\n" : "") +
              (prenotazione.telefono ? "📞 " + prenotazione.telefono + "\\n" : "") +
              (prenotazione.note ? "\\n📝 " + prenotazione.note : "")
            }},
            { tag: "note", elements: [{ tag: "lark_md", content: "Tierra OS · " + (user && user.nome || "") }] },
          ]},
        });
      } catch(e) {}

    } catch(e) {
      setSyncStatus({ loading: false, error: e.message, lastSync: null });
      alert("Errore sync: " + e.message);
    }
  };

  const elimina = async (preno) => {
    if (!confirm("Eliminare la prenotazione di " + preno.cliente + "?")) return;
    setSyncStatus(s => ({ ...s, loading: true, error: null }));
    try {
      const promises = [];
      if (preno.recordId) promises.push(prenoApi.larkDelete(preno.recordId));
      if (preno.gcal_event_id) promises.push(prenoApi.gcalDelete(preno.gcal_event_id));
      await Promise.all(promises);
      persistLocal(list.filter(x => x.id !== preno.id));
      setSyncStatus({ loading: false, error: null, lastSync: new Date() });
    } catch(e) {
      setSyncStatus({ loading: false, error: e.message, lastSync: null });
      alert("Errore eliminazione: " + e.message);
    }
  };

  const editPreno = (p) => {
    setEditing(p);
    setForm({
      cliente: p.cliente || "", data: p.data || "",
      ora: p.ora || "20:00", pax: p.pax || 2,
      tavolo: p.tavolo || "", telefono: p.telefono || "",
      email: p.email || "", note: p.note || "",
      status: p.status || "confermata",
    });
    setShowForm(true);
  };

  const annullaForm = () => {
    setShowForm(false);
    setEditing(null);
    setForm({
      cliente: "", data: new Date().toISOString().split("T")[0],
      ora: "20:00", pax: 2, tavolo: "", telefono: "", email: "", note: "",
      status: "confermata",
    });
  };

  const today = new Date().toISOString().split("T")[0];
  const filtered = list.filter(p => {
    if (filter === "oggi")   return p.data === today;
    if (filter === "future") return p.data >= today;
    return true;
  }).sort((a,b) => {
    if (a.data !== b.data) return a.data.localeCompare(b.data);
    return (a.ora || "").localeCompare(b.ora || "");
  });

  const statusColor = (s) => s === "confermata" ? C.green : s === "in_attesa" ? C.orange : C.red;
  const statusLabel = (s) => s === "confermata" ? "✓ Confermata" : s === "in_attesa" ? "⏳ In attesa" : "✕ Annullata";

  return (
    <div className="fade" style={{padding:20,maxWidth:720,margin:"0 auto"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14}}>
        <STitle icon="📅" label="Prenotazioni"/>
        <Btn small onClick={() => setShowForm(!showForm)}>+ Nuova</Btn>
      </div>

      <div style={{
        display:"flex",alignItems:"center",justifyContent:"space-between",
        background: syncStatus.error ? C.red+"22" : C.greenLight,
        border: "1px solid " + (syncStatus.error ? C.red+"33" : C.gold+"33"),
        borderRadius:8, padding:"8px 12px", marginBottom:14, fontSize:11,
      }}>
        <div style={{color: syncStatus.error ? C.red : C.greenDark, fontWeight:600}}>
          {syncStatus.loading ? <span className="pulse">⟳ Sync con Lark + GCal…</span>
            : syncStatus.error ? "⚠ " + syncStatus.error
            : syncStatus.lastSync ? "✓ Sincronizzato · " + syncStatus.lastSync.toLocaleTimeString("it-IT",{hour:"2-digit",minute:"2-digit"})
            : "○ In attesa di sync…"}
        </div>
        <div style={{display:"flex",gap:6}}>
          <Btn small variant="ghost" onClick={loadFromLark} disabled={syncStatus.loading}>🔄</Btn>
          {list.some(p => !p.recordId) && (
            <Btn small variant="ghost" onClick={migrateLocalToLark} disabled={migrating}>
              {migrating ? <span className="pulse">↑</span> : "↑ Migra"}
            </Btn>
          )}
        </div>
      </div>

      {showForm && (
        <Card style={{marginBottom:14, border: "2px solid " + C.gold}}>
          <div style={{fontSize:13,fontWeight:700,color:C.gold,marginBottom:14,textTransform:"uppercase",letterSpacing:1}}>
            {editing ? "✏️ Modifica prenotazione" : "➕ Nuova prenotazione"}
          </div>

          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
            <div>
              <div style={{fontSize:10,color:C.muted,marginBottom:4}}>Cliente *</div>
              <input value={form.cliente} onChange={e => setForm(f => ({...f, cliente: e.target.value}))} placeholder="Nome cognome" style={{width:"100%"}}/>
            </div>
            <div>
              <div style={{fontSize:10,color:C.muted,marginBottom:4}}>Telefono</div>
              <input value={form.telefono} onChange={e => setForm(f => ({...f, telefono: e.target.value}))} placeholder="+39..." style={{width:"100%"}}/>
            </div>
          </div>

          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:10}}>
            <div>
              <div style={{fontSize:10,color:C.muted,marginBottom:4}}>Data *</div>
              <input type="date" value={form.data} onChange={e => setForm(f => ({...f, data: e.target.value}))} style={{width:"100%"}}/>
            </div>
            <div>
              <div style={{fontSize:10,color:C.muted,marginBottom:4}}>Ora *</div>
              <input type="time" value={form.ora} onChange={e => setForm(f => ({...f, ora: e.target.value}))} style={{width:"100%"}}/>
            </div>
            <div>
              <div style={{fontSize:10,color:C.muted,marginBottom:4}}>PAX</div>
              <input type="number" min="1" value={form.pax} onChange={e => setForm(f => ({...f, pax: e.target.value}))} style={{width:"100%"}}/>
            </div>
          </div>

          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
            <div>
              <div style={{fontSize:10,color:C.muted,marginBottom:4}}>Tavolo</div>
              <input value={form.tavolo} onChange={e => setForm(f => ({...f, tavolo: e.target.value}))} placeholder="Es. INT3, EST5" style={{width:"100%"}}/>
            </div>
            <div>
              <div style={{fontSize:10,color:C.muted,marginBottom:4}}>Email</div>
              <input type="email" value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))} placeholder="cliente@..." style={{width:"100%"}}/>
            </div>
          </div>

          <div style={{marginBottom:10}}>
            <div style={{fontSize:10,color:C.muted,marginBottom:4}}>Note</div>
            <textarea value={form.note} onChange={e => setForm(f => ({...f, note: e.target.value}))} placeholder="Allergie, occasioni speciali, richieste…" style={{width:"100%",minHeight:55,resize:"vertical"}}/>
          </div>

          <div style={{marginBottom:14}}>
            <div style={{fontSize:10,color:C.muted,marginBottom:6}}>Stato</div>
            <div style={{display:"flex",gap:6}}>
              {[["confermata","✓ Confermata"],["in_attesa","⏳ In attesa"],["annullata","✕ Annullata"]].map(([v,l]) => (
                <button key={v} onClick={() => setForm(f => ({...f, status: v}))} style={{
                  flex:1, padding:"8px",borderRadius:8,fontSize:12,fontWeight:500,cursor:"pointer",
                  background: form.status === v ? statusColor(v) : "transparent",
                  color: form.status === v ? "#fff" : C.muted,
                  border: "1px solid " + (form.status === v ? statusColor(v) : C.border),
                }}>{l}</button>
              ))}
            </div>
          </div>

          <div style={{display:"flex",gap:8}}>
            <Btn onClick={salva} disabled={syncStatus.loading}>
              {syncStatus.loading ? <span className="pulse">Sync…</span> : (editing ? "✓ Salva modifiche" : "✓ Crea prenotazione")}
            </Btn>
            <Btn variant="ghost" onClick={annullaForm}>Annulla</Btn>
            {editing && <Btn variant="ghost" onClick={() => printPrenotazione(editing)}>🖨 Stampa</Btn>}
          </div>
        </Card>
      )}

      <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:14}}>
        {[["future","Future"],["oggi","Oggi"],["tutte","Tutte"]].map(([v,l]) => {
          const count = v === "future" ? list.filter(p => p.data >= today).length
                      : v === "oggi"   ? list.filter(p => p.data === today).length
                      : list.length;
          return (
            <button key={v} onClick={() => setFilter(v)} style={{
              background: filter === v ? C.gold : C.surface,
              color: filter === v ? "#fff" : C.muted,
              border: "1px solid " + (filter === v ? C.gold : C.border),
              borderRadius:6, padding:"5px 12px", fontSize:11, fontWeight:500, cursor:"pointer",
            }}>{l} ({count})</button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <Card style={{textAlign:"center", padding:40}}>
          <div style={{fontSize:32, marginBottom:8}}>📅</div>
          <div style={{color:C.muted, fontSize:13}}>Nessuna prenotazione {filter === "oggi" ? "oggi" : filter === "future" ? "futura" : ""}</div>
        </Card>
      ) : (
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {filtered.map(p => {
            const dataObj = new Date(p.data + "T00:00:00");
            const isOggi = p.data === today;
            const isPast = p.data < today;
            return (
              <Card key={p.id} style={{
                borderLeft: "3px solid " + statusColor(p.status),
                opacity: isPast ? 0.6 : 1,
              }}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
                  <div style={{flex:1}}>
                    <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                      <span style={{fontFamily:"'Cormorant Garamond',serif",fontSize:17,fontWeight:700}}>{p.cliente}</span>
                      <Tag label={statusLabel(p.status)} color={statusColor(p.status)}/>
                      {isOggi && <Tag label="OGGI" color={C.gold}/>}
                    </div>
                    <div style={{fontSize:12,color:C.muted,marginTop:3}}>
                      📅 {dataObj.toLocaleDateString("it-IT",{weekday:"short",day:"2-digit",month:"short"})} · ⏰ {p.ora} · 👥 {p.pax} pax
                      {p.tavolo && " · 🍽️ T" + p.tavolo}
                    </div>
                    {(p.telefono || p.email) && (
                      <div style={{fontSize:11,color:C.muted,marginTop:3}}>
                        {p.telefono && "📞 " + p.telefono}
                        {p.telefono && p.email && " · "}
                        {p.email && "✉ " + p.email}
                      </div>
                    )}
                    {p.note && (
                      <div style={{fontSize:11,color:C.text,marginTop:5,padding:"5px 8px",background:C.surface2,borderRadius:6,borderLeft:"2px solid " + C.gold}}>
                        📝 {p.note}
                      </div>
                    )}
                    <div style={{fontSize:10,color:C.muted,marginTop:4,display:"flex",gap:8}}>
                      {p.recordId && <span style={{color:C.lark}}>📊 Lark</span>}
                      {p.gcal_event_id && <span style={{color:C.green}}>📅 GCal</span>}
                      {!p.recordId && !p.gcal_event_id && <span style={{color:C.orange}}>⚠ Solo locale</span>}
                    </div>
                  </div>
                  <div style={{display:"flex",flexDirection:"column",gap:5,flexShrink:0}}>
                    <Btn small variant="ghost" onClick={() => editPreno(p)}>✎</Btn>
                    <Btn small variant="ghost" onClick={() => printPrenotazione(p)}>🖨</Btn>
                    {isAdmin(user) && <Btn small variant="danger" onClick={() => elimina(p)}>✕</Btn>}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

'''

def main():
    print("=" * 60)
    print("TIERRA OS v9 — PATCH App.jsx")
    print("=" * 60)

    if not os.path.exists(APP_PATH):
        print(f"❌ ERROR: file non trovato: {APP_PATH}")
        sys.exit(1)

    # Backup
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup = os.path.join(BACKUP_DIR, f"App_BACKUP_v8_pre_v9_{ts}.jsx")
    shutil.copy(APP_PATH, backup)
    print(f"✅ Backup creato: {os.path.basename(backup)}")

    # Leggi file
    with open(APP_PATH, "r", encoding="utf-8") as f:
        content = f.read()

    original_size = len(content)
    print(f"📄 File letto: {original_size} bytes, {content.count(chr(10))} righe")

    # ============= PATCH 1: Import useEffect =============
    old1 = 'import { useState, useRef } from "react";'
    new1 = 'import { useState, useRef, useEffect } from "react";'
    if old1 in content:
        content = content.replace(old1, new1, 1)
        print("✅ PATCH 1/5: Import useEffect aggiunto")
    elif new1 in content:
        print("⚠️  PATCH 1/5: useEffect già presente, skip")
    else:
        print("❌ PATCH 1/5 FAILED: import non trovato")
        sys.exit(1)

    # ============= PATCH 2: Inserisci modulo Prenotazioni =============
    old2 = '''// ═══════════════════════════════════════════════════════════════════════════
// MAGAZZINO
// ═══════════════════════════════════════════════════════════════════════════
function Magazzino({magazzino, setMagazzino}) {'''

    new2 = PRENOTAZIONI_MODULE + old2

    if "function Prenotazioni({ user })" in content:
        print("⚠️  PATCH 2/5: Modulo Prenotazioni già presente, skip")
    elif old2 in content:
        content = content.replace(old2, new2, 1)
        print("✅ PATCH 2/5: Modulo Prenotazioni inserito")
    else:
        print("❌ PATCH 2/5 FAILED: marker MAGAZZINO non trovato")
        sys.exit(1)

    # ============= PATCH 3: NAV_ADMIN =============
    old3 = '''  const NAV_ADMIN = [
    {id:"dashboard",   icon:"◈", label:"Home"},
    {id:"menu",        icon:"🌿",label:"Menu"},
    {id:"tavoli",      icon:"🍽️", label:"Tavoli"},
    {id:"tasks",       icon:"📋",label:"Task"},'''

    new3 = '''  const NAV_ADMIN = [
    {id:"dashboard",   icon:"◈", label:"Home"},
    {id:"menu",        icon:"🌿",label:"Menu"},
    {id:"tavoli",      icon:"🍽️", label:"Tavoli"},
    {id:"prenotazioni",icon:"📅",label:"Preno."},
    {id:"tasks",       icon:"📋",label:"Task"},'''

    if 'id:"prenotazioni"' in content and 'NAV_ADMIN' in content:
        print("⚠️  PATCH 3/5: NAV_ADMIN già patchato, skip")
    elif old3 in content:
        content = content.replace(old3, new3, 1)
        print("✅ PATCH 3/5: NAV_ADMIN aggiornato")
    else:
        print("❌ PATCH 3/5 FAILED: NAV_ADMIN non trovato")
        sys.exit(1)

    # ============= PATCH 4: NAV_STAFF =============
    old4 = '''  const NAV_STAFF = [
    {id:"dashboard",icon:"◈",  label:"Home"},
    {id:"menu",     icon:"🌿", label:"Menu"},
    {id:"tavoli",   icon:"🍽️", label:"Tavoli"},
    {id:"tasks",    icon:"📋", label:"Task"},
    {id:"ordini",   icon:"🛒", label:"Ordini"},
  ];'''

    new4 = '''  const NAV_STAFF = [
    {id:"dashboard",   icon:"◈",  label:"Home"},
    {id:"menu",        icon:"🌿", label:"Menu"},
    {id:"tavoli",      icon:"🍽️", label:"Tavoli"},
    {id:"prenotazioni",icon:"📅", label:"Preno."},
    {id:"tasks",       icon:"📋", label:"Task"},
    {id:"ordini",      icon:"🛒", label:"Ordini"},
  ];'''

    if old4 in content:
        content = content.replace(old4, new4, 1)
        print("✅ PATCH 4/5: NAV_STAFF aggiornato")
    elif 'NAV_STAFF' in content and content.count('id:"prenotazioni"') >= 2:
        print("⚠️  PATCH 4/5: NAV_STAFF già patchato, skip")
    else:
        print("❌ PATCH 4/5 FAILED: NAV_STAFF non trovato")
        sys.exit(1)

    # ============= PATCH 5: Root render =============
    old5 = '''        {view==="tavoli"    && <OrdiniTavoli ordini={ordiniTavoli} setOrdini={setOrdiniTavoli} user={user} menuCatalog={menuCatalog} magazzino={magazzino} setMagazzino={setMagazzino}/>}
        {view==="tasks"     && <Tasks tasks={tasks} setTasks={setTasks} user={user}/>}'''

    new5 = '''        {view==="tavoli"    && <OrdiniTavoli ordini={ordiniTavoli} setOrdini={setOrdiniTavoli} user={user} menuCatalog={menuCatalog} magazzino={magazzino} setMagazzino={setMagazzino}/>}
        {view==="prenotazioni" && <Prenotazioni user={user}/>}
        {view==="tasks"     && <Tasks tasks={tasks} setTasks={setTasks} user={user}/>}'''

    if 'view==="prenotazioni"' in content:
        print("⚠️  PATCH 5/5: Root render già patchato, skip")
    elif old5 in content:
        content = content.replace(old5, new5, 1)
        print("✅ PATCH 5/5: Root render aggiornato")
    else:
        print("❌ PATCH 5/5 FAILED: Root render non trovato")
        sys.exit(1)

    # Scrivi file
    with open(APP_PATH, "w", encoding="utf-8") as f:
        f.write(content)

    new_size = len(content)
    delta = new_size - original_size

    print()
    print("=" * 60)
    print(f"✅ App.jsx PATCHATO con successo")
    print(f"📊 Dimensione: {original_size} → {new_size} bytes (+{delta})")
    print(f"📊 Righe: {content.count(chr(10))} righe totali")
    print(f"💾 Backup: {os.path.basename(backup)}")
    print("=" * 60)
    print()
    print("PROSSIMI PASSI:")
    print("  cd ~/Downloads/tierra-os-build")
    print("  npm run build")
    print()

if __name__ == "__main__":
    main()
