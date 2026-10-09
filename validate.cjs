const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const catalog=require('./catalog.js'),ctx={window:{}};
for(const file of ['bank.js','fluid-bank.js','heat-bank.js','heat-mains-bank.js','power-bank.js','thermo-bank.js'])vm.runInNewContext(fs.readFileSync(file,'utf8'),ctx);
const bank=catalog.prepare([{subject:'som',questions:ctx.window.SOM_BANK},...ctx.window.PYQ_BANKS]);
assert.equal(bank.length,6841);assert.equal(new Set(bank.map(q=>q.id)).size,bank.length);
const packs=new Set();
for(const q of bank){
 assert(q.title&&q.source&&q.chapter);assert(['MCQ','MSQ','NAT','TEXT','WRITTEN','UNCLASSIFIED'].includes(q.type));
 assert(fs.existsSync(q.pack),q.id+' missing pack');packs.add(q.pack);
 if(q.key){
  assert(q.marks>0&&q.keySource,q.id+' key provenance');
  if(q.type==='NAT'&&q.key.kind!=='all')for(const range of q.key.ranges||[[q.key.min,q.key.max]])assert(Number.isFinite(range[0])&&range[0]<=range[1]);
  else if(q.type==='TEXT')assert(q.key.acceptedText?.length&&q.key.acceptedText.every(v=>typeof v==='string'&&v.trim()));
  else if(q.key.kind!=='all')for(const options of q.key.optionSets||[q.key.options])assert(options.length&&new Set(options).size===options.length&&options.every(o=>['A','B','C','D'].includes(o)));
 }
 if(q.archive)assert(q.sourcePage>0,q.id+' archive page');
}
for(const file of packs)vm.runInNewContext(fs.readFileSync(file,'utf8'),ctx);
for(const q of bank){
 const image=ctx.window.PYQ_IMAGES?.[q.assetId]||ctx.window.SOM_IMAGES?.[q.assetId];
 assert(image?.startsWith('data:image/webp;base64,'),q.id+' screenshot');
 if(q.cropSha256){const bytes=Buffer.from(image.split(',')[1],'base64');assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),q.cropSha256,q.id+' crop digest');assert.equal(bytes.subarray(0,4).toString(),'RIFF');assert.equal(bytes.subarray(8,12).toString(),'WEBP');}
}
const audit=JSON.parse(fs.readFileSync('fluid-source-audit.json','utf8'));
for(const chapter of audit.bookChapters){
 const questions=bank.filter(q=>q.assetId.startsWith(chapter.source+'-'+chapter.chapter+'-'));
 assert.equal(questions.length,chapter.questions);
 assert.deepEqual(questions.map(q=>Number(q.number.split('.')[1])).sort((a,b)=>a-b),Array.from({length:chapter.questions},(_,i)=>i+1),'Complete printed numbering: '+chapter.title);
}
console.log(`Validated ${bank.length} entries across five subjects, ${packs.size} image packs, every asset reference, all crop digests and all 857 numbered core Fluid Mechanics archive entries.`);
for(const file of ['answers-data.js','dedup-data.js','repair-assets.js'])vm.runInNewContext(fs.readFileSync(file,'utf8'),ctx);
const A=require('./answers.js'),D=require('./dedup.js'),patched=A.apply(bank,ctx.window.PYQ_ANSWER_DATA),lib=D.build(patched,ctx.window.PYQ_DEDUP_DATA),coverage=A.coverage(lib.bank);
assert.equal(patched.length,6842);assert.equal(lib.bank.length,6242);assert.equal(coverage.keyed,5550);assert.equal(coverage.written,651);assert.equal(coverage.issues,41);assert.equal(coverage.pending,0);
for(const q of lib.bank)assert(q.marks>0,q.id+' canonical marks');
let repaired=0;for(const q of patched){if(q.pack==='repair-assets.js'){repaired++;const image=ctx.window.SOM_IMAGES[q.assetId];assert(image?.startsWith('data:image/webp;base64,'),q.id);assert.equal(crypto.createHash('sha256').update(Buffer.from(image.split(',')[1],'base64')).digest('hex'),q.cropSha256,q.id+' repaired crop digest')}}assert.equal(repaired,19);
console.log(`Validated ${lib.bank.length} unique questions, ${coverage.keyed} grading keys, ${coverage.written} Mains references, ${coverage.issues} explained errata and ${repaired} restored screenshots.`);
vm.runInNewContext(fs.readFileSync('curriculum-data.js','utf8'),ctx);
const U=require('./curriculum.js'),ordered=U.apply(lib.bank,ctx.window.PYQ_CURRICULUM_DATA),outline=U.outline(ordered);
assert.equal(ordered.length,6242);assert.equal(outline.length,77);const topics=new Set(ordered.map(q=>q.topicId)).size;assert(topics>=150);
assert(ordered.every(q=>q.chapterId&&q.topicId&&q.topic&&q.sourceChapters.length));for(let i=1;i<ordered.length;i++)assert(U.compare(ordered[i-1],ordered[i])<=0);
console.log(`Validated complete curriculum coverage: ${ordered.length} questions in ${outline.length} ordered chapters and ${topics} populated topics.`);
vm.runInNewContext(fs.readFileSync('crops-data.js','utf8'),ctx);
const crops=require('./crops.js'),replacements=ctx.window.PYQ_CROP_DATA,restored=crops.apply(patched,replacements),restoredPacks=new Set(Object.values(replacements.patches).map(p=>p.pack));
for(const file of restoredPacks)vm.runInNewContext(fs.readFileSync(file,'utf8'),ctx);
for(const [id,p] of Object.entries(replacements.patches)){const uri=ctx.window.PYQ_IMAGES[p.assetId];assert(uri?.startsWith('data:image/webp;base64,'),id);assert.equal(crypto.createHash('sha256').update(Buffer.from(uri.split(',')[1],'base64')).digest('hex'),p.cropSha256,id)}
const finalBank=U.apply(D.build(restored,ctx.window.PYQ_DEDUP_DATA).bank,ctx.window.PYQ_CURRICULUM_DATA);assert.deepEqual(finalBank.map(q=>q.id),ordered.map(q=>q.id));assert.deepEqual(A.coverage(finalBank),coverage);
console.log(`Validated ${Object.keys(replacements.patches).length} rebuilt screenshots and ${restoredPacks.size} replacement packs; all answers, canonical IDs and learning order are preserved.`);
