'use strict';
/* A compact presentation layer. Question identities, answers, grading and cloud saves stay shared. */
const paperUI={panel:null,fit:true,dark:false,scroll:new Map(),opener:null};
try{paperUI.fit=localStorage.getItem('pyq-paper-fit')!=='read';paperUI.dark=localStorage.getItem('pyq-paper-theme')==='dark';}catch{}
const paperActive=()=>view==='practice'&&!!state.session&&!state.session.finished;
const paperOldAfterRender=nexusAfterRender,paperOldRender=render,paperOldSyncMenu=nxSyncMenu,paperOldZoom=actions.zoom;
const paperPanels={map:'Question map',notes:'Working notes',solution:'Answer & solution',tools:'Tools & confidence',details:'Source & learning history'};
function paperButton(name,label,icon='menu'){
  return `<button type="button" data-paper-panel="${name}" aria-controls="paper-drawer" aria-expanded="false" aria-label="Open ${label.toLowerCase()}" title="${label}">${nxIcon(icon)}<span>${label}</span></button>`;
}
function paperSetTheme(){
  document.body.classList.toggle('paper-dark',paperActive()&&paperUI.dark);
  if(!paperActive())return;
  const b=$('#theme-toggle');if(b){b.innerHTML=nxIcon(paperUI.dark?'sun':'moon');b.setAttribute('aria-label',paperUI.dark?'Use light question paper':'Use dark practice controls');b.title=b.getAttribute('aria-label');}
}
function paperSetFit(fit){
  paperUI.fit=fit;
  try{localStorage.setItem('pyq-paper-fit',fit?'fit':'read');}catch{}
  const sheet=$('#question-sheet');if(sheet){sheet.classList.toggle('paper-read-size',!fit);if(fit)sheet.scrollTop=0;}
  $$('[data-paper-fit]').forEach(b=>{const selected=(b.dataset.paperFit==='fit')===fit;b.setAttribute('aria-pressed',String(selected));b.classList.toggle('selected',selected);});
}
function paperPanel(name,opener=null,focus=true){
  if(!paperActive())return;
  if(name==='solution'&&state.session.mode==='exam')return;
  paperUI.panel=name;if(opener)paperUI.opener=opener;
  const drawer=$('#paper-drawer'),backdrop=$('#paper-backdrop');if(!drawer)return;
  drawer.hidden=!name;backdrop.hidden=!name;
  $('#paper-panel-title').textContent=paperPanels[name]||'Practice tools';
  $$('[data-paper-slot]').forEach(el=>el.hidden=el.dataset.paperSlot!==name);
  $$('[data-paper-panel]').forEach(b=>{b.setAttribute('aria-expanded',String(b.dataset.paperPanel===name));b.classList.toggle('selected',b.dataset.paperPanel===name);});
  // Only the open drawer is keyboard-active; the question does not move underneath it.
  ['.paper-card','.topbar','.nx-practice-heading'].forEach(selector=>{const node=$(selector);if(node)node.inert=!!name;});
  if(name&&focus)$('#paper-close').focus();
  if(!name&&focus){const target=paperUI.opener;if(target?.isConnected)target.focus();else $('[data-paper-panel="tools"]')?.focus();paperUI.opener=null;}
}
nxSyncMenu=function(){
  paperOldSyncMenu();
  if(paperActive()){
    const open=document.body.classList.contains('nx-menu-open'),side=$('.sidebar');if(side)side.inert=!open;
  }
};
function paperEnhance(){
  const active=paperActive();document.body.classList.toggle('paper-practice',active);paperSetTheme();
  if(!active){paperUI.panel=null;const header=$('.topbar');if(header)header.inert=false;return;}
  const s=state.session,q=currentQ(),card=$('.question-card'),content=$('#studio-question-content'),sheet=$('#question-sheet'),response=$('.answer-area'),heading=$('.nx-practice-heading');
  if(!card||!content||!sheet||!response)return;
  card.classList.add('paper-card');card.dataset.question=q.id;
  content.classList.add('paper-solving');content.removeAttribute('tabindex');content.setAttribute('aria-label','Question paper and answer');
  const image=$('#q-image');if(image)image.setAttribute('draggable','false');
  // Keep context to a single line, without duplicating a large title or progress card.
  const timer=heading.querySelector('.timer');
  heading.innerHTML=`<button class="paper-exit" data-nx-back-library aria-label="Save and return to question library" title="Question library">${nxIcon('back')}</button><div class="paper-context"><strong>${esc(subjectName(q.subject))}</strong><span>${esc(TRACKS[q.exam].short)} · ${q.chapterOrder}. ${esc(q.chapter)} · ${esc(q.topic)}</span></div><span class="paper-completion" title="Answered in this path">${s.ids.filter(id=>C.hasAnswer(s.answers[id])).length}/${s.ids.length} answered</span>`;
  if(timer)heading.append(timer);
  const toolbar=$('.q-toolbar'),tools=toolbar.querySelector('.q-tools');
  tools.querySelector('[data-studio-map]')?.remove();
  // Calculator already has a permanent one-click control in the small top bar.
  tools.querySelector('[data-action="calculator"]')?.remove();
  const fit=document.createElement('div');fit.className='paper-fit';fit.setAttribute('role','group');fit.setAttribute('aria-label','Question image size');
  fit.innerHTML='<button data-paper-fit="fit" title="Show the complete question and printed options" aria-pressed="true">Fit page</button><button data-paper-fit="read" title="Larger text with scrolling inside the question only" aria-pressed="false">Read size</button>';
  tools.prepend(fit);
  tools.insertAdjacentHTML('beforeend',paperButton('map','Map','subjects')+paperButton('notes','Notes','test')+paperButton('tools','Tools','settings'));
  const drawer=document.createElement('aside');drawer.id='paper-drawer';drawer.className='paper-drawer';drawer.hidden=true;drawer.setAttribute('role','dialog');drawer.setAttribute('aria-modal','true');drawer.setAttribute('aria-labelledby','paper-panel-title');
  drawer.innerHTML=`<div class="paper-drawer-head"><h2 id="paper-panel-title">Practice tools</h2><button id="paper-close" data-paper-close aria-label="Close practice panel">×</button></div><nav class="paper-panel-tabs" aria-label="Practice panels">${Object.entries(paperPanels).filter(([name])=>name!=='solution'||s.mode!=='exam').map(([name,title])=>`<button data-paper-panel="${name}" aria-label="Open ${title.toLowerCase()}" aria-expanded="false">${({map:'Map',notes:'Notes',solution:'Solution',tools:'Tools',details:'Details'})[name]}</button>`).join('')}</nav><div class="paper-drawer-body">${Object.keys(paperPanels).map(name=>`<section data-paper-slot="${name}" hidden></section>`).join('')}</div>`;
  $('#main').append(drawer);
  const backdrop=document.createElement('button');backdrop.id='paper-backdrop';backdrop.className='paper-backdrop';backdrop.hidden=true;backdrop.tabIndex=-1;backdrop.setAttribute('aria-label','Close practice panel');backdrop.setAttribute('data-paper-close','');$('#main').append(backdrop);
  function move(selector,name){const node=$(selector);if(node)drawer.querySelector(`[data-paper-slot="${name}"]`).append(node);return node;}
  move('.nx-navigator','map');move('.nx-session-tools','tools');move('.nx-shortcuts','tools');
  const notes=move('.notes','notes');if(notes)notes.open=true;
  move('.confidence-strip','tools');move('.nx-source','details');move('.source-appearances','details');
  const memory=move('.nx-memory','details');if(memory)memory.open=true;
  move('.feedback','solution');
  const solution=drawer.querySelector('[data-paper-slot="solution"]');
  if(!solution.children.length&&s.mode!=='exam')solution.innerHTML='<p class="paper-panel-hint">Check your response or open the answer reference when you are ready.</p><button data-action="show-answer" class="primary">Show answer reference</button>';
  // The complete scan and essential answer controls share the permanent solving surface.
  content.replaceChildren(sheet,response);
  const summary=studioSummary(q);if(summary){const holder=document.createElement('div');holder.innerHTML=summary;const banner=holder.firstElementChild;banner.classList.add('paper-result');banner.querySelector('small')?.remove();const label=banner.querySelector('strong');if(label&&banner.classList.contains('wrong'))label.textContent='Incorrect answer';banner.insertAdjacentHTML('beforeend','<button data-paper-panel="solution" aria-label="Open answer and solution">Review solution →</button>');card.insertBefore(banner,content);}
  response.classList.add('paper-response');
  if(q.type==='WRITTEN')response.classList.add('paper-written');
  response.querySelectorAll('.option').forEach(b=>{b.setAttribute('aria-label','Option '+b.dataset.option);});
  const keypad=response.querySelector('.keypad');if(keypad){keypad.hidden=true;keypad.id='paper-keypad';response.querySelector('.answer-label').insertAdjacentHTML('beforeend','<button data-paper-keypad aria-expanded="false" aria-controls="paper-keypad">Keypad</button>');}
  const actionsBar=$('.q-actions');actionsBar.classList.add('paper-actions');
  const clear=actionsBar.querySelector('[data-action="clear-answer"]');if(clear){clear.textContent='Clear';clear.setAttribute('aria-label','Clear response');}
  const flag=actionsBar.querySelector('[data-action="flag"]');if(flag){flag.innerHTML=nxIcon('review')+'<span>Review</span>';flag.setAttribute('aria-label',state.flags[q.id]?'Remove review mark':'Mark for review');flag.setAttribute('aria-pressed',String(!!state.flags[q.id]));}
  const reference=actionsBar.querySelector('[data-action="show-answer"]');if(reference)reference.textContent='Solution';
  const next=actionsBar.querySelector('[data-action="next"]');if(next){next.classList.add('primary');next.setAttribute('aria-label',next.textContent);next.textContent=s.index===s.ids.length-1?'Finish path':'Next →';}
  const check=actionsBar.querySelector('[data-action="check"]');if(check){check.classList.remove('primary');check.classList.add('paper-check');}
  $('.session-side')?.remove();
  const menu=$('#nx-menu-toggle');if(menu){menu.setAttribute('aria-label','Open workspace menu');menu.title='Workspace menu';}
  nxSyncMenu();paperSetFit(paperUI.fit);paperPanel(paperUI.panel,null,false);
}
nexusAfterRender=function(){paperOldAfterRender();paperEnhance();};
render=function(){
  const old=$('#question-sheet'),id=$('.paper-card')?.dataset.question;if(old&&id)paperUI.scroll.set(id,old.scrollTop);
  paperOldRender();
  const sheet=$('#question-sheet'),newId=$('.paper-card')?.dataset.question;if(!sheet||!newId)return;
  const restore=()=>{if(sheet.isConnected&&!paperUI.fit)sheet.scrollTop=paperUI.scroll.get(newId)||0;};restore();$('#q-image')?.addEventListener('load',restore,{once:true});
};
actions['show-answer']=()=>{if(!paperActive()||state.session.mode==='exam')return;revealed.add(currentQ().id);paperUI.panel='solution';render();$('#paper-close')?.focus();};
actions.zoom=()=>{
  if(!paperActive()){paperOldZoom();return;}
  const source=$('#q-image');if(!source?.naturalWidth){toast('The question image is still loading.');return;}
  showModal('Original question screenshot','<div class="paper-zoom" id="paper-zoom"></div>');
  const img=document.createElement('img');img.src=source.src;img.alt=source.alt;$('#paper-zoom').append(img);
};
document.addEventListener('click',e=>{
  const b=e.target.closest('button');if(!b||!paperActive())return;
  if(b.dataset.paperPanel){const name=b.dataset.paperPanel;paperPanel(paperUI.panel===name?null:name,b);}
  if(b.hasAttribute('data-paper-close'))paperPanel(null);
  if(b.dataset.paperFit)paperSetFit(b.dataset.paperFit==='fit');
  if(b.hasAttribute('data-paper-keypad')){const keypad=$('#paper-keypad');keypad.hidden=!keypad.hidden;b.setAttribute('aria-expanded',String(!keypad.hidden));}
  if(paperUI.panel==='map'&&(b.hasAttribute('data-jump')||b.hasAttribute('data-studio-go')||b.hasAttribute('data-studio-next')))paperPanel(null);
});
document.addEventListener('click',e=>{
  if(!paperActive()||!e.target.closest('#theme-toggle'))return;
  e.preventDefault();e.stopImmediatePropagation();paperUI.dark=!paperUI.dark;
  try{localStorage.setItem('pyq-paper-theme',paperUI.dark?'dark':'light');}catch{}
  paperSetTheme();
},true);
document.addEventListener('keydown',e=>{
  if(!paperActive()||modal.open)return;
  if(paperUI.panel){
    if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();paperPanel(null);return;}
    if(e.key==='Tab'){
      const els=[...$('#paper-drawer').querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),summary,a[href]')].filter(x=>x.getClientRects().length);
      const first=els[0],last=els.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}
    }
    // Navigation shortcuts must not fire behind an open panel.
    if(['ArrowLeft','ArrowRight','1','2','3','4','r','R'].includes(e.key)&&!['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName))e.stopImmediatePropagation();
    return;
  }
  if(e.ctrlKey||e.metaKey||e.altKey||['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName))return;
  if(e.key.toLowerCase()==='f'){e.preventDefault();paperSetFit(!paperUI.fit);}
  if(e.key.toLowerCase()==='m'){e.preventDefault();paperPanel('map',$('[data-paper-panel="map"]'));}
},true);
render();
