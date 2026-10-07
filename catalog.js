(function(root){
  'use strict';
  const subjects = [
    ['som','Strength of Materials','SOM','Mechanics','Stress, deformation, beams, torsion and applied mechanics.','⌁','#d0ef82'],
    ['engineering-mechanics','Engineering Mechanics','EM','Mechanics','Statics, dynamics, equilibrium and rigid-body motion.','↗','#a4d4df'],
    ['theory-of-machines','Theory of Machines','TOM','Mechanics','Mechanisms, kinematics, gears and dynamic analysis.','⚙','#d6bbf6'],
    ['vibrations','Mechanical Vibrations','VIB','Mechanics','Free and forced vibrations, damping and isolation.','∿','#d6bbf6'],
    ['machine-design','Machine Design','MD','Design & production','Failure theories, machine elements and design calculations.','◇','#f0b48d'],
    ['materials','Engineering Materials','MAT','Design & production','Material properties, structure and heat treatment.','⬡','#f0b48d'],
    ['manufacturing','Manufacturing Engineering','MFG','Design & production','Casting, forming, machining, joining and metrology.','▤','#f0b48d'],
    ['industrial','Industrial Engineering','IE','Design & production','Operations research, production planning and inventory.','▥','#f0b48d'],
    ['thermodynamics','Thermodynamics','THERMO','Thermal & fluids','Laws of thermodynamics, properties, entropy and cycles.','∆','#f59e8e'],
    ['heat-transfer','Heat Transfer','HT','Thermal & fluids','Conduction, convection, radiation and heat exchangers.','☀','#f59e8e'],
    ['fluid-mechanics','Fluid Mechanics','FM','Thermal & fluids','Fluid statics, flow, dimensional analysis and viscous effects.','≈','#8fc8ed'],
    ['turbomachinery','Turbomachinery','TM','Thermal & fluids','Pumps, turbines, compressors and energy transfer.','✳','#8fc8ed'],
    ['ic-engines','IC Engines & Power Plants','IC','Thermal & fluids','Engine performance, combustion and power generation.','ϟ','#f59e8e'],
    ['refrigeration','Refrigeration & Air Conditioning','RAC','Thermal & fluids','Refrigeration cycles, psychrometry and conditioning.','❄','#8fc8ed'],
    ['engineering-mathematics','Engineering Mathematics','MATH','Foundations','Calculus, linear algebra, probability and numerical methods.','∫','#b3b8f4'],
    ['general-aptitude','General Aptitude','GA','Foundations','Quantitative, verbal, analytical and spatial aptitude.','◎','#b3b8f4'],
    ['ese-general-studies','ESE General Studies & Aptitude','GS','Foundations','A dedicated home for Stage I general studies and aptitude.','▧','#b3b8f4']
  ].map(([id,name,short,group,description,icon,color])=>({id,name,short,group,description,icon,color}));
  function prepare(banks){
    const ids=new Set();
    return banks.flatMap(bank=>{
      if(!subjects.some(s=>s.id===bank.subject)||!Array.isArray(bank.questions))throw Error('Unknown subject or invalid question bank');
      return bank.questions.map(q=>{
        const id=bank.subject==='som'?q.id:`${bank.subject}:${q.id}`;
        if(typeof q.id!=='string'||!q.id||ids.has(id))throw Error('Duplicate or missing question ID');
        if(!q.title||!q.chapter||!q.source||!['gate-me','gate-xe','ese-prelims','ese-mains','cse-mains'].includes(q.exam)||!['MCQ','MSQ','NAT','TEXT','WRITTEN','UNCLASSIFIED'].includes(q.type))throw Error('Incomplete question metadata');
        if(q.key&&(!Number.isFinite(q.marks)||q.marks<=0))throw Error('Grading keys need positive marks');
        ids.add(id);return {...q,id,assetId:q.id,subject:bank.subject};
      });
    });
  }
  function inScope(bank,subject='all'){return subject==='all'?bank:bank.filter(q=>q.subject===subject)}
  function summary(bank,attempts,subject='all'){
    const qs=inScope(bank,subject),ids=new Set(qs.map(q=>q.id)),a=attempts.filter(x=>ids.has(x.id));
    const graded=a.filter(x=>['correct','wrong'].includes(x.status));
    const answered=x=>Array.isArray(x)?x.length>0:x!==null&&x!==undefined&&String(x).trim()!=='';
    return {total:qs.length,attempted:new Set(a.filter(x=>answered(x.answer)).map(x=>x.id)).size,graded:graded.length,correct:graded.filter(x=>x.status==='correct').length,seconds:a.reduce((n,x)=>n+(Number(x.seconds)||0),0),keyed:qs.filter(q=>q.key&&Number.isFinite(q.marks)&&q.type!=='WRITTEN').length};
  }
  const api={subjects,prepare,inScope,summary};root.PYQCatalog=api;
  if(typeof module!=='undefined')module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
