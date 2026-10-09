const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),vm=require('vm');
const C=require('./catalog.js'),A=require('./answers.js'),D=require('./dedup.js'),U=require('./curriculum.js'),Core=require('./core.js'),c={window:{}};
for(const f of ['bank.js','fluid-bank.js','heat-bank.js','heat-mains-bank.js','power-bank.js','thermo-bank.js','answers-data.js','dedup-data.js','curriculum-data.js'])vm.runInNewContext(fs.readFileSync(f,'utf8'),c);
const d=c.window,raw=A.apply(C.prepare([{subject:'som',questions:d.SOM_BANK},...d.PYQ_BANKS]),d.PYQ_ANSWER_DATA),lib=D.build(raw,d.PYQ_DEDUP_DATA),bank=U.apply(lib.bank,d.PYQ_CURRICULUM_DATA),by=new Map(bank.map(q=>[q.id,q]));
test('the reported boiler rating and all 167 plant-specific copies are absent from Thermodynamics and safely redirect',()=>{
 assert.equal(d.PYQ_DEDUP_DATA.relocations.length,167);
 const boiler='thermodynamics:td-reuse-gate-book-6-10',target=lib.resolve(boiler);assert.equal(by.get(target).subject,'power-plant');assert(!bank.some(q=>q.id===boiler));
 assert.equal(by.get(lib.resolve('thermodynamics:td-reuse-gate-book-6-39')).subject,'power-plant');
 const old=D.build(raw,{...d.PYQ_DEDUP_DATA,relocations:[]});
 for(const m of d.PYQ_DEDUP_DATA.relocations){assert(!by.has(m.id));const q=by.get(lib.resolve(m.id));assert.equal(q.subject,'power-plant');const source=lib.original.get(m.id),originalPower='power-plant:'+source.priorSubjectId;assert.equal(source.cropSha256,lib.original.get(originalPower).cropSha256);for(const option of 'ABCD')assert.equal(lib.translate(m.id,option),old.translate(originalPower,option),m.id);}
});
test('all 595 printed book items stay in their PDF chapter sequence and all 456 XE section questions remain represented',()=>{
 const chapters=U.outline(bank.filter(q=>q.subject==='thermodynamics'));assert.deepEqual(chapters.slice(0,6).map(ch=>ch.name),['Thermodynamic Systems, Processes and Zeroth Law','First Law, Heat, Work and Energy','Second Law, Carnot Cycle and Entropy','Irreversibility and Availability','Thermodynamic Relations','Pure Substances']);
 for(const q of raw.filter(q=>q.subject==='thermodynamics'&&/^td-(ese|gate)-book-[1-6]-/.test(q.assetId))){const m=q.assetId.match(/^td-(ese|gate)-book-(\d+)-/),n=Number(m[2]);if(m[1]==='gate'&&n===6)continue;const expected=m[1]==='gate'&&n===5?6:n;assert.equal(by.get(lib.resolve(q.id)).chapterOrder,expected,q.id);}
 const gas=by.get(lib.resolve('thermodynamics:td-xe2017-s1-q88-p54'));assert.equal(gas.chapterOrder,2);assert.equal(gas.topic,'Polytropic processes');
 const saturated=by.get(lib.resolve('thermodynamics:td-xe2007-s1-q2-p46'));assert.equal(saturated.chapterOrder,6);
 assert.equal(by.get(lib.resolve('thermodynamics:td-reuse-esep-2-20')).chapterOrder,14);
 assert.equal(by.get(lib.resolve('thermodynamics:td-reuse-gate-book-6-62')).chapterOrder,9);
 assert.equal(by.get(lib.resolve('thermodynamics:td-reuse-esep-4-15')).chapterOrder,7);
 const pool=bank.filter(q=>q.subject==='thermodynamics'&&q.exam==='gate-me'),ids=U.sessionIds(pool.slice().reverse().map(q=>q.id),bank);for(let i=1;i<ids.length;i++)assert(U.compare(by.get(ids[i-1]),by.get(ids[i]))<=0);
});
test('an existing Thermodynamics set loses the misfiled boiler, reorders chapters and retains submitted work and a full recovery copy',()=>{
 const td=bank.filter(q=>q.subject==='thermodynamics'),first=td[0],last=td.at(-1),boiler='thermodynamics:td-reuse-gate-book-6-10';
 const original={session:{ids:[last.id,boiler,first.id],index:1,mode:'practice',answers:{[last.id]:'B',[boiler]:'D'},times:{[last.id]:20},submitted:{[last.id]:true}},attempts:[{id:boiler,answer:'D',at:1}],notes:{[boiler]:'Check kg/hr'}};
 const moved=D.migrate(original,lib),fixed=U.migrateSession(moved,bank,{revision:2,scope:'thermodynamics'});
 assert.deepEqual(fixed.session.ids,[first.id,last.id]);assert.equal(fixed.session.answers[last.id],'B');assert.equal(fixed.session.times[last.id],20);assert.equal(fixed.attempts[0].id,lib.resolve(boiler));assert.equal(fixed.notes[lib.resolve(boiler)],'Check kg/hr');assert(fixed.migrationRecovery.sessions.some(s=>s.ids.includes(boiler)));assert.deepEqual(original.session.ids,[last.id,boiler,first.id]);assert.strictEqual(U.migrateSession(fixed,bank,{revision:2,scope:'thermodynamics'}),fixed);
 const exam={session:{...original.session,mode:'exam'}};assert.strictEqual(U.migrateSession(exam,bank,{revision:2,scope:'thermodynamics'}),exam);
 const onlyPlant={session:{ids:[boiler],index:0,mode:'practice',subjectScope:'thermodynamics',answers:{[boiler]:'D'},submitted:{}}},recovered=U.migrateSession(D.migrate(onlyPlant,lib),bank,{revision:2,scope:'thermodynamics'});
 assert.equal(recovered.session.subjectScope,'power-plant');assert.deepEqual(recovered.session.ids,[lib.resolve(boiler)]);assert.equal(recovered.session.answers[lib.resolve(boiler)],lib.translate(boiler,'D'));assert(recovered.migrationRecovery.sessions.some(s=>s.ids.includes(boiler)));assert.strictEqual(U.migrateSession(recovered,bank,{revision:2}),recovered);
});
