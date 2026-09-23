# Travaglio & la Suprema IA

Starter project per una PWA satirica autonoma, separata da `trump-oracolo-ia`.

## Obiettivo
- nuova app indipendente
- deploy su Vercel
- repository GitHub separato
- installabile su smartphone come PWA
- logo dedicato, social preview dedicata
- episodio quotidiano: notizia → domanda di Travaglio → risposta della Suprema IA → vignetta

## Struttura
- `index.html` home/app shell
- `styles.css` stile base
- `app.mjs` logica base e rendering episodio
- `manifest.webmanifest` PWA manifest
- `sw.js` service worker
- `api/daily-episode.js` stub serverless Vercel
- `data/episodes.json` archivio episodi statico iniziale
- `vercel.json` configurazione base

## Nota
Questo è uno starter locale. Per il deploy finale occorrono:
1. creazione repo GitHub separato
2. collegamento nuovo progetto Vercel
3. aggiunta asset finali (icone, logo, social card, immagini episodio)
4. eventuale funzione automatica giornaliera

## Asset grafici

Sono inclusi gli asset PWA di produzione: `icon-180.png`, `icon-192.png`, `icon-512.png`, `icon-maskable.png`, `social.jpg` (1200x630) e `hero.jpg`. La social card non usa il marchio della testata come brand dell’app.
