(function(root){
 'use strict';
 const clone=x=>x===undefined?undefined:JSON.parse(JSON.stringify(x));
 const answered=x=>Array.isArray(x)?x.length>0:x!==null&&x!==undefined&&String(x).trim()!=='';
 function build(raw,data={groups:[],version:1}){
  const original=new Map(raw.map(q=>[q.id,q])),aliases=new Map(raw.map(q=>[q.id,q.id])),maps=new Map,groups=new Map,used=new Set;
  for(const group of data.groups||[]){
   if(!group.ids?.includes(group.id)||group.ids.length<2)throw Error('Invalid duplicate group');
   const first=original.get(group.id);if(!first)throw Error('Unknown canonical question');
   for(const id of group.ids){const q=original.get(id);if(!q||used.has(id)||q.subject!==first.subject||q.exam!==first.exam||q.type!==first.type)throw Error('Unsafe duplicate group');used.add(id);aliases.set(id,group.id);if(group.optionMaps?.[id]){const m=group.optionMaps[id];if(Object.keys(m).sort().join('')!=='ABCD'||Object.values(m).sort().join('')!=='ABCD')throw Error('Invalid option translation');maps.set(id,m)}}
   groups.set(group.id,group.ids);
  }
  // Explicit subject corrections keep old saved IDs recoverable without showing
  // a second copy of a question in the wrong subject.
  for(const move of data.relocations||[]){
   const from=original.get(move.id),to=original.get(move.targetId);
   if(!from||!to||aliases.get(move.id)!==move.id||aliases.get(move.targetId)!==move.targetId||from.subject===to.subject||from.exam!==to.exam||from.type!==to.type)throw Error('Unsafe subject relocation');
   const targetMap=move.optionMap;
   if(targetMap&&(Object.keys(targetMap).sort().join('')!=='ABCD'||Object.values(targetMap).sort().join('')!=='ABCD'))throw Error('Invalid relocation option translation');
   for(const [id,canonical]of aliases)if(canonical===move.id){
    const prior=maps.get(id);if(targetMap||prior)maps.set(id,Object.fromEntries('ABCD'.split('').map(k=>[k,targetMap?.[prior?.[k]||k]||prior?.[k]||k])));
    aliases.set(id,move.targetId);
   }
  }
  const resolve=id=>aliases.get(id)||id;
  const translate=(id,answer)=>{const m=maps.get(id);return !m?answer:Array.isArray(answer)?answer.map(v=>m[v]||v):m[answer]||answer};
  const translateKey=(id,key)=>{if(!key)return null;const out=clone(key);if(out.options)out.options=translate(id,out.options);if(out.optionSets)out.optionSets=out.optionSets.map(s=>translate(id,s));return out};
  const signature=key=>key?.kind==='all'?'all':key?.acceptedText?JSON.stringify(key.acceptedText.slice().sort()):key?.options?JSON.stringify((key.optionSets||[key.options]).map(s=>s.slice().sort()).sort()):JSON.stringify(key?.ranges||[[key?.min,key?.max]]);
  const bank=raw.filter(q=>resolve(q.id)===q.id).map(q=>{
   const ids=groups.get(q.id)||[q.id],sources=ids.map(id=>original.get(id));
   const occurrences=sources.map(s=>({id:s.id,title:s.title,source:s.source,year:s.year,number:s.number,sourcePage:s.sourcePage,chapter:s.chapter,archive:!!s.archive,pack:s.pack,assetId:s.assetId,optionMap:maps.get(s.id)||null}));
   const keys=sources.filter(s=>s.key).map(s=>({id:s.id,key:translateKey(s.id,s.key),keyStatus:s.keyStatus,keySource:s.keySource||s.source,marks:s.marks,answerReference:s.answerReference,explanation:s.explanation,referenceAnswer:s.referenceAnswer,answerIssue:s.answerIssue}));
   const priority=k=>k.keyStatus==='official'?3:k.keyStatus==='solved'?2:1,rank=Math.max(0,...keys.map(priority)),candidates=keys.filter(k=>priority(k)===rank);
   const conflict=new Set(candidates.map(k=>signature(k.key))).size>1;
   const chosen=candidates.find(k=>k.id===q.id)||candidates[0];
   const inheritedMarks=!Number.isFinite(q.marks)&&Number.isFinite(chosen?.marks)&&chosen.marks>0?{marks:chosen.marks,marksSource:chosen.keySource}:{};
   const reference=chosen?Object.fromEntries(['answerReference','explanation','referenceAnswer','answerIssue'].filter(k=>chosen[k]!==undefined).map(k=>[k,chosen[k]])):{};
   return {...q,...inheritedMarks,aliases:ids,occurrences,chapters:[...new Set(sources.map(s=>s.chapter))],keyReferences:keys,keyConflict:conflict,...(q.answerIssue?{key:null,keyStatus:'erratum'}:conflict?{key:null,keyStatus:'missing',keySource:'Conflicting source keys — verification needed'}:chosen?{...reference,key:chosen.key,keyStatus:chosen.keyStatus,keySource:chosen.keySource}:{} )};
  });
  function matches(q,filter={}){return (q.occurrences||[q]).some(o=>(filter.year===undefined||filter.year==='all'||String(o.year)===String(filter.year))&&(filter.source===undefined||filter.source==='all'||filter.source==='archive'&&o.archive||filter.source==='original'&&!o.archive)&&(filter.chapter===undefined||filter.chapter==='all'||o.chapter===filter.chapter))}
  return {bank,original,aliases,maps,resolve,translate,translateKey,matches,version:data.version||1,stats:data.stats||{rawEntries:raw.length,uniqueQuestions:bank.length,copiesConsolidated:raw.length-bank.length}};
 }
 function migrate(input,lib){
  const s=clone(input),recovery=s.migrationRecovery||{items:[],sessions:[]};let changed=false;
  const keep=(kind,id,value)=>{recovery.items.push({kind,sourceId:id,canonicalId:lib.resolve(id),value:clone(value)});changed=true};
  s.attempts=(s.attempts||[]).map(a=>{const id=lib.resolve(a.id);if(id===a.id)return a;changed=true;return {...a,id,sourceId:a.sourceId||a.id,sourceAnswer:a.sourceAnswer??clone(a.answer),answer:lib.translate(a.id,a.answer)}});
  const last=new Map;for(const a of s.attempts){if(!last.has(a.id)||a.at>=last.get(a.id).at)last.set(a.id,a)}
  for(const kind of ['answers','flags','bookmarks','notes','drawings','overrides','learning']){
   const entries=Object.entries(s[kind]||{}),grouped=new Map;
   for(const [id,value]of entries){const key=lib.resolve(id);if(!grouped.has(key))grouped.set(key,[]);grouped.get(key).push({id,value});if(key!==id)keep(kind,id,value)}
   const out={};
   for(const [id,rows]of grouped){
    const primary=rows.find(r=>r.id===id)||rows[0];
    if(kind==='flags'||kind==='bookmarks')out[id]=rows.some(r=>!!r.value);
    else if(kind==='notes'){const notes=[...new Set(rows.map(r=>String(r.value||'')).filter(Boolean))];out[id]=notes.length>1?rows.filter(r=>r.value).map(r=>`[${lib.original.get(r.id)?.title||r.id}]\n${r.value}`).join('\n\n'):notes[0]||''}
    else if(kind==='answers'){const latest=last.get(id);out[id]=latest?.answer??lib.translate(primary.id,primary.value)}
    else if(kind==='overrides'){
     const values=rows.map(r=>({...r.value,key:lib.translateKey(r.id,r.value.key)}));
     const selected=values[rows.indexOf(primary)];
     out[id]=new Set(values.map(v=>JSON.stringify(v))).size>1?{...selected,key:null,keyStatus:'missing',keySource:'Personal keys differ between copies — review preserved metadata'}:selected;
    }else out[id]=primary.value;
   }
   s[kind]=out;
  }
  const session=s.session;
  if(session?.ids?.some(id=>lib.resolve(id)!==id)){
   // Keep a complete recoverable copy before consolidating an in-progress navigator.
   recovery.sessions.push(clone(session));changed=true;
   const selected=session.ids[session.index],current=lib.resolve(selected),ids=[...new Set(session.ids.map(lib.resolve))],next={...session,ids,index:ids.indexOf(current)};
   for(const field of ['answers','times','visited','submitted','confidence']){
    const out={};for(const id of ids){const sources=session.ids.filter(old=>lib.resolve(old)===id),choice=sources.includes(selected)?selected:sources.includes(id)?id:sources.find(old=>answered(session.answers?.[old]))||sources[0];
     if(field==='times')out[id]=sources.reduce((n,old)=>n+(Number(session.times?.[old])||0),0);
     else if(field==='visited')out[id]=sources.some(old=>session.visited?.[old]);
     else if(field==='answers'){if(session.answers?.[choice]!==undefined)out[id]=lib.translate(choice,session.answers[choice])}
     else if(session[field]?.[choice]!==undefined)out[id]=session[field][choice];
    }next[field]=out;
   }s.session=next;
  }
  s.dedupVersion=lib.version;
  if(changed){recovery.at=new Date().toISOString();s.migrationRecovery=recovery}
  return s;
 }
 const api={build,migrate};root.PYQDedup=api;if(typeof module!=='undefined')module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
