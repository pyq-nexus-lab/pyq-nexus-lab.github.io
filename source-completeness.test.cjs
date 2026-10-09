const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),vm=require('vm'),crypto=require('crypto');
const Catalog=require('./catalog.js'),Answers=require('./answers.js'),Dedup=require('./dedup.js'),Crops=require('./crops.js'),Curriculum=require('./curriculum.js'),Core=require('./core.js'),ctx={window:{}};
for(const f of ['bank.js','fluid-bank.js','heat-bank.js','heat-mains-bank.js','power-bank.js','thermo-bank.js','answers-data.js','dedup-data.js','crops-data.js','curriculum-data.js'])vm.runInNewContext(fs.readFileSync(f,'utf8'),ctx);
const d=ctx.window,raw=Crops.apply(Answers.apply(Catalog.prepare([{subject:'som',questions:d.SOM_BANK},...d.PYQ_BANKS]),d.PYQ_ANSWER_DATA),d.PYQ_CROP_DATA),lib=Dedup.build(raw,d.PYQ_DEDUP_DATA),bank=Curriculum.apply(lib.bank,d.PYQ_CURRICULUM_DATA),find=id=>raw.find(q=>q.id===id);
function sequence(prefix,counts){for(const [ch,count]of counts.entries()){const found=new Set(raw.filter(q=>q.id.startsWith(prefix)&&Number(q.number.split('.')[0])===ch+1).map(q=>Number(q.number.split('.')[1])));assert.deepEqual([...found].sort((a,b)=>a-b),Array.from({length:count},(_,i)=>i+1),prefix+' chapter '+(ch+1))}}
test('every numbered SOM and hydraulic book item is represented, including OCR-skipped markers',()=>{
 sequence('ese-book-',[35,32,49,44,49,48,38,30,28,16,10,16,2]);
 sequence('gate-book-',[30,10,14,21,21,20,27,7,13,13,8]);
 sequence('fluid-mechanics:fluid-ese-hydraulic-book-',[104,83,29]);
 assert.equal(raw.filter(q=>q.id.startsWith('fluid-mechanics:fluid-ese-compressible-book-')).length,79);
 const numbers=raw.filter(q=>q.id.startsWith('fluid-mechanics:fluid-ese-compressible-book-')).map(q=>Number(q.number.split('.')[1])).sort((a,b)=>a-b);
 assert.deepEqual(numbers,[...Array.from({length:15},(_,i)=>i+1),...Array.from({length:64},(_,i)=>i+42)]);
 const blocked=d.PYQ_SOURCE_RECONCILIATION.blocked[0];assert.equal(blocked.pdfPage,554);assert.equal(blocked.numbers.length,26);assert.match(blocked.reason,/omits full statements/);
});
test('new screenshots retain complete source geometry, shared directions and verified bytes',()=>{
 const qs=raw.filter(q=>q.pack.startsWith('gap-assets-'));assert.equal(qs.length,324);for(const p of new Set(qs.map(q=>q.pack))){assert(fs.statSync(p).size<4_500_000);vm.runInNewContext(fs.readFileSync(p,'utf8'),ctx)}
 for(const q of qs){const uri=ctx.window.PYQ_IMAGES[q.assetId];assert(uri?.startsWith('data:image/webp;base64,'),q.id);assert.equal(crypto.createHash('sha256').update(Buffer.from(uri.split(',')[1],'base64')).digest('hex'),q.cropSha256);assert(q.width>300&&q.height>80);assert(q.cropPanels.length);for(const p of q.cropPanels){assert(p.file&&p.page>0&&p.box[0]>=0&&p.box[1]>=0&&p.box[2]<=p.pageSize[0]&&p.box[3]<=p.pageSize[1]);assert(p.box[2]>p.box[0]&&p.box[3]>p.box[1])}}
 for(const id of ['fluid-mechanics:fluid-ese-hydraulic-book-1-90','fluid-mechanics:fluid-ese-hydraulic-book-2-60','fluid-mechanics:fluid-ese-compressible-book-7-66'])assert(find(id).cropPanels.some(p=>p.role==='Shared response codes'));
});
test('repeated papers and reordered hydraulic options resolve safely without joining changed alternatives',()=>{
 assert.equal(lib.resolve('gate-book-6-13'),'gate-me-108');assert.equal(lib.resolve('ese-book-6-44'),'ese-prelims-061');
 const alias='fluid-mechanics:fluid-ese-hydraulic-book-1-83',id=lib.resolve(alias);assert.equal(id,'fluid-mechanics:fluid-ese-hydraulic-book-1-51');assert.equal(lib.translate(alias,'D'),'C');assert.equal(Core.grade(bank.find(q=>q.id===id),lib.translate(alias,'D')).status,'correct');
 assert.notEqual(lib.resolve('fluid-mechanics:fluid-ese-hydraulic-book-2-71'),lib.resolve('fluid-mechanics:fluid-ese-hydraulic-book-2-46'));
 assert.notEqual(lib.resolve('fluid-mechanics:fluid-ese-compressible-book-7-14'),lib.resolve('fluid-mechanics:fluid-ese-compressible-book-7-15'));
 assert.equal(find('gate-book-1-5').number,'1.29');assert.equal(find('ese-book-1-21').year,2012);assert(!find('ese-book-1-21').text.includes('State of plane stress'));
});
test('derived corrections and valid historical answers grade correctly while inconsistent sources remain outside marks',()=>{
 for(const no of ['7.59','7.73','7.89']){const q=find('fluid-mechanics:fluid-ese-compressible-book-'+no.replace('.','-'));assert.equal(q.keyStatus,'solved');assert(q.answerReference.url);assert.equal(Core.grade(q,q.key.options).score,2)}
 assert.equal(Core.grade(find('ese-book-12-4'),'B').status,'correct');
 for(const id of ['gate-book-7-3','fluid-mechanics:fluid-ese-hydraulic-book-1-9']){const q=find(id);assert(q.answerIssue&&q.referenceAnswer&&q.explanation);assert.equal(Core.grade(q,'B').score,null)}
 assert.deepEqual(Answers.coverage(bank.filter(q=>['som','fluid-mechanics'].includes(q.subject))),{total:3058,official:817,book:1544,solved:489,written:197,issues:11,pending:0,keyed:2850});assert.equal(bank.filter(q=>q.keyConflict).length,0);
});
