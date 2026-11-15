# Esperimento isolato — Revisione satirica IA v3 (15 novembre 2026)

## Finalità
Selezione, creazione e approvazione delle battute **esclusivamente mediante IA**. Nessun approvatore umano e nessun intervento umano sugli episodi quotidiani.

## Stato e confini
- Questo ramo è sperimentale e **non è collegato** al workflow di produzione.
- Tutti i nuovi file sono in `experiments/`, percorso escluso dai trigger del workflow attuale.
- Non si modifica `scripts/`, `incoming/`, `data/`, `assets/`, `index.html` o `.github/workflows/`.
- Nessuna funzione in questo esperimento pubblica, aggiorna le pagine, sovrascrive JPEG o effettua commit automatici.
- Gli episodi già pubblicati sono letti esclusivamente come riferimento; il replay non li modifica.

## Moduli
- `ai-comedy-gate-v3.mjs`: secondo giudice IA indipendente, quattro punteggi 0–10 con soglie vincolanti, errore/assenza di API = rifiuto.
- `editorial-dryrun-v3.mjs`: punto d'ingresso in sola lettura per testare una nuova bozza. Anche se approvata, `publish_authorized` resta `false`.
- `prepare-autonomous-v3.mjs`: copia sperimentale della preparazione quotidiana; produce 8–12 alternative, usa il giudice IA v3, visualizza il risultato su stdout, **non scrive file**.
- `replay-historical-comedy-v3.mjs`: esamina sette episodi storici con il giudice IA; nessuna pubblicazione.
- `test-ai-comedy-gate-v3.mjs`: test senza rete e con risposte API simulate.

## Test eseguiti
- Controllo sintattico dei moduli sperimentali tramite parser JavaScript.
- Otto verifiche funzionali sul codice del ramo: completezza alternative, punteggi, bocciatura, approvazione IA senza pubblicazione, revisione storica non modificabile.
- Simulazione integrale con risposte API artificiali: generatore -> revisore indipendente; 8 alternative; punteggio ponderato di prova 8,45; esito dry-run, mai pubblicato.
- Il punteggio 8,45 appartiene a una **risposta simulata** e non costituisce una valutazione effettiva dell'episodio da parte di un modello remoto.

## Esecuzione deliberata (su una copia del ramo sperimentale)
```sh
node experiments/test-ai-comedy-gate-v3.mjs
COMEDY_V3_ALLOW_LIVE=yes node experiments/prepare-autonomous-v3.mjs --dry-run
node experiments/replay-historical-comedy-v3.mjs --live
```
Le ultime due istruzioni necessitano di `OPENAI_API_KEY` già configurata nell'ambiente di esecuzione. Non inserire mai la chiave nel repository.

## Condizioni per l'attivazione definitiva
1. Riesame indipendente su episodi reali con API disponibili e confronto qualitativo dei falsi positivi.
2. Test fail-closed delle chiamate API e dei limiti di spesa.
3. Verifica della resa grafica dei fumetti su smartphone dopo la nuova selezione.
4. Verifica delle garanzie di unicità quotidiana, integrità archivio e ripristino.
5. Soltanto dopo il superamento di queste prove, collegamento al workflow esistente senza duplicare cron o pubblicazioni.

**Non avviare alcun workflow di pubblicazione da questi file sperimentali.**
