'use strict';
/* Presentation upgrade: the grading engine, ordered paths and saved question IDs stay shared. */
const studioUI={mapOpen:!matchMedia('(max-width:850px)').matches,scroll:new Map()};
const studioPreviousPracticeView=practiceView;
const studioPreviousAfterRender=nexusAfterRender;
const studioLocalCalculator=calculator;
const studioGrade=(id,answer)=>C.grade(qData(id),answer);
const studioStatusLabels={correct:'Correct',wrong:'Incorrect',reviewed:'Self review / ungraded',answered:'Answered',visited:'Unanswered',unseen:'Not visited'};

function studioOpenCalculator(){
  const s=state.session,q=s&&!s.finished?currentQ():null;
  if(!PYQStudioCore.calculatorAllowed(s,q)){toast('Calculator is unavailable during an ESE Prelims simulation.');return;}
  // TCS restricts framing to its own domains. Open the original, without proxying it.
  window.open(PYQStudioCore.calculatorURL,'_blank','popup,width=720,height=570,resizable=yes,scrollbars=yes,noopener,noreferrer');
  $('#studio-calc-launch')?.remove();
  const help=document.createElement('aside');help.id='studio-calc-launch';help.className='studio-calc-launch';help.setAttribute('aria-label','Calculator launcher');
  help.innerHTML=`<button aria-label="Dismiss calculator link" data-studio-calc-dismiss>×</button><strong>TCS scientific calculator</strong><p>If a separate window did not open, use this link. Your practice place is saved.</p><a href="${PYQStudioCore.calculatorURL}">Open calculator in this tab ↗</a>`;
  document.body.appendChild(help);
}
function studioSummary(q){
  const s=state.session;if(s.mode==='exam'||!s.submitted[q.id])return '';
  const g=C.grade(q,s.answers[q.id]);
  const title={correct:'Correct answer',wrong:'A useful mistake. Review, then try again.',manual:'Written response saved',ungraded:'Saved for review',skipped:'No answer submitted'}[g.status];
  return `<div class="studio-result ${g.status}" role="status"><span class="studio-result-symbol">${g.status==='correct'?'✓':g.status==='wrong'?'!':'•'}</span><div><strong>${esc(title)}</strong><small>${g.status==='manual'?'Use the reference and self-review rubric below.':g.status==='ungraded'?'Excluded from automatic scoring. See source details below.':'Answer reference and working are below your response.'}</small></div>${g.score!==null?`<b>${g.score>0?'+':''}${g.score.toFixed(2)}<small>marks</small></b>`:''}</div>`;
}
nxNavigator=function(s){
  const w=PYQOrderedPractice.windowOf(s),groups=[];
  s.ids.forEach((id,i)=>{const q=byId.get(id),last=groups.at(-1);if(!last||last.chapterId!==q.chapterId)groups.push({name:q.chapter,subject:q.subject,index:i,order:q.chapterOrder,chapterId:q.chapterId});});
  const current=groups.filter(g=>g.index<=s.index).at(-1),totals=PYQStudioCore.counts(s,studioGrade,C.hasAnswer),exam=s.mode==='exam';
  return `<section class="nx-panel nx-navigator" aria-label="Question navigator"><div class="nx-section-head"><h3>Question map</h3><span class="studio-live-dot">Saved</span></div>
    <div class="studio-map-stats">${(exam?[['Answered',totals.answered],['Remaining',totals.visited+totals.unseen]]:[['Correct',totals.correct],['Incorrect',totals.wrong],['Remaining',totals.visited+totals.unseen]]).map(([label,n])=>`<div><strong>${num(n)}</strong><small>${label}</small></div>`).join('')}</div>
    ${s.continuous?`<label class="nx-path-label">Chapter<select id="nx-path-chapter" aria-label="Jump to chapter">${groups.map(g=>`<option value="${g.index}" ${current===g?'selected':''}>${s.subjectScope?'':esc(subjectName(g.subject))+' · '}${g.order}. ${esc(g.name)}</option>`).join('')}</select></label>`:''}
    <form id="studio-jump" class="studio-jump"><label for="studio-question-number">Go to question</label><input id="studio-question-number" type="number" min="1" max="${s.ids.length}" value="${s.index+1}" required><button type="submit" aria-label="Go to question number">${nxIcon('arrow')}</button></form>
    <div class="nx-map-paging"><button data-jump="${Math.max(0,w.start-48)}" aria-label="Earlier question numbers" ${w.start===0?'disabled':''}>${nxIcon('back')}</button><span>${w.start+1}–${w.end} of ${num(s.ids.length)}</span><button data-jump="${w.end}" aria-label="Later question numbers" ${w.end===s.ids.length?'disabled':''}>${nxIcon('arrow')}</button></div>
    <div class="palette">${w.rows.map(({id,index:i})=>{const status=PYQStudioCore.questionStatus(s,id,studioGrade,C.hasAnswer);return `<button data-jump="${i}" class="studio-${status} ${i===s.index?'current':''} ${state.flags[id]?'flagged':''}" aria-current="${i===s.index?'step':'false'}" aria-label="Question ${i+1}, ${studioStatusLabels[status]}${state.flags[id]?', marked for review':''}">${i+1}${state.flags[id]?'<span class="studio-flag-dot" aria-hidden="true">•</span>':''}</button>`;}).join('')}</div>
    <div class="studio-legend">${(exam?['answered','visited','unseen']:['correct','wrong','answered','reviewed','visited','unseen']).map(k=>`<span><i class="studio-${k}"></i>${studioStatusLabels[k]}</span>`).join('')}<span><i class="studio-review-dot"></i>Marked for review</span></div>
    <div class="studio-next-links"><button data-studio-next="unanswered">Next unanswered ${nxIcon('arrow')}</button><button data-studio-next="flagged">Next marked ${nxIcon('arrow')}</button>${exam?'':'<button data-studio-next="wrong">Revisit a mistake '+nxIcon('arrow')+'</button>'}</div>
    ${s.continuous?`<button data-nx-pause class="nx-submit-set">Save & leave practice</button><p class="nx-path-help">All questions, in teaching order.<br>Your place is saved on this device.</p>`:`<button data-action="finish" class="nx-submit-set">Submit ${exam?'test':'review'}</button>`}
  </section>`;
};
practiceView=function(){
  const s=state.session;if(!s||s.finished)return studioPreviousPracticeView();
  const q=currentQ(),allowCalc=PYQStudioCore.calculatorAllowed(s,q);
  let html=studioPreviousPracticeView();
  html=html.replace('<div class="practice-grid">',`<div class="practice-grid studio-practice-grid ${studioUI.mapOpen?'':'studio-map-hidden'}">`);
  html=html.replace('<div class="q-tools">',`<div class="q-tools">${allowCalc?`<button data-action="calculator" title="Open original TCS calculator" aria-label="Open TCS scientific calculator">${nxIcon('calculator')}</button>`:''}<button data-studio-map aria-controls="studio-map" aria-expanded="${studioUI.mapOpen}" aria-label="${studioUI.mapOpen?'Hide':'Show'} question map" title="Toggle question map">${nxIcon('menu')}</button>`);
  html=html.replace('<div class="question-sheet"',`<div id="studio-question-content" class="studio-question-content" data-question="${esc(q.id)}" tabindex="0" role="region" aria-label="Question and response">`+studioSummary(q)+'<div class="question-sheet"');
  html=html.replace('<aside class="session-side">',`<aside class="session-side" id="studio-map" ${studioUI.mapOpen?'':'hidden'}>`);
  html=html.replace('<h3>Question tools</h3>','<h3>Your toolkit</h3>');
  html=html.replace('<button data-action="calculator">',`<button data-action="calculator" aria-label="Open TCS scientific calculator">`);
  if(q.exam==='ese-prelims'&&allowCalc)html=html.replace('<div class="nx-tool-grid">',`<div class="nx-tool-grid"><button data-action="calculator">${nxIcon('calculator')} Calculator</button>`);
  html=html.replace('</div></section><section class="nx-panel nx-navigator"',`${allowCalc?`</div><a class="studio-calc-link" href="${PYQStudioCore.calculatorURL}" target="_blank" rel="noopener noreferrer">Open TCS calculator directly ↗</a>`:'</div>'}</section><section class="nx-panel nx-navigator"`);
  html=html.replace('<div class="q-actions"><div>','</div><div class="q-actions" aria-label="Question actions"><div>');
  html=html.replace('>View answer reference</button>','>Answer & solution</button>');
  return html;
};
nexusAfterRender=function(){
  studioPreviousAfterRender();
  const jumpForm=$('#studio-jump');if(jumpForm)jumpForm.onsubmit=e=>{e.preventDefault();const n=Number($('#studio-question-number').value);if(Number.isInteger(n)&&n>=1&&n<=state.session.ids.length)jump(n-1);};
  document.body.classList.toggle('studio-practice',view==='practice'&&!!state.session&&!state.session.finished);
  const topCalc=$('#studio-top-calculator');if(topCalc)topCalc.hidden=!PYQStudioCore.calculatorAllowed(state.session,state.session&&!state.session.finished?currentQ():null);
  if(window.PYQAccount)PYQAccount.paint();
};
document.addEventListener('click',e=>{
  const b=e.target.closest('button');if(!b)return;
  if(b.hasAttribute('data-studio-calc-dismiss'))$('#studio-calc-launch')?.remove();
  if(b.hasAttribute('data-studio-map')){studioUI.mapOpen=!studioUI.mapOpen;render();if(studioUI.mapOpen&&matchMedia('(max-width:850px)').matches)$('#studio-map')?.scrollIntoView({behavior:'smooth',block:'start'});}
  if(b.dataset.studioNext){const i=PYQStudioCore.nextMatching(state.session,state.session.index,b.dataset.studioNext,state.flags,studioGrade,C.hasAnswer);if(i<0)toast('No matching question in this learning path.');else jump(i);}
});
actions.calculator=studioOpenCalculator;
const studioPreviousRender=render;
render=function(){
  const oldPane=$('#studio-question-content');if(oldPane)studioUI.scroll.set(oldPane.dataset.question,oldPane.scrollTop);
  studioPreviousRender();
  const pane=$('#studio-question-content');if(!pane)return;
  const offset=studioUI.scroll.get(pane.dataset.question)||0;
  const restore=()=>{if(pane.isConnected)pane.scrollTop=offset;};restore();
  $('#q-image')?.addEventListener('load',restore,{once:true});
};
render();
