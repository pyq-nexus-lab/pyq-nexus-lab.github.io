(function(root){
  'use strict';
  const object=v=>!!v&&typeof v==='object'&&!Array.isArray(v);
  const clone=v=>v===undefined?undefined:JSON.parse(JSON.stringify(v));
  const forbidden=new Set(['__proto__','prototype','constructor']);
  function stable(value,path=[]){
    if(Array.isArray(value))return value.map(v=>stable(v,path.concat('*')));
    if(!object(value))return value;
    const out={};for(const k of Object.keys(value).sort()){
      if(forbidden.has(k)||k==='updatedAt'||(path.length===0&&['theme','subject','lastSubject'].includes(k))||
        (path[0]==='session'&&k==='times')||(path[0]==='orderedPractice'&&k==='seconds'))continue;
      out[k]=stable(value[k],path.concat(k));
    }return out;
  }
  const fingerprint=v=>JSON.stringify(stable(v));
  const equal=(a,b)=>fingerprint(a)===fingerprint(b);
  function merge(base,local,remote,path=[]){
    const same=(a,b)=>JSON.stringify(stable(a,path))===JSON.stringify(stable(b,path));
    if(same(local,base))return clone(remote);
    if(same(remote,base)||same(local,remote))return clone(local);
    if(path.length===1&&path[0]==='session'){
      // A different path/test is one coherent session, not a mixture of two ID lists.
      if(!local||!remote||local.start!==remote.start||!equal(local.ids,remote.ids))return clone(local);
    }
    if(path.length===3&&path[0]==='orderedPractice'&&path[1]==='work')return clone(local);
    if(path.length===1&&['attempts','planner'].includes(path[0])&&Array.isArray(local)&&Array.isArray(remote)){
      const key=v=>path[0]==='planner'?v.id:JSON.stringify([v.id,v.at,v.session]);
      const map=rows=>Object.fromEntries((rows||[]).map(v=>[key(v),v]));
      const result=merge(map(base),map(local),map(remote),path.concat('entries'));
      return Object.values(result||{}).sort((a,b)=>path[0]==='attempts'?(a.at||0)-(b.at||0):0);
    }
    if(object(local)&&object(remote)){
      const out={};for(const key of new Set([...Object.keys(base||{}),...Object.keys(remote),...Object.keys(local)])){
        if(forbidden.has(key))continue;
        const value=merge(base?.[key],local[key],remote[key],path.concat(key));if(value!==undefined)out[key]=value;
      }
      if(path.length===1&&path[0]==='session'){
        const fields=['answers','submitted','confidence','attemptSessions'];
        const response=(s,id)=>Object.fromEntries(fields.map(k=>[k,s?.[k]?.[id]]));
        for(const id of new Set([...Object.keys(local.answers||{}),...Object.keys(remote.answers||{})])){
          if(!equal(response(local,id),response(base,id))&&!equal(response(remote,id),response(base,id))){
            for(const k of fields){out[k]=out[k]||{};if(local[k]?.[id]===undefined)delete out[k][id];else out[k][id]=clone(local[k][id]);}
          }
        }
      }
      return out;
    }
    return clone(local); // Only competing edits to the same field use the current device's edit.
  }
  function validate(payload,hasId=()=>true){
    const s=payload?.state;if(!['pyq-lab-backup','som-lab-backup'].includes(payload?.format)||payload.version!==1||!object(s))throw Error('The cloud progress format is not supported. Your device copy is safe.');
    if(!Array.isArray(s.attempts)||s.attempts.length>200000||['answers','flags','bookmarks','notes','overrides','drawings'].some(k=>!object(s[k])))throw Error('Cloud progress failed validation. Your device copy is safe.');
    const unsafe=v=>object(v)?Object.keys(v).some(k=>forbidden.has(k)||unsafe(v[k])):Array.isArray(v)&&v.some(unsafe);
    if(unsafe(s))throw Error('Cloud progress contains unsupported fields.');
    if(s.attempts.some(a=>!hasId(a.id)||!Number.isFinite(a.at)||(a.score!==null&&!Number.isFinite(a.score))||!['correct','wrong','skipped','ungraded','manual'].includes(a.status)||(a.selfScore!==undefined&&!Number.isFinite(a.selfScore))))throw Error('Cloud attempt history could not be validated.');
    const q=s.session;if(q&&(!Array.isArray(q.ids)||!q.ids.length||q.ids.length>100000||q.ids.some(id=>!hasId(id))||!Number.isInteger(q.index)||q.index<0||q.index>=q.ids.length||!object(q.answers)||!object(q.times)||!['practice','exam'].includes(q.mode)||!Number.isFinite(q.start)||(q.mode==='exam'&&!Number.isFinite(q.deadline))))throw Error('Cloud practice position could not be validated.');
    for(const [id,o] of Object.entries(s.overrides)){
      if(!hasId(id)||!object(o)||!['MCQ','MSQ','NAT','TEXT','WRITTEN'].includes(o.type)||!Number.isFinite(o.marks)||o.marks<=0)throw Error('Cloud answer settings could not be validated.');
      if(o.key&&o.type==='NAT'&&(!Number.isFinite(o.key.min)||!Number.isFinite(o.key.max)||o.key.min>o.key.max))throw Error('Invalid numeric key in cloud progress.');
      if(o.key&&['MCQ','MSQ'].includes(o.type)&&(!Array.isArray(o.key.options)||!o.key.options.length||o.key.options.some(x=>!['A','B','C','D'].includes(x))))throw Error('Invalid choice key in cloud progress.');
      if(o.key&&o.type==='TEXT'&&(!Array.isArray(o.key.acceptedText)||!o.key.acceptedText.length||o.key.acceptedText.some(x=>typeof x!=='string'||!x.trim()||x.length>500)))throw Error('Invalid text key in cloud progress.');
    }
    if(s.planner&&(!Array.isArray(s.planner)||s.planner.length>5000||s.planner.some(t=>!t||typeof t.id!=='string'||typeof t.title!=='string'||t.title.length>100||!/^\d{4}-\d{2}-\d{2}$/.test(t.date)||!Number.isFinite(t.minutes)||t.minutes<5||t.minutes>480)))throw Error('Cloud study plan could not be validated.');
    if(s.orderedPractice&&(!object(s.orderedPractice)||!object(s.orderedPractice.paths)||!object(s.orderedPractice.work)))throw Error('Cloud learning path could not be validated.');
    return clone(s);
  }
  const hasProgress=s=>!!s&&(!!s.session||(s.attempts||[]).length>0||['answers','notes','flags','bookmarks','drawings'].some(k=>Object.keys(s[k]||{}).length>0));
  function urgent(a,b){return a?.session?.index!==b?.session?.index||a?.session?.start!==b?.session?.start||!equal(a?.session?.submitted,b?.session?.submitted)||(a?.attempts?.length||0)!==(b?.attempts?.length||0);}
  function create(options){
    let local=clone(options.local),base=clone(options.cache?.base),revision=options.cache?.revision??null;
    const initialLocal=clone(local);let editedDuringBoot=false;
    let initialized=!!options.cache?.initialized,active=true,running=null,lastSynced=options.cache?.lastSynced||null;
    const valid=p=>(options.validate||validate)(p);
    const emit=(kind,message)=>options.status?.({kind,message,lastSynced,dirty:!equal(local,base)});
    const persist=()=>options.persist?.({version:1,base:clone(base),local:clone(local),revision,initialized,lastSynced});
    function record(next){if(!active)return false;const changed=!equal(local,next);local=clone(next);if(changed){if(!initialized)editedDuringBoot=true;persist();emit('pending','Saved on this device · syncing…');}return changed;}
    function absorb(row){
      const remote=row?valid(row.payload):undefined;let next;
      if(!initialized){
        // Existing manual backups are upgraded without discarding work done since that backup.
        if(remote&&row.payload.sync?.version===1)next=editedDuringBoot?merge(initialLocal,local,remote):remote;
        else next=remote?(hasProgress(local)?merge({},local,remote):remote):local;
      }else next=remote?merge(base,local,remote):local;
      base=clone(remote);revision=row?.revision??null;lastSynced=row?.updated_at||lastSynced;initialized=true;
      if(!equal(next,local)){local=clone(next);options.apply?.(clone(local));}else local=clone(next);
      persist();
    }
    async function flush(){
      if(!active)return false;if(running)return running;
      running=(async()=>{
        emit('syncing',initialized?'Saving progress…':'Restoring your latest progress…');
        const row=await options.transport.read();if(!active)return false;absorb(row);
        for(let tries=0;active&&tries<5;tries++){
          if(equal(local,base)){persist();emit('saved','Cloud saved');return true;}
          const sent=clone(local),payload={format:'pyq-lab-backup',version:1,exportedAt:new Date().toISOString(),sync:{version:1},state:sent};
          valid(payload);
          if(new TextEncoder().encode(JSON.stringify(payload)).length>14000000)throw Error('Progress exceeds the cloud size limit. Download a device backup.');
          const result=await options.transport.write(payload,revision);if(!active)return false;
          if(result.conflict){absorb(result.row);continue;}
          base=sent;revision=result.row.revision;lastSynced=result.row.updated_at;persist();
          // If another answer arrived while uploading, send it next without losing it.
        }
        if(active)throw Error('Another device is saving too. Your changes are queued for retry.');return false;
      })().catch(error=>{if(active){persist();emit('error',error.message||'Connection unavailable. Progress is saved on this device.');}return false;}).finally(()=>{running=null;});
      return running;
    }
    return {record,flush,stop(){active=false;},snapshot:()=>clone(local),cache:()=>({version:1,base:clone(base),local:clone(local),revision,initialized,lastSynced}),dirty:()=>!equal(local,base)};
  }
  const api={clone,equal,fingerprint,merge,validate,hasProgress,urgent,create};
  if(typeof module!=='undefined')module.exports=api;root.NexusSyncCore=api;
})(typeof window!=='undefined'?window:globalThis);
