(function(root){
 'use strict';
 const DAY=86400000,defaults={autoSchedule:true,showConfidence:true,showLearning:true,uncertainFirst:true,dueLimit:20,maxInterval:120};
 function preferences(input={}){const p={...defaults};for(const k of ['autoSchedule','showConfidence','showLearning','uncertainFirst'])if(typeof input[k]==='boolean')p[k]=input[k];for(const [k,min,max]of [['dueLimit',1,100],['maxInterval',7,365]])if(Number.isFinite(input[k]))p[k]=Math.max(min,Math.min(max,Math.round(input[k])));return p}
 function dayKey(at){const d=new Date(at);return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`}
 function nextDay(at,n){const d=new Date(at);d.setDate(d.getDate()+n);d.setHours(8,0,0,0);return d.getTime()}
 function rate(old={},rating,now=Date.now(),max=120){
  old=old||{};
  if(!['again','hard','good','easy'].includes(rating))throw Error('Unknown revision rating');
  const sameDay=old.reviewedAt&&dayKey(old.reviewedAt)===dayKey(now),base=sameDay?old.dayBase||{interval:0,streak:0}:{interval:old.interval||0,streak:old.streak||0};
  const interval=Math.min(max,rating==='again'?1:rating==='hard'?Math.max(1,Math.ceil(base.interval*.6)):rating==='easy'?Math.max(7,Math.ceil(base.interval*3)):Math.max(3,Math.ceil(base.interval*2)));
  return {...old,interval,dueAt:nextDay(now,interval),reviewedAt:now,rating,streak:rating==='again'?0:base.streak+1,reviews:(old.reviews||0)+(sameDay?0:1),dayBase:base};
 }
 function autoSchedule(old,attempt,prefs={}){const p=preferences(prefs);if(!p.autoSchedule||!['correct','wrong'].includes(attempt.status))return old||null;return rate(old,attempt.status==='wrong'?'again':attempt.confidence==='unsure'?'hard':'good',attempt.at,p.maxInterval)}
 function latest(attempts){const m=new Map;for(const a of attempts)if(!m.has(a.id)||a.at>=m.get(a.id).at)m.set(a.id,a);return m}
 function profile(id,attempts,schedule,now=Date.now()){
  const rows=attempts.filter(a=>a.id===id&&a.answer!==null&&a.answer!==undefined&&String(a.answer).trim()!==''),last=latest(rows).get(id),days=new Map;
  for(const a of rows.filter(a=>['correct','wrong'].includes(a.status)).sort((a,b)=>a.at-b.at))days.set(dayKey(a.at),a);
  let streak=0;for(const a of [...days.values()].reverse()){if(a.status!=='correct')break;streak++}
  const secure=last?.status==='correct'&&last.confidence==='certain'&&streak>=3&&(schedule?.interval||0)>=7;
  return {count:rows.length,last,streak,secure,uncertain:last?.status==='correct'&&last.confidence==='unsure',confidentError:last?.status==='wrong'&&last.confidence==='certain',due:!!schedule?.dueAt&&schedule.dueAt<=now,stage:!last?'new':last.status==='wrong'?'repair':secure?'secure':last.status==='correct'?'learning':'review'};
 }
 function summary(bank,attempts,learning={},now=Date.now()){
  const result={due:[],uncertain:[],confidentErrors:[],secure:[],mistakes:[],new:[],learning:[],journal:[],profiles:new Map};
  const buckets=new Map;for(const a of attempts){if(!buckets.has(a.id))buckets.set(a.id,[]);buckets.get(a.id).push(a)}
  for(const q of bank){const entry=learning[q.id]||{},p=profile(q.id,buckets.get(q.id)||[],entry.schedule,now);result.profiles.set(q.id,p);if(p.due)result.due.push(q.id);if(p.uncertain)result.uncertain.push(q.id);if(p.confidentError)result.confidentErrors.push(q.id);if(p.secure)result.secure.push(q.id);if(p.last?.status==='wrong')result.mistakes.push(q.id);if(p.stage==='new')result.new.push(q.id);if(p.stage==='learning')result.learning.push(q.id);if(entry.mistake?.tag||entry.mistake?.note)result.journal.push(q.id)}
  result.due.sort((a,b)=>(learning[a]?.schedule?.dueAt||0)-(learning[b]?.schedule?.dueAt||0));return result;
 }
 function prioritize(ids,model,flags={},prefs={}){const p=preferences(prefs),due=new Set(model.due),wrong=new Set(model.mistakes),uncertain=new Set(model.uncertain),errors=new Set(model.confidentErrors);const weight=id=>(due.has(id)?100:0)+(errors.has(id)?30:wrong.has(id)?20:0)+(p.uncertainFirst&&uncertain.has(id)?15:0)+(flags[id]?10:0)+(model.profiles.get(id)?.stage==='new'?5:0);return ids.map((id,i)=>({id,i,w:weight(id)})).sort((a,b)=>b.w-a.w||a.i-b.i).map(x=>x.id)}
 const api={defaults,preferences,dayKey,nextDay,rate,autoSchedule,latest,profile,summary,prioritize};root.PYQLearning=api;if(typeof module!=='undefined')module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
