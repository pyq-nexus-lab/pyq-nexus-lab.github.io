const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),vm=require('vm'),crypto=require('crypto');
const P=require('./catalog.js'),A=require('./answers.js'),D=require('./dedup.js'),U=require('./curriculum.js'),X=require('./crops.js'),Core=require('./core.js'),ctx={window:{}};
for(const f of ['bank.js','fluid-bank.js','heat-bank.js','heat-mains-bank.js','power-bank.js','thermo-bank.js','answers-data.js','dedup-data.js','crops-data.js','curriculum-data.js'])vm.runInNewContext(fs.readFileSync(f,'utf8'),ctx);
const d=ctx.window,raw=X.apply(A.apply(P.prepare([{subject:'som',questions:d.SOM_BANK},...d.PYQ_BANKS]),d.PYQ_ANSWER_DATA),d.PYQ_CROP_DATA),lib=D.build(raw,d.PYQ_DEDUP_DATA),bank=U.apply(lib.bank,d.PYQ_CURRICULUM_DATA),pp=bank.filter(q=>q.subject==='power-plant'),source=raw.filter(q=>q.subject==='power-plant'),audit=JSON.parse(fs.readFileSync('power-source-audit.json','utf8')),by=id=>pp.find(q=>q.assetId===id);
test('Power Plant includes the complete numbered Word and solved-book chapters and all five exam sections',()=>{
 assert.equal(source.length,771);assert.equal(pp.length,767);
 for(const [exam,count]of Object.entries({'gate-me':111,'gate-xe':78,'ese-prelims':397,'ese-mains':98,'cse-mains':83}))assert.equal(pp.filter(q=>q.exam===exam).length,count);
 for(const [ch,count]of [220,77,35,68].entries())assert.deepEqual(source.filter(q=>q.assetId.startsWith('pp-esep-'+(ch+1)+'-')).map(q=>Number(q.docxLabel.split('.')[1])).sort((a,b)=>a-b),Array.from({length:count},(_,i)=>i+1));
 assert.deepEqual(source.filter(q=>q.assetId.startsWith('pp-gate-book-6-')).map(q=>Number(q.number.split('.')[1])).sort((a,b)=>a-b),Array.from({length:87},(_,i)=>i+1));
 assert.equal(audit.docx.representedBeforeDedup,400);assert.equal(audit.gateSolvedBook.represented,87);
 assert.equal(P.subjects.filter(s=>s.id==='power-plant').length,1);
});
test('every reference answer grades correctly; source errata and written solutions never become automatic marks',()=>{
 assert.deepEqual(A.coverage(pp),{total:767,official:71,book:282,solved:223,written:181,issues:10,pending:0,keyed:576});
 for(const q of pp){assert(q.marks>0&&q.keySource,q.id);if(q.key){const response=q.type==='NAT'?String(q.key.ranges?.[0][0]??q.key.min):q.type==='TEXT'?q.key.acceptedText[0]:q.key.options;assert.equal(Core.grade(q,response).score,q.marks,q.id);if(q.type==='NAT')for(const [min,max]of q.key.ranges||[[q.key.min,q.key.max]]){assert.equal(Core.grade(q,String(min)).status,'correct');assert.equal(Core.grade(q,String(max)).status,'correct');}}
 else{assert(q.referenceAnswer&&q.explanation,q.id);assert.equal(Core.grade(q,'A').score,null);if(q.type==='WRITTEN'){assert(q.referenceAnswer.length>100&&q.reviewChecklist.length>40,q.id);assert.match(q.keySource,/not an official marking scheme/);}}
 }
 assert.equal(Core.grade(by('pp-me1-2018-45'),'447.214').status,'correct');assert.equal(Core.grade(by('pp-me1-2018-45'),'538.516').status,'wrong');
 assert.equal(Core.grade(by('pp-xe2013-22'),'22').status,'correct');assert.equal(Core.grade(by('pp-xe2013-22'),'44').status,'wrong');
 assert.equal(Core.totals(pp.filter(q=>q.answerIssue),{}).max,0);
});
test('Mains provenance covers both official UPSC papers in every year and preserves 181 self-assessment problems',()=>{
 assert.equal(audit.officialMainsPapers.length,40);
 for(const exam of ['ese-mains','cse-mains'])for(let year=2017;year<=2026;year++){
  assert(pp.some(q=>q.exam===exam&&q.year===year));for(const paper of [1,2])assert(audit.officialMainsPapers.some(p=>p.exam===exam&&p.year===year&&p.paper===paper));
 }
 for(const p of audit.officialMainsPapers){assert.equal(new URL(p.url).hostname.replace(/^www\./,''),'upsc.gov.in');assert.equal(p.sha256.length,64);assert(p.downloaded&&p.bytes>1000);}
 const a=by('pp-csem-2020-1c'),b=by('pp-csem-2020-2c');assert(a&&b);assert.notEqual(a.cropSha256,b.cropSha256);assert.match(a.referenceAnswer,/supersonic|M.*1/i);
});
test('every Power Plant screenshot has verified bytes and valid native source bounds',()=>{
 const packs=new Set(source.map(q=>q.pack));assert.equal(packs.size,22);for(const p of packs){assert(fs.statSync(p).size<4_500_000);vm.runInNewContext(fs.readFileSync(p,'utf8'),ctx);}
 for(const q of source){const uri=d.PYQ_IMAGES[q.assetId];assert(uri?.startsWith('data:image/webp;base64,'),q.id);assert.equal(crypto.createHash('sha256').update(Buffer.from(uri.split(',')[1],'base64')).digest('hex'),q.cropSha256,q.id);
  for(const p of q.cropPanels||[])if(p.box){assert(p.page>0&&p.box[0]>=0&&p.box[1]>=0&&p.box[2]<=p.pageSize[0]&&p.box[3]<=p.pageSize[1],q.id);assert(p.box[2]>p.box[0]&&p.box[3]>p.box[1],q.id);}
 }
 assert(by('pp-me26pyq-44').cropPanels.some(p=>p.box[3]>=765),'2026 option D diagram retained');
});
test('duplicate consolidation translates reordered choices and keeps linked requested quantities separate',()=>{
 const ns=id=>'power-plant:'+id;assert.equal(lib.resolve(ns('pp-gate-book-6-83')),ns('pp-gate-book-6-82'));
 for(const n of [125,153,167])assert.equal(lib.resolve(ns('pp-esep-1-'+n)),ns('pp-esep-1-118'));
 assert.equal(lib.translate(ns('pp-esep-1-125'),'A'),'D');assert.equal(lib.translate(ns('pp-esep-1-125'),'B'),'C');
 for(const n of [153,167]){const q=lib.original.get(ns('pp-esep-1-'+n));assert.equal(q.key,null);assert(q.sourceKey&&q.duplicateChoiceNote);}
 assert.notEqual(lib.resolve(ns('pp-shared-fm-gate-me-143')),lib.resolve(ns('pp-shared-fm-gate-me-143-linked-55')));
 assert.notEqual(lib.resolve(ns('pp-esep-1-140')),lib.resolve(ns('pp-esep-1-167')));
});
test('teaching order and existing SOM/FM/HT progress identities remain stable',()=>{
 const outline=U.outline(pp);assert.equal(outline.length,12);assert.equal(new Set(pp.map(q=>q.topicId)).size,44);assert.equal(outline[0].name,'Steam Properties and Energy Balances');assert.equal(outline.at(-1).name,'Plant Economics and Energy Management');
 assert.equal(by('pp-csem-2020-1c').topicId,'power-plant-04-02');assert.equal(by('pp-xe26-187').topicId,'power-plant-11-02');assert(pp.every(q=>q.chapterId&&q.topicId));
 const prior=JSON.parse(fs.readFileSync('power-compatibility.json','utf8')),rows=bank.filter(q=>!['power-plant','thermodynamics'].includes(q.subject)).map(q=>Object.fromEntries(prior.checkedFields.map(k=>[k,q[k]??null]))).sort((a,b)=>a.id.localeCompare(b.id));assert.equal(rows.length,3766);assert.equal(crypto.createHash('sha256').update(JSON.stringify(rows)).digest('hex'),prior.sha256);
 const session={ids:['gate-me-002','gate-me-001'],index:1,mode:'practice',answers:{'gate-me-001':'B'},times:{}};assert.deepEqual(D.migrate({session,attempts:[]},lib).session,session);
});
