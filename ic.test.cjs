const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),vm=require('vm'),crypto=require('crypto');
const C=require('./catalog.js'),A=require('./answers.js'),D=require('./dedup.js'),U=require('./curriculum.js'),X=require('./crops.js'),Core=require('./core.js'),P=require('./ordered-practice.js'),ctx={window:{}};
for(const f of ['bank.js','fluid-bank.js','heat-bank.js','heat-mains-bank.js','power-bank.js','thermo-bank.js','rac-bank.js','ic-bank.js','tom-bank.js','vibrations-bank.js','md-bank.js','mfg-bank.js','emmat-bank.js','answers-data.js','dedup-data.js','crops-data.js','curriculum-data.js'])vm.runInNewContext(fs.readFileSync(f,'utf8'),ctx);
const d=ctx.window,raw=X.apply(A.apply(C.prepare([{subject:'som',questions:d.SOM_BANK},...d.PYQ_BANKS]),d.PYQ_ANSWER_DATA),d.PYQ_CROP_DATA),lib=D.build(raw,d.PYQ_DEDUP_DATA),bank=U.apply(lib.bank,d.PYQ_CURRICULUM_DATA),ic=bank.filter(q=>q.subject==='ic-engines'),source=raw.filter(q=>q.subject==='ic-engines');
test('IC Engines includes complete supplied numbered sequences and all five exam tracks',()=>{
 assert.equal(source.length,504);assert.equal(ic.length,459);
 for(const [ch,n]of [[2,25],[3,81],[4,59],[5,53]])assert.deepEqual(source.filter(q=>q.assetId.startsWith('ic-ese-book-'+ch+'-')).map(q=>Number(q.number.split('.')[1])).sort((a,b)=>a-b),Array.from({length:n},(_,i)=>i+1));
 const aliases=new Set(source.flatMap(q=>q.verifiedSourceAliases||[]));for(const[prefix,n]of [['thermodynamics:td-gate-book-7-',40],['thermodynamics:td-gate-book-8-',4],['thermodynamics:td-ese-cycle-book-1-',36]])for(let i=1;i<=n;i++)assert(aliases.has(prefix+i),'Missing inherited book exercise '+prefix+i);
 for(const [exam,n]of Object.entries({'gate-me':47,'gate-xe':25,'ese-prelims':300,'ese-mains':36,'cse-mains':51}))assert.equal(ic.filter(q=>q.exam===exam).length,n,exam);
 for(const exam of ['ese-mains','cse-mains'])for(let year=2017;year<=2026;year++)assert(source.some(q=>q.exam===exam&&q.year===year),exam+' '+year);
});
test('IC objective answers grade and printed inconsistencies do not enter automatic marks',()=>{
 assert.deepEqual(A.coverage(ic),{total:459,official:34,book:247,solved:88,written:87,issues:3,pending:0,keyed:369});assert.equal(ic.filter(q=>q.keyConflict).length,0);
 for(const q of ic){assert(q.marks>0&&q.keySource,q.id);if(q.key){const answer=q.type==='NAT'?String(q.key.ranges?.[0][0]??q.key.min):q.key.options;assert.equal(Core.grade(q,answer).score,q.marks,q.id);if(q.type==='NAT')for(const[lo,hi]of q.key.ranges||[[q.key.min,q.key.max]])for(const v of [lo,hi])assert.equal(Core.grade(q,String(v)).score,q.marks,q.id);}else{assert(q.referenceAnswer&&q.explanation,q.id);assert.equal(Core.grade(q,'A').score,null,q.id);if(q.type==='WRITTEN'){assert(q.reviewChecklist&&q.sourceUrl?.includes('upsc.gov.in'),q.id);assert.match(q.keySource,/not an official marking scheme/i,q.id);}}}
 assert.equal(Core.totals(ic.filter(q=>q.answerIssue||q.type==='WRITTEN'),{}).max,0);
 const q=id=>ic.find(q=>q.assetId===id);assert.deepEqual(q('ic-esep-2018-34').key.options,['A']);assert.deepEqual(q('ic-ese-book-2-2').key.options,['A']);assert.deepEqual(q('ic-me2008-s1-q16-p4').key.options,['A']);assert.equal(q('ic-csem-2019-7c').marks,10);
 assert.deepEqual(lib.translate('ic-engines:ic-ese-book-2-19',['B']),['A']);assert.deepEqual(lib.translate('ic-engines:ic-ese-book-5-14',['C']),['D']);
});
test('IC screenshots have checked image bytes, source bounds and required shared context',()=>{
 const packs=new Set(source.map(q=>q.pack));assert.equal(packs.size,8);for(const p of packs){assert(fs.statSync(p).size<4_500_000);vm.runInNewContext(fs.readFileSync(p,'utf8'),ctx);}
 for(const q of source){const uri=d.PYQ_IMAGES[q.assetId];assert(uri?.startsWith('data:image/webp;base64,'),q.id);assert.equal(crypto.createHash('sha256').update(Buffer.from(uri.split(',')[1],'base64')).digest('hex'),q.cropSha256,q.id);for(const p of q.cropPanels||[]){assert(p.box&&p.page>0,q.id);assert(p.box[0]>=0&&p.box[1]>=0&&p.box[2]<=p.pageSize[0]&&p.box[3]<=p.pageSize[1],q.id);assert(p.box[2]>p.box[0]&&p.box[3]>p.box[1],q.id);}}
 for(const id of ['ic-esep-2023-5','ic-esep-2023-6','ic-esep-2023-8','ic-esep-2023-9','ic-xe2011-s1-q19-p24','ic-xe2011-s1-q20-p24'])assert(source.find(q=>q.assetId===id)?.cropPanels.length>=2,id);
});
test('IC practice runs in complete teaching order and preserves previous progress',()=>{
 const outline=U.outline(ic);assert.equal(outline.length,10);assert.equal(new Set(ic.map(q=>q.topicId)).size,33);assert.equal(outline[0].name,'Engine Fundamentals and Operating Principles');assert.equal(outline.at(-1).name,'Engine Testing and Performance');
 const ids=U.sessionIds(ic.map(q=>q.id).reverse(),bank),path=P.open(null,ids);assert.equal(path.ids.length,459);assert.deepEqual(path.ids,ic.map(q=>q.id));assert.equal(path.deadline,null);
 assert.equal(bank.filter(q=>!['ic-engines','theory-of-machines','vibrations','machine-design','manufacturing','engineering-mechanics','materials'].includes(q.subject)).length,6731);const prior=JSON.parse(fs.readFileSync('ic-compatibility.json','utf8'));assert.equal(prior.preserved,6731);assert.equal(prior.storage,'som-lab-v1');
 const expected={'ic-esem-2017-3a':'ic-engines-05-02','ic-esep-2017-24':'ic-engines-06-01','ic-esem-2025-4cii':'ic-engines-08-01','ic-csem-2023-6a':'ic-engines-10-03','ic-ese-book-2-3':'ic-engines-06-01','ic-xe26-s1-q107-p71':'ic-engines-02-03'};for(const[id,topic]of Object.entries(expected))assert.equal(ic.find(q=>q.assetId===id)?.topicId,topic,id);
 const session={ids:['gate-me-002','gate-me-001'],index:1,mode:'practice',answers:{'gate-me-001':'B'},times:{}};assert.deepEqual(D.migrate({session,attempts:[]},lib).session,session);
});
