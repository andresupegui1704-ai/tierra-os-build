# Tierra OS — PWA

Sistema operativo di Tierra Organic Bistrot.

## Come pubblicare online (hosting gratuito con Netlify)

### 1. Crea account su Netlify
Vai su https://netlify.com e registrati gratis.

### 2. Installa dipendenze e build
```bash
npm install
npm run build
```
Questo crea una cartella `dist/` con l'app ottimizzata.

### 3. Pubblica su Netlify
- Trascina la cartella `dist/` su https://app.netlify.com/drop
- In 30 secondi hai un URL tipo: `https://tierra-os.netlify.app`

### 4. Dominio personalizzato (opzionale)
In Netlify: Site Settings → Domain → aggiungi `app.tierraorganic.it`

---

## Come installare sui telefoni

### Android (Chrome)
1. Apri `https://tierra-os.netlify.app` in Chrome
2. Tocca i 3 puntini ··· in alto a destra
3. "Aggiungi a schermata Home" → "Installa"
4. L'icona Tierra appare come un'app normale

### iOS (Safari)
1. Apri `https://tierra-os.netlify.app` in **Safari** (non Chrome)
2. Tocca l'icona di condivisione □↑ in basso
3. "Aggiungi a schermata Home"
4. L'icona Tierra appare come un'app normale

### Condividi con il team
Manda semplicemente il link a tutti gli operatori via WhatsApp o Lark.
Ognuno lo installa in 30 secondi dal proprio telefono.

---

## Credenziali Lark già configurate
- App ID: cli_a96eb75ba5e1de17
- Chat ID: oc_34a2bddf91c4a93eb9eebfd219532b9a

---

## Aggiornamenti
Ogni volta che vuoi aggiornare l'app:
1. Modifica i file in `src/`
2. `npm run build`
3. Trascina di nuovo `dist/` su Netlify
Gli utenti vedono la versione aggiornata automaticamente al prossimo avvio.

---

## Dominio personalizzato (app.tierraorganic.it)

### Opzione A — Netlify (consigliato, gratuito)
1. Pubblica su Netlify come descritto sopra
2. Vai su: Site Settings → Domain Management → Add custom domain
3. Inserisci: `app.tierraorganic.it`
4. Netlify ti dà 2 record DNS da aggiungere al tuo provider di dominio

### Configurazione DNS (dal pannello del tuo provider dominio)
Aggiungi questi record:
```
Tipo: CNAME
Nome: app
Valore: il-tuo-sito.netlify.app
TTL: 3600
```

### Opzione B — Vercel (alternativa gratuita)
1. Vai su vercel.com → Import Project → carica la cartella
2. Settings → Domains → aggiungi `app.tierraorganic.it`
3. Stessa configurazione DNS

### SSL automatico
Sia Netlify che Vercel attivano HTTPS automaticamente — obbligatorio per le PWA.

---
