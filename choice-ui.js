'use strict';
function paperChoiceContent(q,response){
 if(!['MCQ','MSQ'].includes(q.type))return;
 const entry=PYQChoices.forQuestion(q),options=response.querySelector('.options');if(!options)return;
 options.classList.add('choice-options');
 options.classList.toggle('choice-long',!!entry&&Object.values(entry.choices).some(c=>c.text.length>48));
 response.classList.add('choice-response');
 for(const b of options.querySelectorAll('[data-option]')){
  const letter=b.dataset.option,c=entry?.choices[letter],span=b.querySelector('span:not(.bubble)');
  span.className='choice-value';span.id='choice-value-'+letter;
  b.querySelector('.bubble').id='choice-letter-'+letter;
  b.removeAttribute('aria-label');b.setAttribute('aria-labelledby','choice-letter-'+letter+' choice-value-'+letter);
  if(c)span.innerHTML=PYQChoices.renderChoice(c);else span.textContent='Printed '+letter;
 }
 const link=document.createElement('button');link.type='button';link.className='choice-source-button';link.dataset.choiceSource='';
 link.textContent=entry?'Original choices ↗':'View printed choices ↗';
 link.title=entry?.status==='checked'?'Choices checked against the source image':'Compare with the original printed choices';
 response.querySelector('.answer-label').append(link);
 if(!entry){const note=document.createElement('small');note.className='choice-source-note';note.textContent='Diagram or unclear transcription — use the printed choices.';options.before(note);}
}
async function paperOpenChoiceSource(){
 const q=currentQ();if(!q||!paperActive())return;
 const locked=!!state.session.submitted[q.id]&&state.session.mode==='practice',a=state.session.answers[q.id];
 showModal('Original printed choices',`<p class="choice-source-intro">${esc(q.title)} · Select using the original labels. Your question position stays saved.</p><div class="choice-source-paper" id="choice-source-paper"><span id="choice-source-loading">Loading original print…</span><img id="choice-source-image" hidden alt="${esc(q.title)} — original question and choices"></div><div class="choice-source-footer"><div class="choice-source-picks" role="group" aria-label="Choose from original print">${['A','B','C','D'].map(l=>`<button data-choice-pick="${l}" data-choice-question="${esc(q.id)}" aria-pressed="${(Array.isArray(a)?a:[a]).includes(l)}" ${locked?'disabled':''}>${l}</button>`).join('')}</div><button data-close>Back to question</button></div>`);
 const img=$('#choice-source-image'),loading=$('#choice-source-loading'),paper=$('#choice-source-paper');
 const loaded=()=>{if(!img.isConnected)return;img.hidden=false;loading.hidden=true;requestAnimationFrame(()=>paper.scrollTop=paper.scrollHeight);};
 try{const src=await questionScreenshot(q);if(!img.isConnected)return;img.onload=loaded;img.onerror=()=>loading.textContent='Unable to load the print. Close and reopen to retry.';img.src=src;if(img.complete&&img.naturalWidth)loaded();}catch{if(loading.isConnected)loading.textContent='Unable to load the print. Close and reopen to retry.';}
}
document.addEventListener('click',e=>{
 const source=e.target.closest('[data-choice-source]');if(source){paperOpenChoiceSource();return;}
 const pick=e.target.closest('[data-choice-pick]');if(!pick||pick.disabled||!paperActive()||currentQ().id!==pick.dataset.choiceQuestion)return;
 const button=$('.paper-response [data-option="'+pick.dataset.choicePick+'"]');if(!button||button.disabled)return;
 button.click();
 if(currentQ().type==='MCQ')modal.close();else{const a=state.session.answers[currentQ().id]||[];$$('[data-choice-pick]').forEach(b=>b.setAttribute('aria-pressed',String(a.includes(b.dataset.choicePick))));}
});
