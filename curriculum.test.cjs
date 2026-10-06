const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),U=require('./curriculum.js'),A=require('./answers.js'),D=require('./dedup.js'),Catalog=require('./catalog.js'),I=require('./insights.js');
const ctx={window:{}};for(const f of ['bank.js','fluid-bank.js','answers-data.js','dedup-data.js','curriculum-data.js'])vm.runInNewContext(fs.readFileSync(f,'utf8'),ctx);
const raw=Catalog.prepare([{subject:'som',questions:ctx.window.SOM_BANK},...ctx.window.PYQ_BANKS]),lib=D.build(A.apply(raw,ctx.window.PYQ_ANSWER_DATA),ctx.window.PYQ_DEDUP_DATA),data=ctx.window.PYQ_CURRICULUM_DATA,bank=U.apply(lib.bank,data),by=new Map(bank.map(q=>[q.id,q]));
test('every unique question is mapped to one subject, chapter and topic without losing sources, assets or answers',()=>{
 assert.equal(bank.length,3058);assert.equal(Object.keys(data.assignments).length,3058);assert.equal(new Set(bank.map(q=>q.id)).size,3058);
 for(const original of lib.bank){const q=by.get(original.id);assert(q.chapterId&&q.topicId&&q.topic&&q.curriculumVersion===1);for(const k of ['id','assetId','pack','key','marks','occurrences','aliases','answerIssue','explanation','referenceAnswer'])assert.deepEqual(q[k],original[k]);assert.equal(q.sourceChapter,original.chapter);assert.deepEqual(q.sourceChapters,original.chapters)}
 assert.deepEqual(A.coverage(bank),A.coverage(lib.bank));assert.equal(bank.filter(q=>q.subject==='som').length,1231);assert.equal(bank.filter(q=>q.subject==='fluid-mechanics').length,1827);
});
test('chapter and topic orders follow the books rather than alphabetical chapter names',()=>{
 const som=U.outline(bank.filter(q=>q.subject==='som')),fm=U.outline(bank.filter(q=>q.subject==='fluid-mechanics'));
 assert.equal(som.length,17);assert.equal(fm.length,21);assert.equal(som[0].name,'Stress, Strain and Axial Deformation');assert.equal(som[10].name,'Combined Stresses and Failure Theories');assert.equal(fm[0].name,'Fluid Properties');assert.equal(fm[14].name,'Flow over Notches and Weirs');assert.equal(fm[20].name,'Flow in Heat-Transfer Applications');
 for(const chapters of [som,fm]){assert(chapters.every((ch,i)=>ch.order===i+1));for(const ch of chapters){assert(ch.topics.every((t,i)=>i===0||t.order>ch.topics[i-1].order));assert.equal(ch.topics.flatMap(t=>t.questions).length,ch.questions.length)}}
});
test('ordering depends on chapter and topic before exercise form and never uses year',()=>{
 for(let i=1;i<bank.length;i++)assert(U.compare(bank[i-1],bank[i])<=0);
 const old=by.get('gate-me-001'),altered={...old,year:9999};assert.equal(U.compare(old,altered),0);
 const first=bank[0],last=bank.at(-1);assert.deepEqual(U.sessionIds([last.id,first.id,last.id],bank),[first.id,last.id]);assert.deepEqual(U.sessionIds([last.id,first.id],bank,'exam'),[last.id,first.id]);
});
test('topic filters stay inside their chapter while year/source filters still match actual appearances',()=>{
 for(const ch of U.outline(bank)){for(const t of ch.topics){const rows=bank.filter(q=>U.matches(q,{chapter:ch.id,topic:t.id}));assert.deepEqual(rows.map(q=>q.id),t.questions.map(q=>q.id));assert(rows.every(q=>q.chapterId===ch.id));assert.equal(bank.filter(q=>U.matches(q,{chapter:'invalid',topic:t.id})).length,0)}}
 const q=bank.find(q=>q.occurrences.length>1);for(const o of q.occurrences)assert(lib.matches(q,{chapter:'all',year:o.year,source:o.archive?'archive':'original'}));
});
test('reviewed mixed-source questions are assigned by the problem instead of the source label',()=>{
 for(const [id,topic]of Object.entries({'gate-me-001':'som-02-02','gate-xe-298':'som-12-02','gate-xe-299':'som-06-01','ese-mains-056':'som-14-03','fluid-mechanics:fluid-gate-book-3-5':'fluid-mechanics-06-04','fluid-mechanics:fm-ese-mains-077':'fluid-mechanics-20-02'}))assert.equal(by.get(id).topicId,topic,id);
 const vessel=by.get('gate-me-192');assert.equal(vessel.topicId,'som-04-01','thin cylinder wall thickness must not be read as thick-cylinder theory');
});
test('learning-path quick practice picks the earliest unanswered questions and respects exam and key preferences',()=>{
 const pool=bank.filter(q=>q.subject==='som'&&q.exam==='gate-me'&&q.key),first=pool[0],attempts=[{id:first.id,answer:'A'}];
 const ids=I.choose(bank.filter(q=>q.subject==='som'),attempts,{selection:'curriculum',quickCount:10,defaultExam:'gate-me',keyedOnly:true},{},()=>0);
 assert.deepEqual(ids,pool.slice(1,11).map(q=>q.id));assert(ids.every(id=>by.get(id).exam==='gate-me'&&by.get(id).key));assert.deepEqual(U.next(pool,pool.map(q=>({id:q.id,answer:'A'})),2),pool.slice(0,2).map(q=>q.id));
});
test('one-time preference migration changes the new-practice default and preserves existing session data',()=>{
 const state={preferences:{selection:'adaptive',quickCount:17,keyedOnly:false},session:{ids:['gate-xe-299','gate-me-001'],index:1,answers:{'gate-me-001':'D'},mode:'practice'},attempts:[{id:'gate-me-001',answer:'A',score:1}]},before=JSON.stringify(state);
 const p=I.preferences(U.preferences(state.preferences));assert.equal(p.selection,'curriculum');assert.equal(p.quickCount,17);assert.equal(p.keyedOnly,false);assert.equal(p.previousSelection,'adaptive');assert.equal(JSON.stringify(state),before);
 assert.equal(U.preferences({...p,selection:'random'}).selection,'random');
});
