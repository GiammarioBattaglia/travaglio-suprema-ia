# Revisione editoriale v2

La domanda deve esporre da sola il fatto pubblico. La risposta deve contenere un solo scarto o doppio senso direttamente collegato alla domanda, comprensibile senza leggere la sintesi. Una battuta che necessita di spiegazione o di due o tre inferenze va riscritta.

Il turno editoriale confronta almeno tre alternative sulla stessa notizia e salva nel JSON `editorial_review`: version 2, method candidate_review, selected_answer uguale ad answer, alternatives con tre risposte distinte compresa la scelta, selection_reason, fact_anchor, self_contained_question true, inference_steps 0 o 1, needs_explanation false, twist_count 1.

Il validatore controlla la struttura e la coerenza della revisione, non misura il sorriso né garantisce un giudizio comico corretto. I valori devono descrivere un confronto realmente svolto. I limiti esistenti di lunghezza, fonti, recenza e separazione fra fatti e satira restano attivi.

Per una revisione espressamente scelta dall'utente: method user_approved, approved_by user e revision_requested true. Usare lo stesso slug e revision_of; assegnare editorial_revision univoco. Se titolo, dialogo, editorial_revision e JPEG coincidono con la pubblicazione, la revisione viene saltata senza una nuova chiamata immagini. Una revisione fallita preserva la precedente pubblicazione.

Esempio approvato il 02.10.2026:
- Travaglio: «Quindi un’impresa può diventare grande e restare artigiana?»
- Suprema IA: «Certo. Purché anche il fatturato sia fatto a mano.»

L'esempio stabilisce immediatezza e densità; non è una formula da replicare ogni giorno.
