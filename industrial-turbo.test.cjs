const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),vm=require('vm'),crypto=require('crypto');
const C=require('./catalog.js'),A=require('./answers.js'),D=require('./dedup.js'),U=require('./curriculum.js'),X=require('./crops.js'),Core=require('./core.js'),P=require('./ordered-practice.js'),ctx={window:{}};
for(const f of ['bank.js','fluid-bank.js','heat-bank.js','heat-mains-bank.js','power-bank.js','thermo-bank.js','rac-bank.js','ic-bank.js','tom-bank.js','vibrations-bank.js','md-bank.js','mfg-bank.js','emmat-bank.js','industrial-turbo-bank.js','foundations-bank.js','answers-data.js','dedup-data.js','crops-data.js','curriculum-data.js'])vm.runInNewContext(fs.readFileSync(f,'utf8'),ctx);
const d=ctx.window,raw=X.apply(A.apply(C.prepare([{subject:'som',questions:d.SOM_BANK},...d.PYQ_BANKS]),d.PYQ_ANSWER_DATA),d.PYQ_CROP_DATA),lib=D.build(raw,d.PYQ_DEDUP_DATA),bank=U.apply(lib.bank,d.PYQ_CURRICULUM_DATA),subjects=['industrial','turbomachinery'],added=bank.filter(q=>subjects.includes(q.subject)),source=raw.filter(q=>q.id.split(':')[1]?.startsWith('it-'));
test('Industrial and Turbomachinery are separate continuous teaching paths, with every recent Mains year represented',()=>{
 for(const[s,chapters,total]of [['industrial',13,781],['turbomachinery',11,1040]]){const qs=bank.filter(q=>q.subject===s);assert.equal(qs.length,total);assert.equal(U.outline(qs).length,chapters);const path=P.open(null,U.sessionIds(qs.map(q=>q.id).reverse(),bank));assert.equal(path.ids.length,total);assert.deepEqual(path.ids,qs.map(q=>q.id));assert.equal(path.deadline,null);for(const exam of ['ese-mains','cse-mains','ese-prelims'])for(let year=2017;year<=(s==='industrial'&&exam==='ese-prelims'?2025:2026);year++)assert(qs.some(q=>q.exam===exam&&q.occurrences.some(o=>o.year===year)),s+' '+exam+' '+year);}
 assert.equal(raw.length,17775);assert.equal(bank.length,15135);assert.equal(A.coverage(added).pending,0);
});
test('Every added problem has a grading key or an explicit written/source-issue reference',()=>{
 assert.deepEqual(A.coverage(added),{total:1821,official:153,book:1188,solved:247,written:218,issues:15,pending:0,keyed:1588});
 for(const q of added){assert(!q.keyConflict,q.id);assert(q.marks>0,q.id);if(q.key&&!q.answerIssue){const answer=q.type==='NAT'?String(q.key.ranges?.[0][0]??q.key.min):q.type==='TEXT'?q.key.acceptedText[0]:q.key.options;assert.equal(Core.grade(q,answer).score,q.marks,q.id);assert(q.keySource,q.id);}else{assert(q.referenceAnswer&&q.explanation,q.id);assert.equal(Core.grade(q,'A').score,null,q.id);}}
 assert.equal(Core.totals(added.filter(q=>q.answerIssue||q.type==='WRITTEN'),{}).max,0);
});
test('Reviewed images have exact crop hashes, complete shared context and no 2015 answer widgets',()=>{
 const fresh=source.filter(q=>q.pack.startsWith('it-assets-')),packs=new Set(fresh.map(q=>q.pack));assert.equal(packs.size,20);
 for(const f of packs){assert(fs.statSync(f).size<4_500_000);vm.runInNewContext(fs.readFileSync(f,'utf8'),ctx);}
 for(const q of fresh){const uri=d.PYQ_IMAGES[q.assetId];assert(uri?.startsWith('data:image/webp;base64,'),q.id);const bytes=Buffer.from(uri.split(',')[1],'base64');assert.equal(bytes.subarray(0,4).toString(),'RIFF');assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),q.cropSha256,q.id);assert(q.cropPanels.length,q.id);}
 for(const n of ['3-7','3-8','3-11','3-12','3-15','3-16','4-9','4-10','4-14','4-15','4-17','4-18','6-15','6-16'])assert(source.find(q=>q.assetId==='it-gate-industrial-'+n).cropPanels.length>1,n);
 for(const n of ['it-csem-2025-1b','it-csem-2025-2b','it-esem-2026-6ai'])assert(source.find(q=>q.assetId===n).cropPanels.some(p=>p.appendix),n);
 assert(!source.find(q=>q.assetId==='it-me2015-s2-q35-p37').text.includes('1. x'));
});
test('Old subject IDs, reordered options and linked-question independence survive consolidation',()=>{
 const old='fluid-mechanics:fluid-gate-book-7-16',target=lib.resolve(old);assert(target.startsWith('turbomachinery:'));assert(bank.some(q=>q.id===target));
 const alias='industrial:it-gate-industrial-1-22';assert.equal(lib.translate(alias,'A'),'D');
 const state=D.migrate({attempts:[{id:alias,answer:'A',at:1},{id:old,answer:'A',at:2}],notes:{[old]:'my derivation'},bookmarks:{[old]:true},session:{ids:[old,alias],index:0,answers:{[alias]:'A'}}},lib);assert.equal(state.attempts[0].answer,'D');assert.equal(state.notes[target],'my derivation');assert(state.bookmarks[target]);
 assert.notEqual(lib.resolve('industrial:it-gate-industrial-4-9'),lib.resolve('industrial:it-gate-industrial-4-10'));
 assert.notEqual(lib.resolve('turbomachinery:it-esep-2023-13'),lib.resolve('turbomachinery:it-esep-2023-14'));
 assert.equal(bank.find(q=>q.assetId==='it-ese-turbo-5-20').subject,'power-plant');
 assert.equal(bank.find(q=>q.assetId==='it-ese-turbo-5-107').subject,'thermodynamics');
 require('./compatibility.cjs').verifyPrior(bank,lib);
 const audit=JSON.parse(fs.readFileSync('industrial-turbo-compatibility.json','utf8'));assert(audit.allPriorIdsResolve);assert.equal(audit.priorCanonical,12109);assert.equal(audit.preserved+audit.relocated,12109);
 const coverage=JSON.parse(fs.readFileSync('industrial-turbo-coverage.json','utf8'));assert(coverage.limits.some(s=>s.includes('26 printed questions')));
});
