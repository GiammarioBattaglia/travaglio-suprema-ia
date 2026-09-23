# Travaglio & la Suprema IA

PWA satirica autonoma e separata da `trump-oracolo-ia`.

## Obiettivo
- nuova app indipendente
- deploy su Vercel
- repository GitHub separato
- installabile su smartphone come PWA
- logo dedicato e social preview dedicata
- episodio quotidiano: notizia → domanda di Travaglio → risposta della Suprema IA → vignetta

## Struttura
- `index.html` home/app shell
- `styles.css` stile base
- `app.mjs` logica base e rendering episodio
- `manifest.webmanifest` PWA manifest
- `sw.js` service worker
- `api/daily-episode.js` base serverless Vercel
- `data/episodes.json` archivio episodi
- `vercel.json` configurazione Vercel

## Asset grafici
Sono inclusi gli asset PWA di produzione: `icon-192.png`, `icon-512.png` e `social.jpg` (1200x630). La stessa social card viene usata come hero iniziale. La grafica identifica il progetto come satira indipendente e non usa il marchio di una testata come brand dell’app.

## Indipendenza del progetto
Il progetto è una satira indipendente e non è affiliato a Marco Travaglio né a testate giornalistiche.


## Deploy su Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FGiammarioBattaglia%2Ftravaglio-suprema-ia&project-name=travaglio-suprema-ia&repository-name=travaglio-suprema-ia)

Il deploy deve creare un progetto Vercel separato chiamato `travaglio-suprema-ia` collegato a questo repository GitHub. Non usare o sovrascrivere progetti HEF/Trump esistenti.
