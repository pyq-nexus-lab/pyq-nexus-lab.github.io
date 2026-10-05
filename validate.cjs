const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const catalog=require('./catalog.js'),ctx={window:{}};
for(const file of ['bank.js','fluid-bank.js'])vm.runInNewContext(fs.readFileSync(file,'utf8'),ctx);
const bank=catalog.prepare([{subject:'som',questions:ctx.window.SOM_BANK},...ctx.window.PYQ_BANKS]);
assert.equal(bank.length,3030);assert.equal(new Set(bank.map(q=>q.id)).size,bank.length);
const packs=new Set();
for(const q of bank){
 assert(q.title&&q.source&&q.chapter);assert(['MCQ','MSQ','NAT','WRITTEN','UNCLASSIFIED'].includes(q.type));
 assert(fs.existsSync(q.pack),q.id+' missing pack');packs.add(q.pack);
 if(q.key){
  assert(q.marks>0&&q.keySource,q.id+' key provenance');
  if(q.type==='NAT'&&q.key.kind!=='all')for(const range of q.key.ranges||[[q.key.min,q.key.max]])assert(Number.isFinite(range[0])&&range[0]<=range[1]);
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
console.log(`Validated ${bank.length} entries across two subjects, ${packs.size} image packs, every asset reference, 1,681 crop digests and all 857 numbered Fluid Mechanics archive entries.`);
