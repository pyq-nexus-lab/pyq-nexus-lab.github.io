(function(root){
 'use strict';
 const C=typeof module!=='undefined'?require('./core.js'):root.SOMCore;
 const VERSION='2026-10-06-v4';
 function compatible(q,a){
  if(!C.hasAnswer(a))return true;
  if(q.type==='NAT')return typeof a==='string'&&/^[+-]?(?:\d+\.?\d*|\.\d+)$/.test(a.trim());
  if(q.type==='MCQ'||q.type==='MSQ'){const values=Array.isArray(a)?a:[a];return values.every(v=>typeof v==='string'&&/^[A-D]$/.test(v))&&(q.type==='MSQ'||values.length===1)}
  if(q.type==='TEXT')return typeof a==='string'&&a.length<=500&&(!/^[A-D]$/i.test(a.trim())||(q.key?.acceptedText||[]).some(v=>C.normalizeText(v)===C.normalizeText(a)));
  return false;
 }
 function preview(attempts,bank){
  const byId=new Map(bank.map(q=>[q.id,q])),changes=[];let newlyGraded=0,needsRetry=0;
  attempts.forEach((a,index)=>{const q=byId.get(a.id);if(!q||q.type==='WRITTEN')return;const invalid=q.key&&!q.answerIssue&&!compatible(q,a.answer),g=invalid?{status:'ungraded',score:null}:C.grade(q,a.answer),issue=invalid?'The saved response uses a different answer format. Reattempt this question with the current controls.':null;
   if(invalid)needsRetry++;
   if(g.status!==a.status||g.score!==a.score||q.marks!==a.marks||q.keyStatus!==a.keyStatus||issue!==(a.answerFormatIssue||null)){if(g.score!==null&&a.score===null)newlyGraded++;changes.push({index,grade:g,marks:q.marks,keyStatus:q.keyStatus,answerFormatIssue:issue})}
  });return {changes,newlyGraded,needsRetry};
 }
 function apply(attempts,plan,at=Date.now()){
  const byIndex=new Map(plan.changes.map(c=>[c.index,c]));return attempts.map((a,index)=>{const c=byIndex.get(index);if(!c)return a;return {...a,...c.grade,marks:c.marks,keyStatus:c.keyStatus,answerFormatIssue:c.answerFormatIssue,gradeRevision:VERSION,gradingHistory:[...(a.gradingHistory||[]),{status:a.status,score:a.score,marks:a.marks??null,keyStatus:a.keyStatus||null,answerFormatIssue:a.answerFormatIssue||null,replacedAt:at,usingVersion:VERSION}]}});
 }
 const api={VERSION,compatible,preview,apply};root.PYQRecheck=api;if(typeof module!=='undefined')module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
