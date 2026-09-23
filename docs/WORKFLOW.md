# Workflow operativo

## 1) Genera bozza giornaliera
Workflow GitHub: `Generate Daily Draft`.

Input:
- data;
- titolo notizia;
- fonte;
- URL originale;
- breve testo/sintesi della notizia;
- personaggi coinvolti.

Output:
- file JSON in `drafts/episodes/`;
- prompt vignetta in `drafts/prompts/`.

## 2) Revisiona la bozza
Controllare tono, accuratezza e opportunità editoriale.

## 3) Prepara la vignetta finale
La vignetta finale andrà in:
`assets/episodes/<slug>.jpg`.

## 4) Pubblica manualmente
Workflow GitHub: `Publish Draft`.
- promuove la bozza da `drafts/episodes/` a `data/episodes/`;
- rigenera home, archivio e pagine episodio;
- fa commit su `main`.

## Automazione
Nessun cron di pubblicazione giornaliera è attivo in questa fase.
