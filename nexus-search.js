(function(root){
 'use strict';
 const normalize=value=>String(value??'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
 function index(rows){return rows.map(row=>({row,label:normalize(row.label),detail:normalize(row.detail),text:normalize([row.label,row.detail,row.text].join(' '))}));}
 function search(entries,query,limit=12){const term=normalize(query),tokens=term.split(' ').filter(Boolean);if(!tokens.length)return entries.filter(e=>e.row.kind!=='question').slice(0,limit).map(e=>e.row);return entries.map((e,i)=>({e,i,score:e.label===term?100:e.label.startsWith(term)?70:e.label.includes(term)?50:tokens.every(t=>e.detail.includes(t))?30:e.row.kind==='question'?0:20})).filter(({e})=>tokens.every(t=>e.text.includes(t))).sort((a,b)=>b.score-a.score||a.i-b.i).slice(0,Math.max(0,limit)).map(({e})=>e.row);}
 const api={normalize,index,search};root.NexusSearch=api;if(typeof module!=='undefined')module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
