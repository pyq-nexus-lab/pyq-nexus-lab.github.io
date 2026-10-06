(function(root){
 'use strict';
 function apply(bank,data){
  if(!data?.subjects||!data.assignments)throw Error('Curriculum metadata is unavailable');
  const registry=new Map,subjects=new Set;
  data.subjects.forEach((s,si)=>{subjects.add(s.id);s.chapters.forEach(ch=>ch.topics.forEach(t=>{
   if(registry.has(t.id))throw Error('Duplicate curriculum topic');
   registry.set(t.id,{subject:s.id,subjectOrder:si,chapterId:ch.id,chapter:ch.name,chapterOrder:ch.order,topicId:t.id,topic:t.name,topicOrder:t.order});
  }))});
  const ids=new Set(bank.map(q=>q.id));for(const id of Object.keys(data.assignments))if(!ids.has(id))throw Error('Unknown curriculum question: '+id);
  return sort(bank.map((q,i)=>{
   const row=registry.get(data.assignments[q.id]);
   if(!row)throw Error('Unmapped curriculum question: '+q.id);
   if(q.subject!==row.subject)throw Error('Curriculum subject mismatch: '+q.id);
   const exerciseOrder=q.type==='WRITTEN'?3:q.type==='NAT'?2:q.marks===1?0:1;
   return {...q,...row,sourceChapter:q.chapter,sourceChapters:q.chapters.slice(),chapters:[row.chapter],exerciseOrder,sourceOrder:i,curriculumVersion:data.version};
  }));
 }
 function compare(a,b){return (a.subjectOrder??999)-(b.subjectOrder??999)||(a.chapterOrder??999)-(b.chapterOrder??999)||(a.topicOrder??999)-(b.topicOrder??999)||(a.exerciseOrder??0)-(b.exerciseOrder??0)||String(a.id).localeCompare(String(b.id),'en',{numeric:true})}
 function sort(bank){return bank.slice().sort(compare)}
 function matches(q,f={}){return (!f.chapter||f.chapter==='all'||q.chapterId===f.chapter||q.chapter===f.chapter)&&(!f.topic||f.topic==='all'||q.topicId===f.topic)}
 function outline(bank){
  const map=new Map;
  for(const q of sort(bank)){if(!q.chapterId)continue;
   if(!map.has(q.chapterId))map.set(q.chapterId,{id:q.chapterId,name:q.chapter,order:q.chapterOrder,subject:q.subject,questions:[],topics:[]});
   const ch=map.get(q.chapterId);ch.questions.push(q);
   let t=ch.topics.find(t=>t.id===q.topicId);if(!t){t={id:q.topicId,name:q.topic,order:q.topicOrder,questions:[]};ch.topics.push(t)}t.questions.push(q);
  }return [...map.values()];
 }
 function sessionIds(ids,bank,mode='practice'){
  const map=new Map(bank.map(q=>[q.id,q])),valid=[...new Set(ids)].filter(id=>map.has(id));
  return mode==='exam'?valid:valid.sort((a,b)=>compare(map.get(a),map.get(b)));
 }
 function next(bank,attempts,count=10){
  const done=new Set(attempts.filter(a=>Array.isArray(a.answer)?a.answer.length:a.answer!==undefined&&a.answer!==null&&String(a.answer).trim()).map(a=>a.id));
  const ordered=sort(bank),fresh=ordered.filter(q=>!done.has(q.id));
  return (fresh.length?fresh:ordered).slice(0,count).map(q=>q.id);
 }
 function preferences(input){return input?.learningOrderVersion===1?{...input}:{...input,previousSelection:input?.selection||'adaptive',selection:'curriculum',learningOrderVersion:1}}
 const api={apply,compare,sort,matches,outline,sessionIds,next,preferences};root.PYQCurriculum=api;if(typeof module!=='undefined')module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
