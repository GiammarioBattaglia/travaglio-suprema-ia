# Pubblicazione autonoma quotidiana

## Flusso attivo

La pipeline è operativa e fail-closed:

1. Il turno editoriale quotidiano usa Europe/Rome e verifica se esiste già un episodio del giorno.
2. Se manca, seleziona una notizia italiana recente e la verifica su almeno due fonti autorevoli e indipendenti.
3. Scrive un solo JSON in `incoming/`.
4. GitHub Actions valida data, slug, fonti, indipendenza dei domini, campi editoriali e unicità giornaliera.
5. OpenAI Image API genera una vera caricatura con `gpt-image-2.5-sunburst`.
6. Il renderer applica domanda e risposta come testo tipografico e produce un JPEG 1600×900.
7. Se l'API immagini fallisce, viene usato il fallback SVG e `image_status` registra `fallback_svg`.
8. Il sito viene ricostruito, home e archivio aggiornati e Vercel effettua il deploy.

## Segreto

Il workflow legge esclusivamente `OPENAI_API_KEY` dai GitHub Actions secrets. La chiave non viene salvata nel repository.

## Controlli editoriali

- almeno due fonti indipendenti;
- fatto recente e data verificata;
- parte fattuale separata dalla satira;
- nessun endorsement o indicazione di voto;
- nessuna previsione elettorale presentata come fatto;
- nessuna speculazione su salute, stato mentale, competenza o idoneità;
- niente minori, lutti o tragedie personali come materiale satirico;
- domanda e risposta inventate e chiaramente satiriche.

## Antiduplicazione

Un episodio già pubblicato non viene sovrascritto. Se esiste già un episodio con la data corrente, una nuova pubblicazione automatica viene bloccata. Gli extra richiedono campi espliciti di approvazione e non sono creati dal turno editoriale ordinario.

## Immagini

Percorso principale: JPEG generato dall'API e validato.
Fallback: SVG locale.
Le pagine episodio espongono l'immagine come file apribile e scaricabile.
