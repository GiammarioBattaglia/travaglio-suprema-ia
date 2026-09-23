# Travaglio & la Suprema IA

App satirica indipendente, mobile-first, pubblicata su Vercel. Home, archivio, singoli episodi e immagini già pubblicate restano conservati.

## Pubblicazione quotidiana

- Il turno editoriale ChatGPT «Episodio Travaglio IA» è abilitato ogni giorno alle 10:24, fuso Europe/Rome: legge i dati attuali, controlla almeno due fonti indipendenti e, solo per una notizia recente verificata, aggiunge un unico JSON in `incoming/`.
- GitHub Actions `Autonomous Daily Publish` reagisce al nuovo JSON e dispone anche di un controllo di recupero giornaliero alle 10:15 UTC. Non genera da solo notizie e non crea duplicati dello stesso giorno.
- Il publisher valida schema, fonti e data locale; produce prima la caricatura JPEG originale attraverso OpenAI Images, verifica risoluzione e decodifica, applica domanda e risposta con testo vettoriale leggibile, aggiorna episodio/home/archivio e verifica il sito live dopo il deploy.
- Se l'API immagini manca o fallisce, usa il fallback SVG già presente e imposta `image_status: fallback_svg` e `image_fallback: true`. Non spaccia mai il fallback per una caricatura originale.
- L'operazione è fail-closed: se testo/immagine/build/commit/deploy non superano i controlli, non deve essere dichiarata riuscita. Gli episodi già pubblicati non vengono cancellati o sovrascritti.

## Requisito per le vere caricature quotidiane

Il repository deve avere il secret Actions `OPENAI_API_KEY` valido, con accesso al modello `gpt-image-2` e credito API disponibile. Impostarlo in **GitHub → Repository → Settings → Secrets and variables → Actions → New repository secret**. Non inserire mai la chiave in file del repository, workflow, chat o URL. L'abbonamento ChatGPT non equivale a credito API.

Per verificare senza pubblicare un episodio esiste `node scripts/test-render-caricature.mjs`: usa un'immagine fixture locale e un'API simulata, non una vera generazione OpenAI. La verifica reale avviene solo quando il job mostra `OPENAI_IMAGE_AVAILABLE=true` e un episodio nuovo conclude `image_status=generated_jpeg` con deploy pubblico verificato.

I workflow manuali Generate Daily Draft e Publish Draft sono stati conservati. La documentazione storica è in `docs/`.
