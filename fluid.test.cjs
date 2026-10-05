const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const P=require('./catalog.js'),C=require('./core.js'),ctx={window:{}};
for(const file of ['bank.js','fluid-bank.js'])vm.runInNewContext(fs.readFileSync(file,'utf8'),ctx);
const bank=JSON.parse(JSON.stringify(P.prepare([{subject:'som',questions:ctx.window.SOM_BANK},...ctx.window.PYQ_BANKS]))),fluid=P.inScope(bank,'fluid-mechanics');
test('Fluid Mechanics includes complete older GATE archive and retains the SOM bank',()=>{
 assert.equal(P.inScope(bank,'som').length,1349);assert.equal(fluid.length,1681);
 const archive=fluid.filter(q=>q.archive&&q.exam==='gate-me');assert.equal(archive.length,223);
 assert.equal(Math.min(...archive.filter(q=>q.year).map(q=>q.year)),1987);
 assert.equal(archive.filter(q=>q.year&&q.year<2017).length,181);
 for(const [exam,count]of Object.entries({'gate-me':379,'gate-xe':460,'ese-prelims':763,'ese-mains':79}))assert.equal(fluid.filter(q=>q.exam===exam).length,count);
});
test('all separately answerable linked questions retain context and stable asset IDs',()=>{
 const linked=fluid.filter(q=>q.assetId.includes('-linked-'));assert.equal(linked.length,4);
 for(const q of linked){assert(q.text.length>80);assert(q.id==='fluid-mechanics:'+q.assetId);assert(q.width>200&&q.height>100);}
 for(const id of ['fm-gate-xe-319','fm-gate-xe-320']){const q=fluid.find(q=>q.assetId===id);assert(q.sourceRepair);assert(q.height>100);}
});
test('real Fluid keys grade MCQ/MSQ/NAT and separate written and pending answers',()=>{
 assert.equal(fluid.filter(q=>q.key).length,900);
 assert.equal(fluid.filter(q=>!q.key&&q.type!=='WRITTEN').length,699);
 for(const type of ['MCQ','MSQ','NAT']){
  const q=fluid.find(q=>q.type===type&&q.key&&q.key.kind!=='all');
  const answer=type==='NAT'?String(q.key.min):type==='MCQ'?q.key.options[0]:q.key.options;
  assert.equal(C.grade(q,answer).status,'correct');
  if(type==='MCQ')assert.equal(C.grade(q,['A','B','C','D'].find(o=>!q.key.options.includes(o))).score,-q.marks/3);
 }
 const written=fluid.find(q=>q.exam==='ese-mains');assert.equal(C.grade(written,'worked solution').status,'manual');
 for(const id of ['fluid-gate-book-4-6','fluid-gate-book-4-7','fluid-gate-book-5-8']){const q=fluid.find(q=>q.assetId===id);assert.equal(q.type,'WRITTEN');assert.equal(C.grade(q,'True; reasoning').status,'manual');}
 const pending=fluid.find(q=>!q.key&&q.type==='MCQ');assert.equal(C.grade(pending,'A').status,'ungraded');
 const som=bank.find(q=>q.subject==='som'&&q.type==='MCQ'&&q.key?.options);
 const objective=fluid.find(q=>q.type==='MCQ'&&q.key?.options);
 const answers={[som.id]:som.key.options[0],[objective.id]:objective.key.options[0],[written.id]:'worked solution',[pending.id]:'A'};
 const totals=C.totals([som,objective,written,pending],answers);assert.equal(totals.correct,2);assert.equal(totals.max,som.marks+objective.marks);assert.equal(totals.manual,1);assert.equal(totals.ungraded,1);
});
test('assertion/reason crops provide reviewed answer codes without revealing keys',()=>{
 const questions=fluid.filter(q=>q.answerDirections);assert(questions.length>0);
 for(const q of questions){assert.equal(q.exam,'ese-prelims');assert(q.answerDirections.includes('A')&&q.answerDirections.includes('D'));assert(!q.answerDirections.includes('Correct answer'));}
});
