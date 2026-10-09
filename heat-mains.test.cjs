const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),vm=require('vm'),crypto=require('crypto');
const C=require('./catalog.js'),A=require('./answers.js'),D=require('./dedup.js'),U=require('./curriculum.js'),X=require('./crops.js'),Core=require('./core.js'),ctx={window:{}};
for(const f of ['bank.js','fluid-bank.js','heat-bank.js','heat-mains-bank.js','power-bank.js','answers-data.js','dedup-data.js','crops-data.js','curriculum-data.js'])vm.runInNewContext(fs.readFileSync(f,'utf8'),ctx);
const d=ctx.window,raw=X.apply(A.apply(C.prepare([{subject:'som',questions:d.SOM_BANK},...d.PYQ_BANKS]),d.PYQ_ANSWER_DATA),d.PYQ_CROP_DATA),lib=D.build(raw,d.PYQ_DEDUP_DATA),bank=U.apply(lib.bank,d.PYQ_CURRICULUM_DATA),qs=bank.filter(q=>q.assetId.startsWith('ht-esem-')||q.assetId.startsWith('ht-csem-')),audit=JSON.parse(fs.readFileSync('heat-mains-source-audit.json','utf8'));
test('official Heat Transfer Mains covers both exams in every year 2017–2026 with source provenance',()=>{
 assert.equal(qs.length,128);assert.equal(audit.papers.length,40);
 for(const [exam,count]of [['ese-mains',70],['cse-mains',58]]){assert.equal(qs.filter(q=>q.exam===exam).length,count);for(let year=2017;year<=2026;year++)assert(qs.some(q=>q.exam===exam&&q.year===year));}
 for(const p of audit.papers){assert.equal(new URL(p.url).hostname.replace(/^www\./,''),'upsc.gov.in');assert.equal(p.sha256.length,64);assert(p.downloaded&&p.bytes>1000);}
 for(const q of qs){assert(q.marks>0&&q.type==='WRITTEN'&&q.key===null);assert.match(q.keySource,/not an official marking scheme/);assert(q.referenceAnswer.length>100&&q.reviewChecklist.length>60);assert.equal(q.sourceUrl,q.answerReference.url);assert(q.chapterId&&q.topicId);assert.equal(Core.grade(q,'an incorrect response').score,null);}
 assert.deepEqual(A.coverage(qs),{total:128,official:0,book:0,solved:0,written:128,issues:0,pending:0,keyed:0});
});
test('all 128 Mains screenshot bytes and native crop bounds are verified; multi-page data stays attached',()=>{
 for(const pack of new Set(qs.map(q=>q.pack))){assert(fs.statSync(pack).size<4_500_000);vm.runInNewContext(fs.readFileSync(pack,'utf8'),ctx);}
 for(const q of qs){const uri=d.PYQ_IMAGES[q.assetId];assert(uri?.startsWith('data:image/webp;base64,'),q.id);assert.equal(crypto.createHash('sha256').update(Buffer.from(uri.split(',')[1],'base64')).digest('hex'),q.cropSha256);for(const p of q.cropPanels){assert(p.page>0&&p.box[0]>=0&&p.box[1]>=0&&p.box[2]<=p.pageSize[0]&&p.box[3]<=p.pageSize[1]);assert(p.box[3]>p.box[1]);}}
 for(const id of ['ht-csem-2024-4b','ht-esem-2022-4a','ht-esem-2026-7b'])assert(qs.find(q=>q.assetId===id).cropPanels.length>1,id);
 assert.equal(new Set(qs.map(q=>q.cropSha256)).size,128);
});
test('all pre-existing questions, images, answers, teaching assignments and saved session IDs remain stable',()=>{
 const prior=JSON.parse(fs.readFileSync('heat-mains-compatibility.json','utf8')),rows=bank.filter(q=>q.subject!=='power-plant'&&!qs.includes(q)).map(q=>Object.fromEntries(prior.checkedFields.map(k=>[k,q[k]??null]))).sort((a,b)=>a.id.localeCompare(b.id));assert.equal(rows.length,3638);assert.equal(crypto.createHash('sha256').update(JSON.stringify(rows)).digest('hex'),prior.sha256);
 const session={ids:['gate-me-002','gate-me-001'],index:1,mode:'practice',answers:{'gate-me-001':'B'},times:{}};assert.deepEqual(D.migrate({session,attempts:[]},lib).session,session);
});
test('printed inconsistencies and missing data have conditional model references',()=>{
 for(const [id,pattern]of [['ht-esem-2025-2b',/1.25 m|1·25 m/i],['ht-csem-2025-1d',/not supplied|not printed|not specified|supplies no|missing/i],['ht-esem-2026-4a',/1\/3|⅓/],['ht-csem-2026-4a',/inconsistent|inconsistency/i]])assert.match(qs.find(q=>q.assetId===id).referenceAnswer,pattern,id);
});
