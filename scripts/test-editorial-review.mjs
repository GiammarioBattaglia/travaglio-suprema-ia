import assert from 'node:assert/strict';
import { validateEditorialReview } from './editorial-review.mjs';
const answer='Certo. Purché anche il fatturato sia fatto a mano.';
const ep={answer,editorial_review:{version:2,method:'candidate_review',selected_answer:answer,alternatives:[answer,'La crescita ora si misura con il ditale.','Anche il capannone ha il grembiule.'],selection_reason:'Doppio senso diretto, senza contesto aggiuntivo.',fact_anchor:'Crescere conservando la qualifica artigiana.',self_contained_question:true,inference_steps:1,needs_explanation:false,twist_count:1}};
assert.doesNotThrow(()=>validateEditorialReview(ep));
for(const patch of [{needs_explanation:true},{inference_steps:2},{selected_answer:'Altra battuta'},{alternatives:[answer,answer,answer]},{method:'user_approved',approved_by:'user'}]){
  assert.throws(()=>validateEditorialReview({...ep,editorial_review:{...ep.editorial_review,...patch}}));
}
assert.throws(()=>validateEditorialReview({answer}));
assert.doesNotThrow(()=>validateEditorialReview({...ep,revision_requested:true,editorial_review:{...ep.editorial_review,method:'user_approved',approved_by:'user'}}));
console.log('EDITORIAL_REVIEW_VALIDATED: selection binding, candidate diversity, inference limit, explicit revision approval');
