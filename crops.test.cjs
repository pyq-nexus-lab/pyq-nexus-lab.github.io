const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),crypto=require('node:crypto');
const Catalog=require('./catalog.js'),A=require('./answers.js'),D=require('./dedup.js'),U=require('./curriculum.js'),C=require('./crops.js'),Core=require('./core.js'),ctx={window:{}};
for(const f of ['bank.js','fluid-bank.js','heat-bank.js','heat-mains-bank.js','answers-data.js','dedup-data.js','curriculum-data.js','crops-data.js'])vm.runInNewContext(fs.readFileSync(f,'utf8'),ctx);
const raw=A.apply(Catalog.prepare([{subject:'som',questions:ctx.window.SOM_BANK},...ctx.window.PYQ_BANKS]),ctx.window.PYQ_ANSWER_DATA),data=ctx.window.PYQ_CROP_DATA,patched=C.apply(raw,data),before=U.apply(D.build(raw,ctx.window.PYQ_DEDUP_DATA).bank,ctx.window.PYQ_CURRICULUM_DATA),lib=D.build(patched,ctx.window.PYQ_DEDUP_DATA),after=U.apply(lib.bank,ctx.window.PYQ_CURRICULUM_DATA);
test('screenshot replacement preserves every question, answer, identity and curriculum assignment',()=>{
 assert.equal(raw.length,4173);assert.equal(patched.length,4173);assert.equal(after.length,3766);assert.deepEqual(after.map(q=>q.id),before.map(q=>q.id));assert.deepEqual(A.coverage(after),A.coverage(before));
 const editable=new Set(['pack','assetId','width','height','cropSha256','sourceRepair','cropReview','cropPanels']);
 for(let i=0;i<raw.length;i++)for(const k of Object.keys(raw[i]).filter(k=>!editable.has(k)))assert.deepEqual(patched[i][k],raw[i][k],raw[i].id+' '+k);
 for(let i=0;i<before.length;i++)for(const k of ['id','type','year','exam','key','keySource','marks','referenceAnswer','explanation','answerIssue','chapterId','topicId','topic','aliases'])assert.deepEqual(after[i][k],before[i][k],before[i].id+' '+k);
});
test('every published crop has an intact WebP asset, matching digest and bounded source panels',()=>{
 const packs=new Set(Object.values(data.patches).map(p=>p.pack));for(const f of packs){assert(fs.statSync(f).size<5_000_000);vm.runInNewContext(fs.readFileSync(f,'utf8'),ctx)}
 assert.equal(Object.keys(data.patches).length,data.summary.rawEntriesRebuilt);assert.equal(packs.size,data.summary.packs);
 for(const [id,p]of Object.entries(data.patches)){const uri=ctx.window.PYQ_IMAGES[p.assetId];assert(uri?.startsWith('data:image/webp;base64,'),id);const b=Buffer.from(uri.split(',')[1],'base64');assert.equal(b.subarray(0,4).toString(),'RIFF',id);assert.equal(b.subarray(8,12).toString(),'WEBP',id);assert.equal(crypto.createHash('sha256').update(b).digest('hex'),p.cropSha256,id);assert(p.cropPanels.length&&p.width>40&&p.height>40);for(const pan of p.cropPanels){assert(pan.box[0]>=0&&pan.box[1]>=0&&pan.box[2]<=pan.pageSize[0]&&pan.box[3]<=pan.pageSize[1],id)}}
});
test('reported viscosity and manometer crops are rebuilt from complete source panels',()=>{
 const viscosity=data.patches['fluid-mechanics:fluid-gate-book-1-6'],manometer=data.patches['fluid-mechanics:fluid-gate-book-2-7'];assert(viscosity&&manometer);assert(viscosity.height>180);assert(manometer.height>450);assert(manometer.cropPanels.length>=2);assert(manometer.cropPanels.every(p=>p.box[1]>100));
 for(const id of ['gate-book-4-2','gate-book-4-3','gate-book-5-12','gate-book-5-13','gate-book-7-6','gate-book-7-7','gate-book-9-2','gate-book-9-3','fluid-mechanics:fluid-gate-book-5-16','fluid-mechanics:fluid-gate-book-5-17']){const p=data.patches[id];assert(p.cropPanels.length>=2,id);assert.match(p.sourceRepair,/shared/i,id)}
});
test('duplicate appearances use the corrected assets and retain their answer-option translation',()=>{
 const orig=D.build(raw,ctx.window.PYQ_DEDUP_DATA);let repairedAppearances=0;
 for(const q of lib.bank){const old=orig.bank.find(t=>t.id===q.id);assert.deepEqual(q.occurrences.map(o=>[o.id,o.optionMap]),old.occurrences.map(o=>[o.id,o.optionMap]));for(const o of q.occurrences)if(data.patches[o.id]){repairedAppearances++;assert.equal(o.assetId,data.patches[o.id].assetId);assert.equal(lib.original.get(o.id).pack,data.patches[o.id].pack)}}assert(repairedAppearances>1500);
});
test('reference answers still earn the same grades with repaired screenshots',()=>{
 for(const q of after.filter(q=>q.key)){const response=q.key.kind==='all'?'':q.type==='NAT'?String((q.key.ranges?.[0]||[q.key.min])[0]):q.type==='TEXT'?q.key.acceptedText[0]:q.key.options;assert.equal(Core.grade(q,response).score,q.marks,q.id)}
});
test('the mixed 2009 Q11 screenshot is replaced with the same individual question',()=>{const p=data.patches['gate-me-038'];assert(p);assert.match(p.sourceRepair,/unrelated Q12 and Q13/);assert(p.height<300);assert.equal(p.cropPanels[0].page,170);const q=after.find(q=>q.id==='gate-me-038'),old=before.find(q=>q.id==='gate-me-038');assert(q);assert.deepEqual(q.key,old.key);assert.equal(Core.grade(q,q.key.options).score,q.marks)});
test('crop patches reject unknown IDs, answer changes and out-of-page geometry',()=>{
 const q=patched.find(q=>data.patches[q.id]),p=data.patches[q.id];assert.throws(()=>C.apply(raw,{patches:{unknown:p}}),/Unknown/);assert.throws(()=>C.apply(raw,{patches:{[q.id]:{...p,key:{options:['A']}}}}),/metadata/);assert.throws(()=>C.apply(raw,{patches:{[q.id]:{...p,cropPanels:[{page:1,box:[-1,0,10,10],pageSize:[100,100]}]}}}),/bounds/);
});
