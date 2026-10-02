export function validateEditorialReview(ep) {
  const review = ep.editorial_review;
  if (!review || review.version !== 2) throw new Error('EDITORIAL_REVIEW_REQUIRED: manca la revisione editoriale v2');
  if (review.selected_answer !== ep.answer) throw new Error('La revisione non riguarda la battuta selezionata');
  if (review.self_contained_question !== true || review.needs_explanation !== false ||
      !Number.isInteger(review.inference_steps) || review.inference_steps < 0 || review.inference_steps > 1 ||
      review.twist_count !== 1) throw new Error('La battuta richiede troppi passaggi o una spiegazione');
  if (!String(review.fact_anchor || '').trim()) throw new Error('Manca il collegamento alla notizia');
  if (review.method === 'user_approved') {
    if (ep.revision_requested !== true || review.approved_by !== 'user') throw new Error('Approvazione utente ammessa solo per una revisione esplicita');
  } else if (review.method === 'candidate_review') {
    const alternatives = review.alternatives;
    if (!Array.isArray(alternatives) || new Set(alternatives).size < 3 ||
        alternatives.some(x => typeof x !== 'string' || !x.trim()) ||
        !alternatives.includes(ep.answer)) throw new Error('Servono tre battute distinte, compresa quella selezionata');
    if (!String(review.selection_reason || '').trim()) throw new Error('Manca il motivo della scelta editoriale');
  } else throw new Error('Metodo di revisione editoriale non valido');
}
