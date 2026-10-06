'use strict';
function screenshotSourceLabel(source){
 if(!source.cropPanels?.length)return source.source+(source.sourcePage?' · PDF page '+source.sourcePage:'');
 const groups=new Map();for(const p of source.cropPanels){const file=p.file||source.source;if(!groups.has(file))groups.set(file,new Set);groups.get(file).add(p.page)}
 return [...groups].map(([file,pages])=>file+' · PDF '+(pages.size===1?'page ':'pages ')+[...pages].join(', ')).join(' · ')+(source.cropPanels.length>1?' · '+source.cropPanels.length+' source panels':'');
}
async function questionScreenshot(q){
 if(q.pack&&!(window.PYQ_IMAGES?.[q.assetId]||window.SOM_IMAGES?.[q.assetId])){
  if(!imagePacks[q.pack])imagePacks[q.pack]=new Promise((resolve,reject)=>{const script=document.createElement('script');script.src=q.pack;script.onload=resolve;script.onerror=()=>{delete imagePacks[q.pack];reject(Error('Screenshot bundle could not be loaded'))};document.head.append(script)});
  await imagePacks[q.pack];
 }
 return window.PYQ_IMAGES?.[q.assetId]||window.SOM_IMAGES?.[q.assetId]||q.imageUrl||'public/'+q.image;
}
async function previewScreenshot(id,sourceId){
 const q=qData(id),source=sourceId?LIBRARY.original.get(sourceId):q;if(!source)return;
 showModal('Question screenshot',`<div class="crop-preview-head"><strong>${esc(source.title)}</strong><small>${esc(subjectName(q.subject))} · ${esc(q.chapter)} · ${esc(q.topic)}</small></div>${q.occurrences.length>1?`<label class="crop-source-label">Source appearance<select id="crop-preview-source" aria-label="Screenshot source appearance">${q.occurrences.map(o=>`<option value="${esc(o.id)}" ${o.id===source.id?'selected':''}>${esc(o.title)} · ${o.archive?'Book archive':'Original screenshot'}</option>`).join('')}</select></label>`:''}<div class="crop-preview-sheet"><span id="crop-preview-loading">Loading full question…</span><img id="crop-preview-image" alt="${esc(source.title)} — complete source screenshot" hidden></div><p class="crop-preview-source">${esc(screenshotSourceLabel(source))}</p><div class="form-actions"><button id="crop-preview-size" aria-pressed="false">View at original size</button><button data-close>Close preview</button></div>`);
 $('#crop-preview-source')?.addEventListener('change',e=>previewScreenshot(id,e.target.value));
 const image=$('#crop-preview-image'),loading=$('#crop-preview-loading');
 $('#crop-preview-size').onclick=e=>{const full=image.parentElement.classList.toggle('original-size');e.target.textContent=full?'Fit to screen':'View at original size';e.target.setAttribute('aria-pressed',String(full))};
 try{const src=await questionScreenshot(source);if(!image.isConnected)return;image.onload=()=>{image.hidden=false;loading.hidden=true};image.onerror=()=>{loading.textContent='Screenshot could not be loaded. Reopen the preview to retry.'};image.src=src;if(image.complete&&image.naturalWidth){image.hidden=false;loading.hidden=true}}
 catch{if(loading.isConnected)loading.textContent='Screenshot could not be loaded. Reopen the preview to retry.'}
}
document.addEventListener('click',e=>{const b=e.target.closest('[data-preview-question]');if(b)previewScreenshot(b.dataset.previewQuestion)});
