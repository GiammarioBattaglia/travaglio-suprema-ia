# Travaglio & la Suprema IA

PWA satirica autonoma, mobile-first e separata dagli altri progetti.

## Stato operativo

La pubblicazione quotidiana è attiva. Il turno editoriale prepara al massimo un episodio al giorno; il repository riceve un JSON validato in `incoming/`; GitHub Actions esegue i controlli fail-closed, genera la caricatura, pubblica l'episodio, aggiorna home e archivio e Vercel effettua il deploy.

## Pipeline

1. Notizia italiana di politica o vita istituzionale delle ultime 24 ore.
2. Verifica su almeno due fonti autorevoli e indipendenti.
3. JSON episodio con controlli editoriali e di neutralità.
4. Generazione immagine tramite OpenAI Image API, modello `gpt-image-2.5-sunburst`.
5. Composizione finale JPEG 1600×900 con testi applicati tipograficamente.
6. Se la generazione API fallisce, fallback SVG locale.
7. Build delle pagine episodio, home e archivio.
8. Deploy Vercel e controlli live.

## Segreto richiesto

Il repository usa il GitHub Actions secret `OPENAI_API_KEY`. La chiave non deve comparire nel codice, nei log o nei file pubblici.

## Regole di sicurezza

- nessuna sovrascrittura di episodi già pubblicati;
- nessun duplicato quotidiano automatico;
- pubblicazione bloccata se fonti, data o campi obbligatori non superano i controlli;
- fallback SVG se l'immagine API non può essere generata;
- dialoghi sempre dichiarati come satira inventata;
- nessuna indicazione di voto, endorsement o previsione elettorale.

## Produzione

https://travaglio-suprema-ia.vercel.app/

Il progetto è satira indipendente e non è affiliato a Marco Travaglio né a testate giornalistiche.
