(function(root){
function hasAnswer(a){return Array.isArray(a)?a.length>0:a!==undefined&&a!==null&&String(a).trim()!==''}
function grade(q,a){
 if(q.type==='WRITTEN')return {status:'manual',score:null};
 if(!q.key||!Number.isFinite(q.marks))return {status:'ungraded',score:null};
 if(q.key.kind==='all')return {status:'correct',score:q.marks};
 if(!hasAnswer(a))return {status:'skipped',score:0};
 let correct=false;
 if(q.type==='NAT'){const n=typeof a==='string'&&/^[+-]?(?:\d+\.?\d*|\.\d+)$/.test(a.trim())?Number(a):NaN;correct=Number.isFinite(n)&&(q.key.ranges||[[q.key.min,q.key.max]]).some(([min,max])=>n>=min&&n<=max)}
 else{const actual=JSON.stringify([...new Set(Array.isArray(a)?a:[a])].sort());correct=(q.key.optionSets||[q.key.options]).some(options=>actual===JSON.stringify([...options].sort()))}
 return {status:correct?'correct':'wrong',score:correct?q.marks:q.type==='MCQ'?-q.marks/3:0};
}
function totals(qs,answers){const r={score:0,max:0,correct:0,wrong:0,skipped:0,ungraded:0,manual:0};for(const q of qs){const g=grade(q,answers[q.id]);r[g.status]++;if(g.score!==null){r.score+=g.score;r.max+=q.marks}}return r}
function calc(input){
 const src=input.replace(/\s/g,'').replace(/×/g,'*').replace(/÷/g,'/');const tokens=src.match(/(?:\d*\.)?\d+(?:[eE][+-]?\d+)?|sqrt|sin|cos|tan|log|ln|abs|pi|[()+\-*/^]/g)||[];
 if(tokens.join('')!==src||tokens.length>150)throw Error('Invalid expression');let i=0;
 function atom(){let t=tokens[i++];if(t==='+'||t==='-')return (t==='-'?-1:1)*atom();if(t==='('){let v=expr();if(tokens[i++]!==')')throw Error('Close the bracket');return v}if(t==='pi')return Math.PI;if(['sqrt','sin','cos','tan','log','ln','abs'].includes(t)){if(tokens[i++]!=='(')throw Error('Use function(value)');const v=expr();if(tokens[i++]!==')')throw Error('Close the bracket');return ({sqrt:Math.sqrt,sin:x=>Math.sin(x*Math.PI/180),cos:x=>Math.cos(x*Math.PI/180),tan:x=>Math.tan(x*Math.PI/180),log:Math.log10,ln:Math.log,abs:Math.abs})[t](v)}if(t===undefined||!Number.isFinite(Number(t)))throw Error('Enter a number');return Number(t)}
 function power(){let a=atom();if(tokens[i]==='^'){i++;a=a**power()}return a}function term(){let a=power();while(['*','/'].includes(tokens[i])){const op=tokens[i++],b=power();a=op==='*'?a*b:a/b}return a}function expr(){let a=term();while(['+','-'].includes(tokens[i])){const op=tokens[i++],b=term();a=op==='+'?a+b:a-b}return a}const n=expr();if(i!==tokens.length||!Number.isFinite(n))throw Error('Undefined result');return Number(n.toPrecision(12));
}
const api={hasAnswer,grade,totals,calc};if(typeof module!=='undefined')module.exports=api;root.SOMCore=api;
})(typeof globalThis!=='undefined'?globalThis:this);
