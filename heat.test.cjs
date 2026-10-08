const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),vm=require('vm'),crypto=require('crypto');
const C=require('./catalog.js'),A=require('./answers.js'),D=require('./dedup.js'),U=require('./curriculum.js'),X=require('./crops.js'),Core=require('./core.js'),ctx={window:{}};
for(const f of ['bank.js','fluid-bank.js','heat-bank.js','heat-mains-bank.js','answers-data.js','dedup-data.js','crops-data.js','curriculum-data.js'])vm.runInNewContext(fs.readFileSync(f,'utf8'),ctx);
const d=ctx.window,raw=X.apply(A.apply(C.prepare([{subject:'som',questions:d.SOM_BANK},...d.PYQ_BANKS]),d.PYQ_ANSWER_DATA),d.PYQ_CROP_DATA),lib=D.build(raw,d.PYQ_DEDUP_DATA),bank=U.apply(lib.bank,d.PYQ_CURRICULUM_DATA),ht=bank.filter(q=>q.subject==='heat-transfer'&&!q.exam.includes('mains')),find=id=>bank.find(q=>q.id===lib.resolve('heat-transfer:'+id));
test('all Heat Transfer source sequences and compilation entries survive consolidation; objective sources remain intact alongside Mains',()=>{
 assert.equal(raw.filter(q=>q.subject==='heat-transfer'&&!q.exam.includes('mains')).length,690);assert.equal(ht.length,580);
 for(const [prefix,counts]of [['ht-ese-book',[100,17,23,69,69,49,19]],['ht-gate-book',[44,19,16,31,27,21]]])for(const [i,count]of counts.entries()){const rows=raw.filter(q=>q.assetId.startsWith(prefix+'-'+(i+1)+'-'));assert.deepEqual(rows.map(q=>Number(q.number.split('.')[1])).sort((a,b)=>a-b),Array.from({length:count},(_,n)=>n+1))}
 for(const [prefix,count]of [['ht-gate-me',125],['ht-ese-prelims',61]])for(let i=1;i<=count;i++)assert(lib.original.has('heat-transfer:'+prefix+'-'+String(i).padStart(3,'0')));
 assert.equal(ht.filter(q=>q.exam==='gate-me').length,200);assert.equal(ht.filter(q=>q.exam==='ese-prelims').length,380);assert(!ht.some(q=>q.exam.includes('mains')));
});
test('all usable references grade their own response and NAT endpoints; official type corrections are retained',()=>{
 assert.deepEqual(A.coverage(ht),{total:580,official:98,book:392,solved:86,written:0,issues:4,pending:0,keyed:576});
 for(const q of ht.filter(q=>q.key)){const answers=q.key.kind==='all'?['']:q.type==='NAT'?(q.key.ranges||[[q.key.min,q.key.max]]).flat().map(String):q.type==='TEXT'?q.key.acceptedText:q.key.optionSets||[q.key.options];for(const answer of answers)assert.equal(Core.grade(q,answer).score,q.marks,q.id);if(q.type==='MCQ'&&q.key.kind!=='all')assert.equal(q.key.options.length,1)}
 for(const [id,key]of [['ht-gate-me-041','A'],['ht-gate-me-060','B'],['ht-gate-me-114','D'],['ht-gate-me-047','D']]){const q=find(id);assert.equal(q.type,'MCQ');assert.equal(Core.grade(q,[key]).status,'correct')}
 const msq=ht.find(q=>q.type==='MSQ'&&q.key.options.length>1);assert(msq);assert.equal(Core.grade(msq,msq.key.options.slice(0,1)).score,0);
});
test('equivalent temperature-difference units accept either single MCQ answer without accepting a multi-selection',()=>{const q=find('ht-ese-prelims-029');for(const option of ['A','B'])assert.equal(Core.grade(q,[option]).status,'correct');assert.equal(Core.grade(q,['A','B']).status,'wrong');assert.equal(q.keyStatus,'solved')});
test('confirmed repeats translate option positions and preserve distinct linked subquestions',()=>{
 for(const [id,answer,canonical]of [['ht-gate-book-2-18','B','D'],['ht-gate-book-2-16','B','C']]){assert.equal(lib.translate('heat-transfer:'+id,answer),canonical);assert.equal(Core.grade(find(id),[canonical]).status,'correct')}
 assert.equal(lib.resolve('heat-transfer:ht-gate-book-4-12'),'heat-transfer:ht-gate-me-080');assert.equal(lib.resolve('heat-transfer:ht-gate-book-4-13'),'heat-transfer:ht-gate-me-081');
 for(const [a,b]of [['1-18','1-19'],['3-6','3-7']])assert.notEqual(lib.resolve('heat-transfer:ht-gate-book-'+a),lib.resolve('heat-transfer:ht-gate-book-'+b));assert(!ht.some(q=>q.keyConflict));
});
test('inconsistent statements explain the physics and never award automatic marks',()=>{
 const issues=ht.filter(q=>q.answerIssue);assert.equal(issues.length,4);for(const q of issues){assert(q.explanation&&q.referenceAnswer);assert.equal(Core.grade(q,'B').score,null)}assert.equal(Core.totals(issues,Object.fromEntries(issues.map(q=>[q.id,'B']))).max,0);
 assert.equal(find('ht-ese-book-1-14').keyStatus,'solved');assert.equal(Core.grade(find('ht-ese-book-1-14'),['A']).status,'correct');
});
test('source screenshots have intact bytes and bounded geometry; linked data and continuation choices are restored',()=>{
 const rows=raw.filter(q=>q.subject==='heat-transfer');for(const file of new Set(rows.map(q=>q.pack))){assert(fs.statSync(file).size<4_500_000);vm.runInNewContext(fs.readFileSync(file,'utf8'),ctx)}
 for(const q of rows){const uri=d.PYQ_IMAGES[q.assetId];assert(uri?.startsWith('data:image/webp;base64,'));assert.equal(crypto.createHash('sha256').update(Buffer.from(uri.split(',')[1],'base64')).digest('hex'),q.cropSha256,q.id);assert(q.cropPanels.length);for(const p of q.cropPanels)if(p.box){assert(p.page>0&&p.box[0]>=0&&p.box[1]>=0&&p.box[2]<=p.pageSize[0]&&p.box[3]<=p.pageSize[1],q.id)}}
 const continuation=find('ht-gate-me-071');assert.deepEqual(Array.from(continuation.cropPanels,p=>p.page),[19,20]);assert.match(continuation.text,/\(D\)/);assert.match(find('ht-gate-me-038').text,/\(D\)/);
 for(const suffix of ['1-18','1-19','2-5','2-6','2-8','2-9','3-6','3-7','4-12','4-13'])assert(lib.original.get('heat-transfer:ht-gate-book-'+suffix).cropPanels.some(p=>p.sharedData));
});
test('existing SOM/FM questions, grading and learning order match the pre-Heat-Transfer fingerprint',()=>{
 const prior=JSON.parse(fs.readFileSync('heat-compatibility.json','utf8'));const rows=bank.filter(q=>q.subject!=='heat-transfer').map(q=>Object.fromEntries(prior.checkedFields.map(k=>[k,q[k]??null]))).sort((a,b)=>a.id.localeCompare(b.id));assert.equal(rows.length,3058);assert.equal(crypto.createHash('sha256').update(JSON.stringify(rows)).digest('hex'),prior.sha256);
 const outline=U.outline(ht);assert.equal(outline.length,9);assert.equal(outline[0].name,'Heat Transfer Fundamentals');assert.equal(outline[7].name,'Boiling and Condensation');assert(ht.every(q=>q.chapterId&&q.topicId));
 const session={ids:['gate-me-002','gate-me-001'],index:1,mode:'practice',answers:{'gate-me-001':'B'},times:{}};assert.deepEqual(D.migrate({session,attempts:[]},lib).session,session);
});
