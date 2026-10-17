(function(root){
 'use strict';
 const letters=['A','B','C','D'];
 const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function clean(s){
  return s.replace(/\r/g,'').replace(/\u00ad\n?/g,'').replace(/\b([a-z]{3,})-\n([a-z]{3,})/g,'$1$2')
   .replace(/\[\s*(?:(?:ESE|IES|GATE|ME|PI)\s*[: -]?\s*)?(?:19|20)\d{2}\b[\s\S]*$/i,'')
   .replace(/\n\s*(?:[A-Z]{3,5}[-–][A-Z0-9][-–][A-Z]{2,4}|ME\s*(?:\(Set[-– ]?\d\))?|Engineering Sciences\s*\(XE\)|Organizing Institute|Read the following information|Common Data|Linked Answer Questions)\s*[\s\S]*$/i,'')
   .replace(/\n\s*(?:ME-[A-Z]|XE-[A-Z]|GATE\s*20\d\d|(?:20\d\d\s+)?MECHANICAL ENGINEERING|Page\s+\d|\d+\s*\/\s*\d+|Q\.\s*\d+|(?:Ans(?:wer)?|Sol(?:ution)?)\s*[.:])\b[\s\S]*$/i,'')
   .replace(/\s+/g,' ').replace(/\s+([°%²³])/g,'$1').replace(/℃/g,'°C').replace(/℉/g,'°F').trim();
 }
 function extract(text){
  if(typeof text!=='string'||text.length>20000)return null;
  // Labels, never answer keys, determine the choice order. Do not invent a missing label.
  const pattern=/(?:^|[\s])(?:\(\s*([A-Da-d])\s*\)|([A-Da-d])[.)])(?=\s|[-+−\d√])/g;
  const marks=[...text.matchAll(pattern)].map(m=>({letter:(m[1]||m[2]).toUpperCase(),start:m.index,end:m.index+m[0].length}));
  if(marks.length<4)return null;
  const last=marks.slice(-4);if(new Set(last.map(m=>m.letter)).size!==4)return null;
  if(!['ABCD','ACBD'].includes(last.map(m=>m.letter).join('')))return null;
  const result={};
  for(let i=0;i<4;i++){
   const raw=text.slice(last[i].end,last[i+1]?.start??text.length),value=clean(raw),lines=raw.trim().split(/\n/).map(s=>s.trim()).filter(Boolean);
   // Broken math/PDF reading order must remain a source image, not plausible-looking invented text.
   if(!value||value.length>460||/[\uE000-\uF8FF\uFFFD]/u.test(value)||/[<>{}\\]/.test(value))return null;
   if(/\b(?:Sol\.|Ans\.|ANSWER KEY|MADE EASY|GATE\s+20\d\d)\b/i.test(value))return null;
   if(lines.some((line,j)=>j>0&&/^[+−=×÷/]|^[a-zA-Zα-ωΑ-Ω0-9]$/.test(line)))return null;
   if(/(?:\d\s+){4,}\d/.test(value)||/(?:\b[A-Za-z]\s+){4,}/.test(value))return null;
   if(/\n\s*\d{1,3}\.\s+[A-Z]/.test(raw)||/\b(?:P\.T\.O\.|Question Paper|Space for Rough|www\.|Copyright|GO TO NEXT)/i.test(value))return null;
   if(!/[a-zA-Z0-9α-ωΑ-Ω∞]/.test(value))return null;
   if(/(?:\(|\[)/g.test(value)&&!balanced(value))return null;
   result[last[i].letter]={text:value};
  }
  if(new Set(Object.values(result).map(v=>v.text)).size<3)return null;
  return result;
 }
 function balanced(s){const stack=[];for(const c of s){if(c==='('||c==='[')stack.push(c);if(c===')'&&stack.pop()!=='('||c===']'&&stack.pop()!=='[')return false;}return !stack.length;}
 function simpleMath(s){
  // Only explicit, unambiguous notation is converted. Never infer lost exponents from OCR.
  const num='[+−-]?(?:\\d+(?:\\.\\d+)?|\\.\\d+)';
  if(new RegExp('^'+num+'\\s*°(?:[CF])?$').test(s))return s.replace(/−/g,'-').replace('°','^{\\circ}').replace(/([CF])$/,'\\mathrm{$1}');
  if(new RegExp('^'+num+'\\s*%$').test(s))return s.replace('−','-').replace('%','\\%');
  if(new RegExp('^'+num+'\\s*/\\s*'+num+'$').test(s)){const [a,b]=s.split('/');return '\\frac{'+a.trim()+'}{'+b.trim()+'}';}
  if(new RegExp('^'+num+'$').test(s))return s.replace('−','-');
  if(/^(?:N\s*m[²³]?|N\/m[²³]?|Pa|MPa|GPa|kPa|J|W|Hz|rpm)$/.test(s))return '\\mathrm{'+s.replace(/²/g,'^{2}').replace(/³/g,'^{3}')+'}';
  const unit=s.match(/^([+−-]?\s*\d+(?:\.\d+)?)\s+(k?N|MPa|GPa|kPa|Pa|mm|cm|km|m|s|min|h|kg|g|K|kJ|MJ|J|kW|MW|W|Hz|rpm|rad|μm|µm)([²³]|\^[23])?(?:\s*\/\s*(m|s|kg|K)([²³]|\^[23])?)?$/);
  if(unit){const power=v=>v?'^{'+v.replace('²','2').replace('³','3').replace('^','')+'}':'';return unit[1].replace(/\s/g,'').replace('−','-')+'\\,\\mathrm{'+unit[2]+power(unit[3])+(unit[4]?'/'+unit[4]+power(unit[5]):'')+'}';}
  if(/^[0-9a-zA-Zα-ωΑ-ΩπμνρστωθλδΔΣΩ∞√×÷±−+\-*/()._^{}²³⁰¹⁴⁵⁶⁷⁸⁹⁻⁺=<>≤≥\s]+$/u.test(s)&&s.length<85){
   if(/[A-Za-z]{4,}/.test(s))return null;
   if(/\^|_|[√²³⁰¹⁴⁵⁶⁷⁸⁹⁻⁺α-ωΑ-Ω]/u.test(s))return s.replace(/[⁻⁺⁰¹²³⁴⁵⁶⁷⁸⁹]+/g,v=>'^{'+[...v].map(c=>({'⁻':'-','⁺':'+','⁰':'0','¹':'1','²':'2','³':'3','⁴':'4','⁵':'5','⁶':'6','⁷':'7','⁸':'8','⁹':'9'}[c])).join('')+'}').replace(/√\s*(\d+(?:\.\d+)?|[a-zA-Z])/g,'\\sqrt{$1}');
  }
  return null;
 }
 function renderChoice(choice,katex=root.katex){
  if(!choice||typeof choice.text!=='string')return '';
  if(Array.isArray(choice.parts)&&choice.parts.length<=16)return choice.parts.map(part=>renderChoice({text:String(part.text||part.tex||''),tex:part.tex},katex)).join('');
  const tex=choice.tex||simpleMath(choice.text);
  if(tex&&katex){try{return katex.renderToString('\\displaystyle '+tex,{throwOnError:true,trust:false,strict:'error',maxSize:8,maxExpand:200,output:'htmlAndMathml',macros:{}});}catch{}}
  return escape(choice.text);
 }
 function forQuestion(q,data=root.PYQ_CHOICE_DATA){
  if(!['MCQ','MSQ'].includes(q.type))return null;
  const entry=data?.questions?.[q.id];
  if(entry&&entry.fingerprint===fingerprint(q.text||'')&&letters.every(l=>entry.choices?.[l]?.text))return {...entry,choices:entry.choices};
  // All shipped questions go through the offline audit. Runtime parsing only supports future imports.
  if(data?.reviewed?.includes(q.id))return null;
  const choices=extract(q.text);return choices?{choices,status:'source-text'}:null;
 }
 function fingerprint(s){let hash=2166136261;for(let i=0;i<s.length;i++){hash^=s.charCodeAt(i);hash=Math.imul(hash,16777619);}return (hash>>>0).toString(16);}
 const api={extract,clean,simpleMath,renderChoice,forQuestion,fingerprint,escape};
 if(typeof module==='object'&&module.exports)module.exports=api;else root.PYQChoices=api;
})(typeof globalThis!=='undefined'?globalThis:this);
