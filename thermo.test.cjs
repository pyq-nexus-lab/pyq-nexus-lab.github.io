const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),vm=require('vm'),crypto=require('crypto');
const P=require('./catalog.js'),A=require('./answers.js'),D=require('./dedup.js'),U=require('./curriculum.js'),X=require('./crops.js'),Core=require('./core.js'),ctx={window:{}};
for(const f of ['bank.js','fluid-bank.js','heat-bank.js','heat-mains-bank.js','power-bank.js','thermo-bank.js','answers-data.js','dedup-data.js','crops-data.js','curriculum-data.js'])vm.runInNewContext(fs.readFileSync(f,'utf8'),ctx);
const d=ctx.window,raw=X.apply(A.apply(P.prepare([{subject:'som',questions:d.SOM_BANK},...d.PYQ_BANKS]),d.PYQ_ANSWER_DATA),d.PYQ_CROP_DATA),lib=D.build(raw,d.PYQ_DEDUP_DATA),bank=U.apply(lib.bank,d.PYQ_CURRICULUM_DATA),td=bank.filter(q=>q.subject==='thermodynamics'),source=raw.filter(q=>q.subject==='thermodynamics'),audit=JSON.parse(fs.readFileSync('thermo-source-audit.json','utf8'));
test('Thermodynamics includes complete numbered old books, every XE section question and all five exam sections',()=>{
 assert.equal(source.length,1898);assert.equal(td.length,1709);
 for(const [exam,count]of Object.entries({'gate-me':394,'gate-xe':458,'ese-prelims':712,'ese-mains':72,'cse-mains':73}))assert.equal(td.filter(q=>q.exam===exam).length,count);
 for(const [prefix,counts]of [['td-ese-book-',[46,109,119,20,40,42]],['td-gate-book-',[7,45,54,8,23]],['td-ese-cycle-book-',[36]]])for(const [i,n]of counts.entries())assert.deepEqual(source.filter(q=>q.assetId.startsWith(prefix+(i+1)+'-')).map(q=>Number(q.number.split('.')[1])).sort((a,b)=>a-b),Array.from({length:n},(_,j)=>j+1));
 assert.equal(source.filter(q=>q.assetId.startsWith('td-gate-book-7-')).length,40);assert.equal(source.filter(q=>q.assetId.startsWith('td-gate-book-8-')).length,6);
 for(let year=2007;year<=2026;year++){const n=year===2007?28:year===2008?30:year===2009?24:22,qs=source.filter(q=>q.year===year&&q.assetId.startsWith('td-xe'));assert.equal(qs.length,n,year);assert.deepEqual(qs.map(q=>Number(q.number)).sort((a,b)=>a-b),Array.from({length:n},(_,i)=>i+1),year);}
 for(const exam of ['ese-mains','cse-mains'])for(let year=2017;year<=2026;year++)assert(td.some(q=>q.exam===exam&&q.year===year),exam+' '+year);
});
test('every objective answer grades and contradictory sources or written references cannot produce automatic marks',()=>{
 assert.deepEqual(A.coverage(td),{total:1709,official:407,book:728,solved:413,written:145,issues:16,pending:0,keyed:1548});assert.equal(td.filter(q=>q.keyConflict).length,0);
 for(const q of td){assert(q.marks>0&&q.keySource,q.id);if(q.key){const answer=q.type==='NAT'?String(q.key.ranges?.[0][0]??q.key.min):q.type==='TEXT'?q.key.acceptedText[0]:q.key.options;assert.equal(Core.grade(q,answer).score,q.marks,q.id);}else{assert(q.referenceAnswer&&q.explanation,q.id);assert.equal(Core.grade(q,'A').score,null,q.id);if(q.type==='WRITTEN')assert(q.reviewChecklist&&q.sourceUrl?.includes('upsc.gov.in'),q.id);}}
 assert.equal(Core.totals(td.filter(q=>q.answerIssue),{}).max,0);
});
test('every screenshot matches its digest and fits the recorded source geometry, including linked tables',()=>{
 const packs=new Set(source.map(q=>q.pack));assert.equal(packs.size,36);for(const p of packs){assert(fs.statSync(p).size<4_500_000);vm.runInNewContext(fs.readFileSync(p,'utf8'),ctx);}
 for(const q of source){const uri=d.PYQ_IMAGES[q.assetId];assert(uri?.startsWith('data:image/webp;base64,'),q.id);assert.equal(crypto.createHash('sha256').update(Buffer.from(uri.split(',')[1],'base64')).digest('hex'),q.cropSha256,q.id);for(const p of q.cropPanels||[]){if(p.box){assert(p.page>0&&p.box[0]>=0&&p.box[1]>=0&&p.box[2]<=p.pageSize[0]&&p.box[3]<=p.pageSize[1],q.id);assert(p.box[2]>p.box[0]&&p.box[3]>p.box[1],q.id);}else{const b=p.wordCropBox,s=p.embeddedImageSize;assert(b&&s&&b[0]>=0&&b[1]>=0&&b[2]<=s[0]&&b[3]<=s[1],q.id);}}}
 for(const id of ['td-me2008-s1-q71-p17','td-me2008-s1-q72-p17','td-me2011-s1-q54-p12','td-me2012-s1-q50-p10','td-xe2013-s1-q22-p31']){const q=source.find(q=>q.assetId===id);assert(q?.sharedContext&&q.cropPanels.length>=2,id);}
});
test('the subject follows teaching order and preserves all existing question identities and progress',()=>{
 const outline=U.outline(td);assert.equal(outline.length,18);assert.equal(new Set(td.map(q=>q.topicId)).size,61);assert.equal(outline[0].name,'Basic Concepts and Zeroth Law');assert.equal(outline.at(-1).name,'Compressible Flow Applications');
 const prior=JSON.parse(fs.readFileSync('thermo-compatibility.json','utf8')),rows=bank.filter(q=>q.subject!=='thermodynamics').map(q=>Object.fromEntries(prior.checkedFields.map(k=>[k,q[k]??null]))).sort((a,b)=>a.id.localeCompare(b.id));assert.equal(rows.length,4533);assert.equal(crypto.createHash('sha256').update(JSON.stringify(rows)).digest('hex'),prior.sha256);
 const session={ids:['gate-me-002','gate-me-001'],index:1,mode:'practice',answers:{'gate-me-001':'B'},times:{}};assert.deepEqual(D.migrate({session,attempts:[]},lib).session,session);
});
