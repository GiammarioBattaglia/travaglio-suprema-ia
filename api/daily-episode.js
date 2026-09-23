export default async function handler(req, res) {
  res.status(200).json({
    ok: true,
    message: 'Stub iniziale: qui andrà la logica del recupero / selezione dell\'episodio del giorno.',
    hints: [
      'ingestione notizia',
      'normalizzazione dati',
      'generazione domanda e risposta',
      'filtro editoriale',
      'pubblicazione episodio del giorno'
    ]
  });
}
