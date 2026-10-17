const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),vm=require('vm'),crypto=require('crypto');
const Catalog=require('./catalog.js'),Core=require('./core.js'),U=require('./curriculum.js'),P=require('./ordered-practice.js'),ctx={window:{}};
for(const f of ['foundations-bank.js','curriculum-data.js'])vm.runInNewContext(fs.readFileSync(f,'utf8'),ctx);
const raw=Catalog.prepare(JSON.parse(JSON.stringify(ctx.window.PYQ_BANKS))),ids=new Set(raw.map(q=>q.id)),data=ctx.window.PYQ_CURRICULUM_DATA;data.assignments=Object.fromEntries(Object.entries(data.assignments).filter(([id])=>ids.has(id)));const bank=U.apply(require('./dedup.js').build(raw,{groups:[]}).bank,data);
test('all three remaining subject banks have complete chapter paths and unrestricted continuous practice',()=>{
 assert.equal(bank.length,2063);assert.equal(new Set(bank.map(q=>q.id)).size,2063);
 for(const[s,count,chapters]of [['engineering-mathematics',593,9],['general-aptitude',470,8],['ese-general-studies',1000,10]]){const qs=bank.filter(q=>q.subject===s);assert.equal(qs.length,count);assert.equal(U.outline(qs).length,chapters);assert(qs.every(q=>q.topicId&&q.chapterId));const ids=U.sessionIds(qs.map(q=>q.id).reverse(),bank);const session=P.open(null,ids,{subject:s});assert.equal(session.ids.length,count);assert.equal(session.deadline,null);assert.deepEqual(session.ids,qs.map(q=>q.id));}
 const gs=bank.filter(q=>q.subject==='ese-general-studies');for(let year=2017;year<=2026;year++){const qs=gs.filter(q=>q.year===year);assert.equal(qs.length,100);assert.deepEqual(qs.map(q=>Number(q.number)).sort((a,b)=>a-b),Array.from({length:100},(_,i)=>i+1));}
});
test('2056 keyed questions grade correctly; seven source issues do not affect scores',()=>{
 assert.equal(bank.filter(q=>q.key).length,2056);assert.equal(bank.filter(q=>q.answerIssue).length,7);
 for(const q of bank){assert(q.marks>0&&q.year>=1987&&q.year<=2026,q.id);assert(q.source&&q.sourcePage>0,q.id);if(q.key){assert(q.keySource,q.id);const response=q.type==='NAT'?String(q.key.ranges?.[0]?.[0]??q.key.min):q.key.options;assert.equal(Core.grade(q,response).score,q.marks,q.id);}else{assert(q.answerIssue&&q.explanation,q.id);assert.equal(Core.grade(q,'A').score,null,q.id);}}
 assert.equal(Core.totals(bank.filter(q=>q.answerIssue),{}).max,0);
 const q=bank.find(q=>q.assetId==='fd-gate-math-3-22');assert.equal(q.year,2017);assert.equal(q.marks,1);
 for(const[id,answer]of [['fd-gate-ga-1-74',20000],['fd-gate-ga-1-79',23]]){const q=bank.find(q=>q.assetId===id);assert(q,id);assert.equal(Core.grade(q,String(answer)).score,q.marks);}
});
test('all new cropped screenshots have exact digests and valid source panels',()=>{
 const packs=new Set(bank.map(q=>q.pack));assert.equal(packs.size,32);for(const pack of packs)require('./asset-test-utils.cjs').load(pack,ctx.window);
 for(const q of bank){const uri=ctx.window.PYQ_IMAGES[q.assetId];assert(uri?.startsWith('data:image/webp;base64,'),q.id);const bytes=Buffer.from(uri.split(',')[1],'base64');assert.equal(bytes.subarray(0,4).toString(),'RIFF');assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),q.cropSha256,q.id);assert(q.cropPanels?.length,q.id);for(const p of q.cropPanels){assert(p.box[0]>=0&&p.box[1]>=0&&p.box[2]>p.box[0]&&p.box[3]>p.box[1],q.id);assert(p.box[2]<=p.pageSize[0]+1&&p.box[3]<=p.pageSize[1]+1,q.id);}}
 for(let n=23;n<=28;n++){const q=bank.find(q=>q.assetId===`fd-xe2007-xe-a-${n}`);assert(q.sharedContext&&q.text.length>100&&q.cropPanels.length>=2,q.id);}
});
test('all entry points load the new bank once and only after authentication',()=>{for(const file of ['index.html','studio-preview.html','sync-device-preview.html','access-preview.html']){const html=fs.readFileSync(file,'utf8');assert.equal((html.match(/foundations-bank\.js/g)||[]).length,1);assert(html.includes('type="text/plain" data-runtime="foundations-bank.js'));assert(html.includes('type="text/plain" data-runtime="asset-index.js'));assert(html.includes('type="text/plain" data-runtime="asset-store.js'));}});
