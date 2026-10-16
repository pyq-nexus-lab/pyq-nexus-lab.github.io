const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),vm=require('vm'),crypto=require('crypto');
const C=require('./catalog.js'),A=require('./answers.js'),D=require('./dedup.js'),U=require('./curriculum.js'),X=require('./crops.js'),Core=require('./core.js'),P=require('./ordered-practice.js'),ctx={window:{}};
for(const f of ['bank.js','fluid-bank.js','heat-bank.js','heat-mains-bank.js','power-bank.js','thermo-bank.js','rac-bank.js','ic-bank.js','tom-bank.js','vibrations-bank.js','md-bank.js','mfg-bank.js','emmat-bank.js','answers-data.js','dedup-data.js','crops-data.js','curriculum-data.js'])vm.runInNewContext(fs.readFileSync(f,'utf8'),ctx);
const d=ctx.window,raw=X.apply(A.apply(C.prepare([{subject:'som',questions:d.SOM_BANK},...d.PYQ_BANKS]),d.PYQ_ANSWER_DATA),d.PYQ_CROP_DATA),lib=D.build(raw,d.PYQ_DEDUP_DATA),bank=U.apply(lib.bank,d.PYQ_CURRICULUM_DATA),added=bank.filter(q=>q.subject==='manufacturing'),source=raw.filter(q=>q.subject==='manufacturing');
test('Manufacturing contains every numbered source section and all requested Mains years',()=>{
 assert.equal(source.length,2020);assert.equal(added.length,1756);
 const audit=JSON.parse(fs.readFileSync('manufacturing-source-audit.json','utf8'));
 for(const section of audit.bookSections){const prefix='mfg-'+section.source+'-'+section.chapter+'-';assert.deepEqual(source.filter(q=>q.assetId.startsWith(prefix)).map(q=>Number(q.assetId.split('-').at(-1))).sort((a,b)=>a-b),Array.from({length:section.expected},(_,i)=>i+1));}
 for(const exam of ['ese-mains','cse-mains','ese-prelims','gate-me'])for(let year=2017;year<=2026;year++)assert(source.some(q=>q.exam===exam&&q.year===year),exam+' '+year);
 assert.deepEqual(Object.fromEntries(['gate-me','gate-pi','ese-prelims','ese-mains','cse-mains'].map(e=>[e,added.filter(q=>q.exam===e).length])),{'gate-me':553,'gate-pi':393,'ese-prelims':685,'ese-mains':52,'cse-mains':73});
});
test('Manufacturing answers grade correctly and source issues are excluded from automatic marks',()=>{
 assert.deepEqual(A.coverage(added),{total:1756,official:213,book:1217,solved:106,written:215,issues:5,pending:0,keyed:1536});assert.equal(added.filter(q=>q.keyConflict).length,0);
 for(const q of added){assert(q.marks>0,q.id);if(q.key){assert(q.keySource,q.id);const answer=q.type==='NAT'?String(q.key.ranges?.[0][0]??q.key.min):q.type==='TEXT'?q.key.acceptedText[0]:q.key.options;assert.equal(Core.grade(q,answer).score,q.marks,q.id);}else{assert(q.referenceAnswer&&q.explanation,q.id);assert.equal(Core.grade(q,'A').score,null,q.id);}}
 assert.equal(Core.totals(added.filter(q=>q.answerIssue||q.type==='WRITTEN'),{}).max,0);
 const q=id=>source.find(q=>q.assetId===id);assert.equal(q('mfg-ese-book-4-51').key.options.join(''),'C');assert(q('mfg-gate-book-5-67').answerIssue);assert.equal(q('mfg-me2-2020-s2-q43-p14').type,'NAT');
});
test('Manufacturing crop bytes, page-break repairs and shared statements remain intact',()=>{
 const packs=new Set(source.map(q=>q.pack));assert.equal(packs.size,25);for(const p of packs){assert(fs.statSync(p).size<4_500_000);vm.runInNewContext(fs.readFileSync(p,'utf8'),ctx);}
 for(const q of source){const uri=d.PYQ_IMAGES[q.assetId];assert(uri?.startsWith('data:image/webp;base64,'),q.id);assert.equal(crypto.createHash('sha256').update(Buffer.from(uri.split(',')[1],'base64')).digest('hex'),q.cropSha256,q.id);assert(q.width>100&&q.height>45,q.id);assert(q.cropPanels?.length,q.id);}
 const q=id=>source.find(q=>q.assetId===id);
 for(const id of ['mfg-gate-book-6-159','mfg-gate-book-6-160','mfg-me2008-s1-q84-p21','mfg-me2013-s1-q53-p12'])assert(q(id).cropPanels.length>=2,id);
 assert.equal(q('mfg-me2014-s1-q55-p17').cropPanels.length,1);assert.equal(q('mfg-me2014-s2-q55-p36').cropPanels.length,1);
 for(const id of ['mfg-me2015-s2-q31-p35','mfg-me2015-s3-q31-p58','mfg-me2015-s3-q44-p63'])assert(q(id).cropPanels[1].box[1]<20,id);
});
test('Manufacturing ordered path is complete and prior questions retain their identities',()=>{
 assert.equal(U.outline(added).length,12);assert.equal(new Set(added.map(q=>q.topicId)).size,52);const path=P.open(null,U.sessionIds(added.map(q=>q.id).reverse(),bank));assert.equal(path.ids.length,1756);assert.deepEqual(path.ids,added.map(q=>q.id));assert.equal(path.deadline,null);
 assert.equal(bank.filter(q=>!['manufacturing','engineering-mechanics','materials'].includes(q.subject)).length,8927);const prior=JSON.parse(fs.readFileSync('manufacturing-compatibility.json','utf8'));assert.equal(prior.preserved,8927);assert.equal(prior.storage,'som-lab-v1');
 for(const[id,topic]of Object.entries({'mfg-esep-2024-116':'manufacturing-10-04','mfg-esep-2026-54':'manufacturing-01-02','mfg-me2024-s1-q29-p18':'manufacturing-03-03'}))assert.equal(added.find(q=>q.assetId===id).topicId,topic);
});

test('Historical GATE PI preference and analytics retain the separate exam track',()=>{const I=require('./insights.js');assert.equal(I.preferences({defaultExam:'gate-pi'}).defaultExam,'gate-pi');const q=added.find(q=>q.exam==='gate-pi'&&q.key),at={id:q.id,answer:q.key.options||'1',at:Date.now()-1,status:'correct',score:q.marks,marks:q.marks};assert.equal(I.build(added,[at]).tracks.get('gate-pi').correct,1);});
