const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),vm=require('vm'),crypto=require('crypto');
const C=require('./catalog.js'),A=require('./answers.js'),D=require('./dedup.js'),U=require('./curriculum.js'),X=require('./crops.js'),Core=require('./core.js'),P=require('./ordered-practice.js'),ctx={window:{}};
for(const f of ['bank.js','fluid-bank.js','heat-bank.js','heat-mains-bank.js','power-bank.js','thermo-bank.js','rac-bank.js','ic-bank.js','tom-bank.js','vibrations-bank.js','md-bank.js','mfg-bank.js','emmat-bank.js','answers-data.js','dedup-data.js','crops-data.js','curriculum-data.js'])vm.runInNewContext(fs.readFileSync(f,'utf8'),ctx);
const d=ctx.window,raw=X.apply(A.apply(C.prepare([{subject:'som',questions:d.SOM_BANK},...d.PYQ_BANKS]),d.PYQ_ANSWER_DATA),d.PYQ_CROP_DATA),bank=U.apply(D.build(raw,d.PYQ_DEDUP_DATA).bank,d.PYQ_CURRICULUM_DATA),subjects=['engineering-mechanics','materials'],added=bank.filter(q=>subjects.includes(q.subject)),source=raw.filter(q=>subjects.includes(q.subject)),q=id=>source.find(q=>q.assetId===id);
test('Separate Mechanics and Materials banks cover numbered archive sections and requested recent years',()=>{
 assert.equal(source.length,1574);assert.equal(added.length,1426);assert.deepEqual(subjects.map(s=>added.filter(q=>q.subject===s).length),[411,1015]);
 const audit=JSON.parse(fs.readFileSync('emmat-source-audit.json','utf8'));
 for(const section of audit.bookSections){const prefix='emmat-'+section.source+'-'+section.chapter+'-';assert.deepEqual(source.filter(q=>q.assetId.startsWith(prefix)).map(q=>Number(q.assetId.split('-').at(-1))).sort((a,b)=>a-b),Array.from({length:section.expected},(_,i)=>i+1),prefix);}
 for(const s of subjects)for(const exam of ['ese-mains','cse-mains','ese-prelims','gate-me','gate-xe'])for(let year=2017;year<=2026;year++)assert(source.some(q=>q.subject===s&&q.exam===exam&&q.year===year),s+' '+exam+' '+year);
});
test('Every new question has a usable answer, and disputed sources cannot enter automatic scores',()=>{
 assert.deepEqual(A.coverage(added),{total:1426,official:527,book:392,solved:378,written:112,issues:17,pending:0,keyed:1297});
 for(const v of added){assert(v.marks>0,v.id);assert(!v.keyConflict,v.id);if(v.key){assert(v.keySource,v.id);const answer=v.type==='NAT'?String(v.key.ranges?.[0][0]??v.key.min):v.key.options;assert.equal(Core.grade(v,answer).score,v.marks,v.id);}else{assert(v.referenceAnswer&&v.explanation,v.id);assert.equal(Core.grade(v,'A').score,null,v.id);}}
 assert.equal(Core.totals(added.filter(q=>q.answerIssue||q.type==='WRITTEN'),{}).max,0);
 assert(q('emmat-esep-2020-95').answerIssue);assert(q('emmat-esep-2017-145').answerDirections);
 assert.equal(q('emmat-me2009-s1-q41-p8').key.options.join(''),'B');
});
test('All images decode from the exact reviewed crop bytes; complete linked questions remain independent',()=>{
 const packs=new Set(source.map(q=>q.pack));assert.equal(packs.size,24);for(const p of packs){assert(fs.statSync(p).size<4_500_000);vm.runInNewContext(fs.readFileSync(p,'utf8'),ctx);}
 for(const v of source){const uri=d.PYQ_IMAGES[v.assetId];assert(uri?.startsWith('data:image/webp;base64,'),v.id);assert.equal(crypto.createHash('sha256').update(Buffer.from(uri.split(',')[1],'base64')).digest('hex'),v.cropSha256,v.id);assert(v.cropPanels?.length,v.id);}
 for(const id of ['emmat-xe2009-c-s1-q19-p12','emmat-xe2009-c-s1-q20-p12','emmat-me2012-s1-q48-p10'])assert(q(id).cropPanels.length>=2,id);
 assert(!q('emmat-xe2015-c-s1-q15-p19').text.includes('Correct Answer'));
 assert(q('emmat-xe2023-c-s1-q7-p32').text.includes('The tensile true stress'));
 assert(q('emmat-xe2021-d-s1-q16-p48').height>500);
});
test('Each full subject follows its teaching path without a session-size cap and preserves prior IDs',()=>{
 for(const[s,chapters,total]of [['engineering-mechanics',9,411],['materials',14,1015]]){const qs=bank.filter(q=>q.subject===s);assert.equal(U.outline(qs).length,chapters);const path=P.open(null,U.sessionIds(qs.map(q=>q.id).reverse(),bank));assert.equal(path.ids.length,total);assert.deepEqual(path.ids,qs.map(q=>q.id));assert.equal(path.deadline,null);}
 assert.equal(bank.length,12109);assert.equal(bank.filter(q=>!subjects.includes(q.subject)).length,10683);const prior=JSON.parse(fs.readFileSync('emmat-compatibility.json','utf8'));assert.equal(prior.preserved,10683);assert.equal(prior.storage,'som-lab-v1');
 for(const[id,topic]of Object.entries({'emmat-esep-2023-79':'materials-12-01','emmat-me2015-s3-q12-p52':'engineering-mechanics-03-03','emmat-xe2020-d-s1-q18-p24':'engineering-mechanics-02-02'}))assert.equal(added.find(q=>q.assetId===id).topicId,topic);
});
