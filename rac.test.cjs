const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),vm=require('vm'),crypto=require('crypto');
const C=require('./catalog.js'),A=require('./answers.js'),D=require('./dedup.js'),U=require('./curriculum.js'),X=require('./crops.js'),Core=require('./core.js'),P=require('./ordered-practice.js'),ctx={window:{}};
for(const f of ['bank.js','fluid-bank.js','heat-bank.js','heat-mains-bank.js','power-bank.js','thermo-bank.js','rac-bank.js','ic-bank.js','tom-bank.js','vibrations-bank.js','md-bank.js','mfg-bank.js','answers-data.js','dedup-data.js','crops-data.js','curriculum-data.js'])vm.runInNewContext(fs.readFileSync(f,'utf8'),ctx);
const d=ctx.window,raw=X.apply(A.apply(C.prepare([{subject:'som',questions:d.SOM_BANK},...d.PYQ_BANKS]),d.PYQ_ANSWER_DATA),d.PYQ_CROP_DATA),lib=D.build(raw,d.PYQ_DEDUP_DATA),bank=U.apply(lib.bank,d.PYQ_CURRICULUM_DATA),rac=bank.filter(q=>q.subject==='refrigeration'),source=raw.filter(q=>q.subject==='refrigeration');
test('RAC represents every numbered supplied book exercise and all five exam tracks',()=>{
 assert.equal(source.length,732);assert.equal(rac.length,656);
 for(const [prefix,counts]of [['rac-ese-book-',[44,130,31,111,52]],['rac-gate-book-',[19,16,12,15]]])for(const [i,n]of counts.entries())assert.deepEqual(source.filter(q=>q.assetId.startsWith(prefix+(i+1)+'-')).map(q=>Number(q.number.split('.')[1])).sort((a,b)=>a-b),Array.from({length:n},(_,j)=>j+1));
 for(const [exam,count]of Object.entries({'gate-me':76,'gate-xe':60,'ese-prelims':413,'ese-mains':51,'cse-mains':56}))assert.equal(rac.filter(q=>q.exam===exam).length,count,exam);
 for(const exam of ['ese-mains','cse-mains'])for(let year=2017;year<=2026;year++)assert(rac.some(q=>q.exam===exam&&q.year===year),exam+' '+year);
});
test('RAC keys grade correctly while written and inconsistent questions stay outside automatic marks',()=>{
 assert.deepEqual(A.coverage(rac),{total:656,official:63,book:386,solved:93,written:107,issues:7,pending:0,keyed:542});assert.equal(rac.filter(q=>q.keyConflict).length,0);
 for(const q of rac){assert(q.marks>0&&q.keySource,q.id);if(q.key){const answer=q.type==='NAT'?String(q.key.ranges?.[0][0]??q.key.min):q.type==='TEXT'?q.key.acceptedText[0]:q.key.options;assert.equal(Core.grade(q,answer).score,q.marks,q.id);if(q.type==='NAT')for(const [lo,hi]of q.key.ranges||[[q.key.min,q.key.max]])for(const v of [lo,hi])assert.equal(Core.grade(q,String(v)).score,q.marks,q.id);}else{assert(q.referenceAnswer&&q.explanation,q.id);assert.equal(Core.grade(q,'A').score,null,q.id);if(q.type==='WRITTEN'){assert(q.reviewChecklist&&q.sourceUrl?.includes('upsc.gov.in'),q.id);assert.match(q.keySource,/not an official marking scheme/i,q.id);}}}
 assert.equal(Core.totals(rac.filter(q=>q.answerIssue||q.type==='WRITTEN'),{}).max,0);
});
test('RAC images have verified bytes and intact source bounds, including shared data',()=>{
 const packs=new Set(source.map(q=>q.pack));assert.equal(packs.size,14);for(const p of packs){assert(fs.statSync(p).size<4_500_000);vm.runInNewContext(fs.readFileSync(p,'utf8'),ctx);}
 for(const q of source){const uri=d.PYQ_IMAGES[q.assetId];assert(uri?.startsWith('data:image/webp;base64,'),q.id);assert.equal(crypto.createHash('sha256').update(Buffer.from(uri.split(',')[1],'base64')).digest('hex'),q.cropSha256,q.id);for(const p of q.cropPanels||[]){assert(p.box&&p.page>0,q.id);assert(p.box[0]>=0&&p.box[1]>=0&&p.box[2]<=p.pageSize[0]&&p.box[3]<=p.pageSize[1],q.id);assert(p.box[2]>p.box[0]&&p.box[3]>p.box[1],q.id);}}
 for(const id of ['rac-me2012-s1-q50-p10','rac-me2012-s1-q51-p10','rac-xe2007-s1-q27-p50','rac-xe2007-s1-q28-p50','rac-xe2009-s1-q21-p25','rac-xe2009-s1-q22-p25','rac-xe2013-s1-q17-p30','rac-xe2013-s1-q18-p30','rac-xe2013-s1-q21-p31','rac-xe2013-s1-q22-p31','rac-esep-2023-11','rac-esep-2023-12'])assert(source.find(q=>q.assetId===id)?.cropPanels.length>=2,id);
 for(const id of ['rac-me2010-s1-q42-p7','rac-me2-2020-s2-q53-p17'])assert(source.some(q=>q.assetId===id),id);
});
test('RAC follows an uninterrupted teaching path and preserves existing progress storage',()=>{
 const outline=U.outline(rac);assert.equal(outline.length,11);assert.equal(new Set(rac.map(q=>q.topicId)).size,34);assert.equal(outline[0].name,'Refrigeration Fundamentals and Heat Pumps');assert.equal(outline.at(-1).name,'Duct Design and Air Distribution');
 const ids=U.sessionIds(rac.map(q=>q.id).reverse(),bank),path=P.open(null,ids);assert.equal(path.ids.length,656);assert.deepEqual(path.ids,rac.map(q=>q.id));assert.equal(path.deadline,null);
 const prior=JSON.parse(fs.readFileSync('rac-compatibility.json','utf8'));assert.equal(prior.preserved,6075);assert.equal(prior.storage,'som-lab-v1');assert.equal(bank.filter(q=>!['refrigeration','ic-engines','theory-of-machines','vibrations','machine-design','manufacturing'].includes(q.subject)).length,6075);
 const session={ids:['gate-me-002','gate-me-001'],index:1,mode:'practice',answers:{'gate-me-001':'B'},times:{}};assert.deepEqual(D.migrate({session,attempts:[]},lib).session,session);
});
test('RAC teaching topics follow the problem asked, including mixed wording and written applications',()=>{
 const expected={
  'rac-esep-2018-150':'refrigeration-03-03',
  'rac-ese-book-4-86':'refrigeration-07-03',
  'rac-ese-book-1-27':'refrigeration-02-01',
  'rac-csem-2019-5c':'refrigeration-05-01',
  'rac-csem-2018-1c':'refrigeration-01-02',
  'rac-csem-2026-7a':'refrigeration-03-02',
  'rac-esem-2024-6ai':'refrigeration-05-03',
  'rac-esem-2026-6a':'refrigeration-09-02',
  'rac-ese-book-4-84':'refrigeration-07-01',
  'rac-xe2021-s1-q8-p56':'refrigeration-08-01',
  'rac-me1-2021-s1-q49-p29':'refrigeration-08-03'
 };
 for(const [id,topic]of Object.entries(expected))assert.equal(rac.find(q=>q.assetId===id)?.topicId,topic,id);
 assert.match(source.find(q=>q.assetId==='rac-esem-2021-3bii').text,/first law of\s+thermodynamics\?/);
 const codeQuestions=source.filter(q=>typeof q.answerDirections==='string'&&q.answerDirections.startsWith('Statement I/II'));assert.equal(codeQuestions.length,14);
 for(const q of codeQuestions)assert(q.cropPanels.length>=2&&/A|both/i.test(q.answerDirections),q.id);
});
