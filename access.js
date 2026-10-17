(function(root){
  'use strict';
  let permitted=false,phase='checking',message='Checking your sign-in…',runtime=null,loaded=0;
  const $=selector=>document.querySelector(selector);
  function paint(){
    document.documentElement.dataset.access=permitted?'signed-in':'locked';
    const gate=$('#access-gate');if(gate)gate.hidden=permitted;
    const status=$('#access-status');if(status){status.textContent=message;status.dataset.phase=phase;}
    const retry=$('#access-retry');if(retry)retry.hidden=phase!=='error';
    document.querySelectorAll('#access-gate [data-account-mode]').forEach(b=>b.disabled=phase==='checking');
  }
  function lock(text='Log in or create an account to open your workspace.',checking=false){
    permitted=false;phase=checking?'checking':'signed-out';message=text;
    const main=$('#main');if(main)main.replaceChildren();
    const dialog=$('#modal');if(dialog?.open&&!dialog.querySelector('.studio-auth'))dialog.close();
    paint();
  }
  function fail(text){lock(text);phase='error';paint();}
  async function loadRuntime(){
    if(runtime)return runtime;
    runtime=(async()=>{
      const scripts=[...document.querySelectorAll('script[data-runtime]')];
      // Fetch in parallel after authentication; execute in the established order below.
      for(const node of scripts.slice(loaded)){
        if(node.dataset.preloaded)continue;
        const hint=document.createElement('link');hint.rel='preload';hint.as='script';hint.href=node.dataset.runtime;
        document.head.append(hint);node.dataset.preloaded='true';
      }
      while(loaded<scripts.length){
        const source=scripts[loaded].dataset.runtime;
        await new Promise((resolve,reject)=>{
          const script=document.createElement('script');script.src=source;script.async=false;
          script.onload=resolve;script.onerror=()=>{script.remove();reject(Error('The workspace could not load. Check your connection and retry.'));};
          document.body.appendChild(script);
        });
        loaded++;
      }
    })().catch(error=>{runtime=null;throw error;});
    return runtime;
  }
  function unlock(){permitted=true;phase='signed-in';message='Signed in';paint();if(typeof root.render==='function')root.render();}
  function showModal(title,body){
    $('#modal-body').innerHTML=`<div class="modal-head"><h2 id="nx-modal-title">${title}</h2><button data-close aria-label="Close dialog">×</button></div>${body}`;
    const dialog=$('#modal');if(!dialog.open)dialog.showModal();
  }
  // Stop stale workspace controls and shortcuts immediately after sign-out.
  for(const event of ['click','input','change','submit','keydown'])document.addEventListener(event,e=>{
    if(permitted||e.target.closest?.('#access-gate')||e.target.closest?.('#modal .studio-auth')||e.target.closest?.('#modal [data-close]'))return;
    e.preventDefault();e.stopImmediatePropagation();
  },true);
  document.addEventListener('click',e=>{if(e.target.closest?.('[data-close]'))$('#modal')?.close();});
  root.PYQAccess={allowed:()=>permitted,paint,lock,fail,loadRuntime,unlock,modal:showModal};
})(window);
