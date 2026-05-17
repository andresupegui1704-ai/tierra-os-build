// patch-app-lark-integration.js
// Modifica src/App.jsx per integrare CRUD Lark
// Backup automatico già presente: src/App.jsx.backup-pre-lark-integration

const fs = require('fs');
const path = 'src/App.jsx';

let src = fs.readFileSync(path, 'utf8');
const original = src;

console.log('📄 Reading App.jsx... ');
console.log(`   Size: ${src.length} chars\n`);

// ============================================
// PATCH 1 — Sostituisci le 4 funzioni in MenuGiorno
// ============================================
console.log('🔧 PATCH 1 — Replacing toggle/updateItem/deleteItem/addItem in MenuGiorno...');

const oldFunctions = `  const toggle = async (cat,id) => {
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
  };`;

const newFunctions = `  // === LARK-INTEGRATED FUNCTIONS ===
  // Toggle disponibilita: scrive su Lark + aggiorna state
  const toggle = async (cat,id) => {
    const item = menuCatalog[cat]?.find(i => i.id === id);
    if (!item) return;
    const newAvailable = !item.disponibile;
    // Optimistic update
    setMenuCatalog(p=>({...p,[cat]:p[cat].map(i=>i.id===id?{...i,disponibile:newAvailable}:i)}));
    // Sync to Lark
    try {
      const res = await fetch(FN("update-product"), {
        method:"PATCH",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({record_id:id,fields:{disponibile:newAvailable}})
      });
      const j = await res.json();
      if (!j.success) {
        console.error("[toggle] Lark error:",j);
        // Rollback
        setMenuCatalog(p=>({...p,[cat]:p[cat].map(i=>i.id===id?{...i,disponibile:!newAvailable}:i)}));
      }
    } catch(e) {
      console.error("[toggle] Network error:",e);
      setMenuCatalog(p=>({...p,[cat]:p[cat].map(i=>i.id===id?{...i,disponibile:!newAvailable}:i)}));
    }
  };

  const updateItem = async (cat,updated) => {
    // Optimistic update
    setMenuCatalog(p=>({...p,[cat]:p[cat].map(i=>i.id===updated.id?updated:i)}));
    setEditItem(null);
    // Sync to Lark
    try {
      const res = await fetch(FN("update-product"), {
        method:"PATCH",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          record_id:updated.id,
          fields:{
            nome:updated.nome,
            prezzo:n(updated.prezzo),
            ingredienti:updated.ingredienti||"",
            disponibile:updated.disponibile!==false
          }
        })
      });
      const j = await res.json();
      if (!j.success) console.error("[updateItem] Lark error:",j);
    } catch(e) {
      console.error("[updateItem] Network error:",e);
    }
  };

  const deleteItem = async (cat,id) => {
    if (!confirm("Eliminare definitivamente questo piatto da Lark?")) return;
    // Optimistic delete
    const backup = menuCatalog[cat];
    setMenuCatalog(p=>({...p,[cat]:p[cat].filter(i=>i.id!==id)}));
    try {
      const res = await fetch(FN("delete-product"), {
        method:"DELETE",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({record_id:id})
      });
      const j = await res.json();
      if (!j.success) {
        console.error("[deleteItem] Lark error:",j);
        setMenuCatalog(p=>({...p,[cat]:backup}));
        alert("Errore durante eliminazione. Riprova.");
      }
    } catch(e) {
      console.error("[deleteItem] Network error:",e);
      setMenuCatalog(p=>({...p,[cat]:backup}));
    }
  };

  const addItem = async (cat) => {
    if(!newItem.nome) return;
    try {
      const res = await fetch(FN("create-product"), {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          fields:{
            nome:newItem.nome,
            category:cat,
            prezzo:n(newItem.prezzo),
            ingredienti:newItem.ingredienti||"",
            disponibile:true
          }
        })
      });
      const j = await res.json();
      if (j.success) {
        // Add to state with real Lark record_id
        setMenuCatalog(p=>({
          ...p,
          [cat]:[...(p[cat]||[]),{
            id:j.record_id,
            nome:newItem.nome,
            prezzo:n(newItem.prezzo),
            ingredienti:newItem.ingredienti||"",
            disponibile:true
          }]
        }));
        setNewItem({nome:"",prezzo:"",ingredienti:"",disponibile:true});
        setShowAdd(null);
      } else {
        console.error("[addItem] Lark error:",j);
        alert("Errore durante creazione piatto.");
      }
    } catch(e) {
      console.error("[addItem] Network error:",e);
      alert("Errore di rete. Riprova.");
    }
  };`;

