const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),vm=require('vm'),crypto=require('crypto');
const C=require('./catalog.js'),A=require('./answers.js'),D=require('./dedup.js'),U=require('./curriculum.js'),X=require('./crops.js'),Core=require('./core.js'),P=require('./ordered-practice.js'),ctx={window:{}};
for(const f of ['bank.js','fluid-bank.js','heat-bank.js','heat-mains-bank.js','power-bank.js','thermo-bank.js','rac-bank.js','ic-bank.js','tom-bank.js','vibrations-bank.js','md-bank.js','answers-data.js','dedup-data.js','crops-data.js','curriculum-data.js'])vm.runInNewContext(fs.readFileSync(f,'utf8'),ctx);
const d=ctx.window,raw=X.apply(A.apply(C.prepare([{subject:'som',questions:d.SOM_BANK},...d.PYQ_BANKS]),d.PYQ_ANSWER_DATA),d.PYQ_CROP_DATA),lib=D.build(raw,d.PYQ_DEDUP_DATA),bank=U.apply(lib.bank,d.PYQ_CURRICULUM_DATA),added=bank.filter(q=>q.subject==='machine-design'),source=raw.filter(q=>q.subject==='machine-design');
test('Machine Design represents every supplied book number and both Mains year ranges',()=>{
 assert.equal(source.length,834);assert.equal(added.length,722);
 for(const [slug,counts]of [['gate-book',[24,17,22,23,12,20]],['ese-book',[34,60,109,19,34,29,39,58]]])counts.forEach((n,i)=>assert.deepEqual(source.filter(q=>q.assetId.startsWith('md-'+slug+'-'+(i+1)+'-')).map(q=>Number(q.assetId.split('-').at(-1))).sort((a,b)=>a-b),Array.from({length:n},(_,j)=>j+1)));
 for(const exam of ['ese-mains','cse-mains'])for(let year=2017;year<=2026;year++)assert(added.some(q=>q.exam===exam&&q.year===year),exam+' '+year);
 assert.deepEqual(Object.fromEntries(['gate-me','ese-prelims','ese-mains','cse-mains'].map(e=>[e,added.filter(q=>q.exam===e).length])),{'gate-me':179,'ese-prelims':460,'ese-mains':64,'cse-mains':19});
});
test('Answers grade correctly and ambiguous source data never contributes automatic marks',()=>{
 assert.deepEqual(A.coverage(added),{total:722,official:93,book:417,solved:119,written:86,issues:7,pending:0,keyed:629});assert.equal(added.filter(q=>q.keyConflict).length,0);
 for(const q of added){assert(q.marks>0,q.id);if(q.key){assert(q.keySource,q.id);const answer=q.type==='NAT'?String(q.key.ranges?.[0][0]??q.key.min):q.key.options;assert.equal(Core.grade(q,answer).score,q.marks,q.id);}else{assert(q.referenceAnswer&&q.explanation,q.id);assert.equal(Core.grade(q,'A').score,null,q.id);}}
 assert.equal(Core.totals(added.filter(q=>q.answerIssue||q.type==='WRITTEN'),{}).max,0);
 const q=id=>added.find(q=>q.assetId===id);assert.equal(q('md-extra-me1-2020-q9').key.options.join(''),'C');assert.equal(q('md-extra-me1-2020-q28').key.options.join(''),'A');assert.equal(q('md-extra-me1-2020-q39').key.min,15.9);
 assert.match(q('md-esem-2024-3c-ii').referenceAnswer,/120 mm, not 125/);assert(q('md-esep-2023-105').answerIssue);
});
test('All Machine Design images match reviewed bytes and shared data remains available',()=>{
 const packs=new Set(source.map(q=>q.pack));assert.equal(packs.size,15);for(const p of packs){assert(fs.statSync(p).size<4_500_000);vm.runInNewContext(fs.readFileSync(p,'utf8'),ctx);}
 for(const q of source){const uri=d.PYQ_IMAGES[q.assetId];assert(uri?.startsWith('data:image/webp;base64,'),q.id);assert.equal(crypto.createHash('sha256').update(Buffer.from(uri.split(',')[1],'base64')).digest('hex'),q.cropSha256,q.id);assert(q.width>100&&q.height>50,q.id);assert(q.cropPanels?.length,q.id);}
 for(const id of ['md-me2008-s1-q78-p19','md-me2008-s1-q79-p19','md-me2013-s1-q48-p11','md-me2013-s1-q49-p11','md-gate-book-5-2','md-gate-book-5-7','md-gate-book-6-4'])assert(source.find(q=>q.assetId===id).cropPanels.length>=2,id);
});
test('Full ordered path has no set-size cap and all prior subject identities are preserved',()=>{
 assert.equal(U.outline(added).length,12);assert.equal(new Set(added.map(q=>q.topicId)).size,35);const path=P.open(null,U.sessionIds(added.map(q=>q.id).reverse(),bank));assert.equal(path.ids.length,722);assert.deepEqual(path.ids,added.map(q=>q.id));assert.equal(path.deadline,null);
 assert.equal(bank.filter(q=>q.subject!=='machine-design').length,8205);const prior=JSON.parse(fs.readFileSync('md-compatibility.json','utf8'));assert.equal(prior.preserved,8205);assert.equal(prior.storage,'som-lab-v1');
 assert.equal(added.find(q=>q.assetId==='md-me2008-s1-q79-p19').topicId,'machine-design-03-03');assert.equal(added.find(q=>q.assetId==='md-extra-me1-2020-q9').topicId,'machine-design-05-02');assert.equal(added.find(q=>q.assetId==='md-esem-2024-5c').topicId,'machine-design-12-03');
});
