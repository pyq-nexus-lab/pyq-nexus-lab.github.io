(function(root){
 'use strict';
 function apply(raw,data={}){
  const extra=data.additional||[],patches=data.patches||{},ids=new Set;
  const result=[...raw,...extra].map(q=>{if(ids.has(q.id))throw Error('Duplicate answer-layer ID');ids.add(q.id);return {...q,...patches[q.id]}});
  for(const id of Object.keys(patches))if(!ids.has(id))throw Error('Unknown answer patch: '+id);
  return result;
 }
 function coverage(bank){const out={total:bank.length,official:0,book:0,solved:0,written:0,issues:0,pending:0,keyed:0};for(const q of bank){if(q.answerIssue){out.issues++;continue}if(q.type==='WRITTEN'){q.referenceAnswer&&q.explanation?out.written++:out.pending++;continue}if(q.key&&Number.isFinite(q.marks)&&q.marks>0){out.keyed++;out[q.keyStatus==='official'?'official':q.keyStatus==='solved'?'solved':'book']++}else out.pending++}return out}
 const api={apply,coverage};root.PYQAnswers=api;if(typeof module!=='undefined')module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