if (src.includes(oldFunctions)) {
  src = src.replace(oldFunctions, newFunctions);
  console.log('   ✅ MenuGiorno functions replaced\n');
} else {
  console.error('   ⚠️  Could not find old functions block. App.jsx may have been modified.');
  console.error('   Aborting PATCH 1.\n');
}

// ============================================
// PATCH 2 — Sostituisci useState menuCatalog con array vuoto + aggiungi useEffect fetch
// ============================================
console.log('🔧 PATCH 2 — Adding useEffect fetch in App component...');

const oldMenuState = `  const [menuCatalog,setMenuCatalog] = useState(()=>{
    const init={};
    Object.entries(MENU_CATALOG_INIT).forEach(([cat,items])=>{init[cat]=items.map(i=>({...i}));});
    return init;
  });`;

const newMenuState = `  const [menuCatalog,setMenuCatalog] = useState(()=>{
    const init={};
    Object.entries(MENU_CATALOG_INIT).forEach(([cat,items])=>{init[cat]=items.map(i=>({...i}));});
    return init;
  });
  const [ingredienti,setIngredienti] = useState({});
  const [loadingMenu,setLoadingMenu] = useState(true);

  // === LARK FETCH AL MOUNT ===
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        console.log("[App] Fetching products + ingredienti from Lark...");
        const [prodRes,ingRes] = await Promise.all([
          fetch(FN("get-products")),
          fetch(FN("get-ingredients"))
        ]);
        const prodJson = await prodRes.json();
        const ingJson = await ingRes.json();
        if (cancelled) return;

        // Products: trasforma in formato menuCatalog
        if (prodJson.success && prodJson.products) {
          const catalog = {};
          prodJson.products.forEach(p => {
            const cat = p.category || "Altro";
            if (!catalog[cat]) catalog[cat] = [];
            catalog[cat].push({
              id: p.id,
              nome: p.nome,
              prezzo: parseFloat(p.prezzo) || 0,
              ingredienti: p.ingredienti || "",
              disponibile: p.disponibile !== false,
              subcategory: p.subcategory || "",
              allergens: p.allergens || "",
              notes: p.notes || ""
            });
          });
          setMenuCatalog(catalog);
          console.log(\`[App] Loaded \${prodJson.total} products from Lark\`);
        }

        // Ingredienti
        if (ingJson.success && ingJson.grouped) {
          setIngredienti(ingJson.grouped);
          console.log(\`[App] Loaded \${ingJson.total} ingredienti from Lark\`);
        }
      } catch(e) {
        console.error("[App] Failed to fetch from Lark:",e);
        console.log("[App] Using fallback MENU_CATALOG_INIT");
      } finally {
        if (!cancelled) setLoadingMenu(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);`;

if (src.includes(oldMenuState)) {
  src = src.replace(oldMenuState, newMenuState);
  console.log('   ✅ useEffect fetch added\n');
} else {
  console.error('   ⚠️  Could not find menuCatalog state block.');
  console.error('   Aborting PATCH 2.\n');
}

// ============================================
// SCRIVI IL FILE
// ============================================
if (src === original) {
  console.log('⚠️  No changes applied. App.jsx unchanged.');
} else {
  fs.writeFileSync(path, src);
  console.log('✅ App.jsx patched successfully!');
  console.log(`   New size: ${src.length} chars (delta: ${src.length - original.length})`);
  console.log('\n📌 Next steps:');
  console.log('   1. npm start          # test locale');
  console.log('   2. Apri http://localhost:3000');
  console.log('   3. Login owner');
  console.log('   4. Vai in Menu → vedi se carica i prodotti da Lark');
  console.log('   5. Se OK → git push');
  console.log('\n🔙 Rollback se serve:');
  console.log('   cp src/App.jsx.backup-pre-lark-integration src/App.jsx');
}
