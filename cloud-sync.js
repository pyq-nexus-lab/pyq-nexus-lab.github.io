(function(root){
  'use strict';
  const core=root.NexusSyncCore,OWNER='pyq-nexus-workspace-owner',PREFIX='pyq-nexus-sync:';
  let engine=null,owner=null,timer=null,retry=1000,applying=false,starting=false,status={kind:'guest',message:'Saved on this device'},firstApply=false;
  const originalSave=save;
  const read=key=>{try{return JSON.parse(localStorage.getItem(key)||'null');}catch{return null;}};
  const write=(key,value)=>{try{localStorage.setItem(key,JSON.stringify(value));return true;}catch{return false;}};
  const blank=()=>({answers:{},flags:{},bookmarks:{},notes:{},attempts:[],overrides:{},drawings:{},theme:state.theme,session:null,subject:'all',planner:[],learning:{},preferences:core.clone(state.preferences),learningPreferences:core.clone(state.learningPreferences)});
  function paint(){
    let badge=document.querySelector('#nexus-cloud-status');
    if(!badge){const host=document.querySelector('.studio-account-actions');if(host){badge=document.createElement('button');badge.id='nexus-cloud-status';badge.type='button';badge.onclick=()=>root.PYQAccount?.open();host.prepend(badge);}}
    const offline=typeof navigator!=='undefined'&&!navigator.onLine;
    const label=status.kind==='error'?(offline?'Offline · saved locally':'Sync pending'):status.kind==='saved'?'Cloud saved':status.kind==='guest'?'Device only':status.kind==='pending'?'Saving…':'Syncing…';
    if(badge){badge.hidden=!owner;badge.textContent=label;badge.dataset.status=status.kind;badge.title=status.message;badge.setAttribute('aria-label',label+'. '+status.message);}
    const detail=document.querySelector('#nexus-sync-detail');if(detail){detail.textContent=status.message+(status.lastSynced?' · Last cloud save: '+new Date(status.lastSynced).toLocaleString(): '');detail.dataset.status=status.kind;}
  }
  function report(next){status=next;paint();if(next.kind==='saved')retry=1000;}
  function persist(cache){
    if(!owner)return;
    if(!write(PREFIX+owner,cache))report({kind:'error',message:'Device storage is nearly full. Keep this tab open until cloud saving finishes and download a backup.'});
  }
  function apply(next){
    const theme=state.theme;
    if(firstApply&&core.hasProgress(state)){write('pyq-nexus-before-sync:'+owner,{format:'pyq-lab-backup',version:1,exportedAt:new Date().toISOString(),state:core.clone(state)});firstApply=false;}
    applying=true;
    try{
      state=PYQDedup.migrate({...next,theme,subject:next.subject||'all',planner:next.planner||[],learning:next.learning||{},preferences:PYQInsights.preferences(next.preferences),learningPreferences:PYQLearning.preferences(next.learningPreferences)},LIBRARY);
      state=PYQCurriculum.migrateSession(state,BANK,{revision:window.PYQ_CURRICULUM_DATA.orderRevision||1,scope:state.session?.subjectScope||null});
      nxUpgradePractice();revealed.clear();originalSave();
      if(state.session&&!state.session.finished){view='practice';state.subject=state.session.subjectScope||'all';}
      else if(view==='practice'||view==='results')view='dashboard';
      render();
    }finally{applying=false;}
  }
  async function run(){
    clearTimeout(timer);timer=null;if(!engine)return false;
    const current=engine,ok=await current.flush();if(current!==engine)return false;
    if(!ok){timer=setTimeout(run,retry);retry=Math.min(retry*2,30000);}return ok;
  }
  function schedule(immediate=false){clearTimeout(timer);timer=setTimeout(run,immediate?0:450);}
  save=function(){
    originalSave();if(applying||!engine)return;
    const before=engine.snapshot();if(engine.record(state))schedule(core.urgent(before,state));
  };
  function disconnect(){
    clearTimeout(timer);timer=null;engine?.stop();engine=null;owner=null;starting=false;
    report({kind:'guest',message:'Saved on this device. Sign in for automatic cloud sync.'});
  }
  function connect(client,user){
    if(!user||!root.PYQ_ACCOUNT_CONFIG?.cloudBackups){disconnect();return Promise.resolve(false);}
    if(owner===user.id&&engine){paint();return Promise.resolve(true);}
    disconnect();owner=user.id;starting=true;firstApply=true;
    const id=owner,previousOwner=read(OWNER),cache=read(PREFIX+id);
    let local=core.clone(state);
    if(previousOwner&&previousOwner!==id)local=cache?.local||blank();
    if(previousOwner!==id&&previousOwner)apply(local);
    write(OWNER,id);
    function allowed(){if(owner!==id)throw Error('Account changed. This save was cancelled.');}
    const table=()=>client.from('nexus_backups');
    const readRemote=async()=>{
      allowed();const result=await table().select('payload,revision,updated_at').eq('user_id',id).maybeSingle();
      if(result.error)throw result.error;allowed();return result.data;
    };
    const transport={read:readRemote,async write(payload,revision){
      allowed();
      if(root.PYQ_SYNC_READ_ONLY)throw Error('This isolated verification view cannot upload progress.');
      let result;
      if(revision===null)result=await table().insert({user_id:id,payload}).select('revision,updated_at').single();
      else result=await table().update({payload}).eq('user_id',id).eq('revision',revision).select('revision,updated_at').maybeSingle();
      allowed();
      if(result.error&&result.error.code!=='23505')throw result.error;
      if(result.error?.code==='23505'||!result.data)return {conflict:true,row:await readRemote()};
      return {row:result.data};
    }};
    engine=core.create({local,cache:cache?.version===1?cache:null,transport,persist,apply,status:report,validate:p=>core.validate(p,id=>LIBRARY.original.has(id))});
    // Keep a durable pending copy before the first network request.
    persist(engine.cache());
    return run().finally(()=>{if(owner===id)starting=false;});
  }
  root.addEventListener('online',()=>{retry=1000;if(engine)schedule(true);});
  root.addEventListener('offline',()=>{if(engine)report({kind:'error',message:'Offline. Progress is saved on this device and will sync when you reconnect.'});});
  root.addEventListener('pagehide',()=>{if(engine){save();run();}});
  document.addEventListener('visibilitychange',()=>{if(engine){if(document.visibilityState==='hidden'){save();run();}else schedule(true);}});
  // Other tabs update this workspace without treating old timer-only saves as new progress.
  root.addEventListener('storage',e=>{
    if(root.PYQ_SYNC_READ_ONLY)return;
    if(e.key===STORAGE&&e.newValue&&engine&&read(OWNER)===owner){
      try{const next=core.validate({format:'pyq-lab-backup',version:1,state:JSON.parse(e.newValue)},id=>LIBRARY.original.has(id));
        if(!core.equal(next,state)){apply(next);if(engine.record(next))schedule(true);}
      }catch{/* A malformed external storage event never overwrites this workspace. */}
    }
  });
  // Resume from another device on return; no cloud writes for timer ticks alone.
  setInterval(()=>{if(engine&&!starting&&document.visibilityState==='visible'&&!['INPUT','TEXTAREA'].includes(document.activeElement?.tagName))schedule(true);},30000);
  root.PYQSync={connect,disconnect,syncNow:run,paint,status:()=>({...status}),isDirty:()=>!!engine?.dirty()};
})(window);
