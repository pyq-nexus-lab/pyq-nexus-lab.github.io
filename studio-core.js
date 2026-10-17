(function(root){
  'use strict';
  const calculatorURL='https://www.tcsion.com/OnlineAssessment/ScientificCalculator/Calculator.html';
  function calculatorAllowed(session,question){return !(session?.mode==='exam'&&!session.finished&&question?.exam==='ese-prelims');}
  function questionStatus(session,id,grade,hasAnswer){
    if(session.mode!=='exam'&&session.submitted?.[id]){
      const result=grade(id,session.answers[id]);
      if(['correct','wrong'].includes(result.status))return result.status;
      if(hasAnswer(session.answers[id]))return 'reviewed';
    }
    if(hasAnswer(session.answers[id]))return 'answered';
    return session.visited?.[id]?'visited':'unseen';
  }
  function counts(session,grade,hasAnswer){const out={correct:0,wrong:0,reviewed:0,answered:0,visited:0,unseen:0};for(const id of session.ids)out[questionStatus(session,id,grade,hasAnswer)]++;return out;}
  function nextMatching(session,current,filter,flags,grade,hasAnswer){
    for(let step=1;step<=session.ids.length;step++){
      const i=(current+step)%session.ids.length,id=session.ids[i],status=questionStatus(session,id,grade,hasAnswer);
      if(filter==='flagged'?flags[id]:filter==='unanswered'?['visited','unseen'].includes(status):status===filter)return i;
    }
    return -1;
  }
  const api={calculatorURL,calculatorAllowed,questionStatus,counts,nextMatching};
  if(typeof module!=='undefined')module.exports=api;root.PYQStudioCore=api;
})(typeof globalThis!=='undefined'?globalThis:this);
