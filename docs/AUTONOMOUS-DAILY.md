# Pubblicazione autonoma quotidiana

Il progetto usa una pipeline in due livelli.

1. Ogni mattina un'automazione ChatGPT ricerca una notizia politica italiana recente, verifica almeno due fonti autorevoli e indipendenti, prepara un episodio breve e neutrale nei fatti e salva un singolo JSON in `incoming/`.
2. GitHub Actions intercetta il nuovo JSON, esegue validazioni fail-closed, genera una vignetta SVG vettoriale, pubblica l'episodio, aggiorna home/archivio e lascia che Vercel effettui il deploy.

## Regole editoriali obbligatorie

- Nessuna previsione elettorale o indicazione di voto.
- Nessun endorsement o opposizione a partiti, candidati o politici.
- Nessuna diagnosi, speculazione sanitaria o giudizio di competenza/fitness.
- Evitare minori, tragedie personali, lutti e salute come materiale satirico.
- La parte fattuale deve essere separata dalla parte satirica.
- Almeno due fonti; preferire Reuters, ANSA e fonti istituzionali.
- Il criterio di scelta della notizia non deve favorire o penalizzare una parte politica.
- Domanda di Travaglio e risposta della Suprema IA devono essere chiaramente inventate.
- In caso di dubbio o verifica insufficiente, non creare il file `incoming/`.

## Schema minimo JSON

```json
{
  "date": "2026-09-24",
  "slug": "2026-09-24-esempio",
  "autonomous": true,
  "editorial_pass": true,
  "political_neutrality_pass": true,
  "source": {"name":"Reuters","url":"https://..."},
  "sources": [
    {"name":"Reuters","url":"https://..."},
    {"name":"Fonte istituzionale","url":"https://..."}
  ],
  "title": "Titolo breve",
  "headline": "Titolo fattuale",
  "summary": "Sintesi breve",
  "news_text": "Ricostruzione fattuale breve.",
  "question": "Suprema IA, ...?",
  "answer": "Risposta satirica breve.",
  "characters": ["Marco Travaglio","Suprema IA","Altro protagonista"]
}
```

La vignetta automatica è SVG 1600×900: non sgrana, è apribile e scaricabile. Una vignetta AI può eventualmente sostituirla in seguito senza modificare il flusso di pubblicazione.
