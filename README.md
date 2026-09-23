# Travaglio & la Suprema IA

PWA satirica autonoma e separata da `trump-oracolo-ia`.

## Cosa contiene questa versione
- home dell'app
- archivio episodi
- pagine statiche per episodio (`/episodio/<slug>/`)
- generatore giornaliero **in modalità bozza**
- workflow GitHub **manuali**, senza pubblicazione automatica attiva
- build statico dell'archivio e delle pagine episodio

## Flusso editoriale previsto
1. Eseguire manualmente il workflow **Generate Daily Draft**.
2. Ottenere una bozza con notizia, sintesi, domanda di Travaglio, risposta della Suprema IA e prompt vignetta.
3. Revisionare la bozza.
4. Generare/approvare la vignetta finale.
5. Pubblicare manualmente la bozza con il workflow **Publish Draft**.
6. Vercel aggiorna il sito perché il repository è già collegato al deploy.

## Pubblicazione automatica
Al momento è **disattivata**: non ci sono cron giornalieri attivi.

## Comandi locali principali
```bash
node scripts/build-site.mjs
node scripts/generate-daily.mjs --input=drafts/source-news.json --date=2026-09-24
node scripts/publish-draft.mjs --slug=2026-09-24-sample
```

## Segreti GitHub da aggiungere in futuro (facoltativi)
- `OPENAI_API_KEY` – se si vorrà automatizzare la scrittura della bozza tramite API.

## Deploy
Il progetto Vercel di produzione è separato e collegato a questo repository:
`https://travaglio-suprema-ia.vercel.app/`

## Indipendenza
Il progetto è una satira indipendente e non è affiliato a Marco Travaglio né a testate giornalistiche.
