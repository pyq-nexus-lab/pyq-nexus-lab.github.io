const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),vm=require('vm'),crypto=require('crypto');
const C=require('./catalog.js'),A=require('./answers.js'),D=require('./dedup.js'),U=require('./curriculum.js'),X=require('./crops.js'),Core=require('./core.js'),P=require('./ordered-practice.js'),ctx={window:{}};
for(const f of ['bank.js','fluid-bank.js','heat-bank.js','heat-mains-bank.js','power-bank.js','thermo-bank.js','rac-bank.js','ic-bank.js','tom-bank.js','vibrations-bank.js','md-bank.js','mfg-bank.js','answers-data.js','dedup-data.js','crops-data.js','curriculum-data.js'])vm.runInNewContext(fs.readFileSync(f,'utf8'),ctx);
const d=ctx.window,raw=X.apply(A.apply(C.prepare([{subject:'som',questions:d.SOM_BANK},...d.PYQ_BANKS]),d.PYQ_ANSWER_DATA),d.PYQ_CROP_DATA),lib=D.build(raw,d.PYQ_DEDUP_DATA),bank=U.apply(lib.bank,d.PYQ_CURRICULUM_DATA),subjects=['theory-of-machines','vibrations'],added=bank.filter(q=>subjects.includes(q.subject)),source=raw.filter(q=>subjects.includes(q.subject));
test('TOM and Vibrations remain separate and cover supplied sequences and Mains years',()=>{
 assert.equal(source.length,1027);assert.equal(added.length,1015);assert.equal(added.filter(q=>q.subject==='theory-of-machines').length,746);assert.equal(added.filter(q=>q.subject==='vibrations').length,269);
 for(const[ch,n]of [[1,23],[2,38],[3,7],[4,6],[5,42],[6,13],[7,67],[8,10]])assert.deepEqual(source.filter(q=>q.assetId.startsWith('tv-gate-book-'+ch+'-')).map(q=>Number(q.assetId.split('-').at(-1))).sort((a,b)=>a-b),Array.from({length:n},(_,i)=>i+1));
 assert.equal(source.filter(q=>q.assetId.startsWith('tv-ese-')).length,590);
 for(const exam of ['ese-mains','cse-mains'])for(let year=2017;year<=2026;year++)assert(source.some(q=>q.exam===exam&&q.year===year),exam+' '+year);
 assert(source.some(q=>q.exam==='gate-xe'&&q.subject==='vibrations'));assert(source.some(q=>q.year<2000));assert(source.some(q=>q.year===2026));
});
test('New grading keys and source issues behave correctly',()=>{
 assert.deepEqual(A.coverage(added),{total:1015,official:87,book:652,solved:146,written:124,issues:6,pending:0,keyed:885});assert.equal(added.filter(q=>q.keyConflict).length,0);
 for(const q of added){assert(q.marks>0,q.id);if(q.key){assert(q.keySource,q.id);const answer=q.type==='NAT'?String(q.key.ranges?.[0][0]??q.key.min):q.key.options;assert.equal(Core.grade(q,answer).score,q.marks,q.id);}else{assert(q.referenceAnswer&&q.explanation,q.id);assert.equal(Core.grade(q,'A').score,null,q.id);if(q.exam.endsWith('mains'))assert(q.reviewChecklist&&q.sourceUrl?.includes('upsc.gov.in'),q.id);}}
 assert.equal(Core.totals(added.filter(q=>q.answerIssue||q.type==='WRITTEN'),{}).max,0);
 const q=id=>source.find(q=>q.assetId===id);assert.equal(q('tv-gate-book-2-37').key.options.join(''),'A');assert.match(q('tv-csem-2026-1d').referenceAnswer,/14/);assert.match(q('tv-csem-2026-1d').referenceAnswer,/35/);assert(source.some(q=>q.id.includes('me2007')&&q.id.includes('q73')&&q.answerIssue));
 assert.deepEqual(lib.translate('theory-of-machines:tv-ese-b09_008',['A']),['B']);
});
test('Every new screenshot matches its reviewed bytes and shared context is present',()=>{
 const packs=new Set(source.map(q=>q.pack));assert.equal(packs.size,23);for(const p of packs){assert(fs.statSync(p).size<4_500_000);vm.runInNewContext(fs.readFileSync(p,'utf8'),ctx);}
 for(const q of source){const uri=d.PYQ_IMAGES[q.assetId];assert(uri?.startsWith('data:image/webp;base64,'),q.id);assert.equal(crypto.createHash('sha256').update(Buffer.from(uri.split(',')[1],'base64')).digest('hex'),q.cropSha256,q.id);assert(q.width>100&&q.height>50,q.id);assert(q.cropPanels?.length,q.id);}
 for(const id of ['tv-ese-p2023_092','tv-ese-p2023_093','tv-ese-p2023_095'])assert(source.find(q=>q.assetId===id)?.cropPanels.length>=2,id);
});
test('Teaching paths are continuous, ordered and preserve all earlier identities',()=>{
 for(const [subject,n,chapters]of [['theory-of-machines',746,12],['vibrations',269,8]]){const qs=added.filter(q=>q.subject===subject);assert.equal(U.outline(qs).length,chapters);const path=P.open(null,U.sessionIds(qs.map(q=>q.id).reverse(),bank));assert.equal(path.ids.length,n);assert.deepEqual(path.ids,qs.map(q=>q.id));assert.equal(path.deadline,null);}
 assert.equal(bank.filter(q=>!subjects.includes(q.subject)&&!['machine-design','manufacturing'].includes(q.subject)).length,7190);const prior=JSON.parse(fs.readFileSync('tom-vibrations-compatibility.json','utf8'));assert.equal(prior.preserved,7190);assert.equal(prior.storage,'som-lab-v1');
 const expected={'tv-ese-p2023_095':'theory-of-machines-11-02','tv-gate-book-7-18':'vibrations-03-02','tv-ese-b02_026':'theory-of-machines-03-02','tv-ese-p2019_101':'vibrations-07-01'};for(const[id,topic]of Object.entries(expected))assert.equal(added.find(q=>q.assetId===id)?.topicId,topic,id);
});
