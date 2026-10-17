'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),crypto=require('node:crypto');
const read=f=>fs.readFileSync(__dirname+'/'+f,'utf8');
function store(extra={}){const context={window:{...extra}};vm.runInNewContext(read('asset-store.js'),context);return context.window;}
test('direct image delivery bypasses whole bundles for every viewer, preserving exact identity',async()=>{
  const root=store({PYQ_IMAGE_INDEX:{pack:{q:'ab/hash.webp',original:'cd/other.webp'}}});
  assert.equal(await root.PYQAssetStore.source({id:'q',pack:'pack'}),'question-images/ab/hash.webp');
  assert.equal(await root.PYQAssetStore.source({id:'q',assetId:'original',pack:'pack'}),'question-images/cd/other.webp');
  for(const f of ['app.js','crops-ui.js','learning-ui.js'])assert.match(read(f),/PYQAssetStore.source\(q\)/);
});
test('prefetch is bounded, deduplicated and cancelled after rapid navigation or sign out',()=>{
  const callbacks=[],images=[];let allowed=true;
  const root=store({PYQ_IMAGE_INDEX:{p:{a:'aa/a.webp',b:'bb/b.webp',c:'cc/c.webp'}},Image:class{constructor(){images.push(this);}},requestIdleCallback:fn=>callbacks.push(fn),PYQAccess:{allowed:()=>allowed}});
  const questions=['a','b','c'].map(id=>({id,pack:'p'}));
  root.PYQAssetStore.prefetch(questions);root.PYQAssetStore.prefetch(questions.slice(1));callbacks.splice(0).forEach(fn=>fn());
  assert.equal(images.length,2);assert.equal(images[0].src,'question-images/bb/b.webp');assert.equal(images[0].fetchPriority,'low');
  root.PYQAssetStore.prefetch(questions.slice(1));callbacks.splice(0).forEach(fn=>fn());assert.equal(images.length,2);
  root.PYQAssetStore.prefetch(questions);allowed=false;callbacks.splice(0).forEach(fn=>fn());assert.equal(images.length,2);
});
test('data saver and slow connections do not prefetch screenshots',()=>{
  for(const connection of [{saveData:true},{effectiveType:'2g'},{effectiveType:'slow-2g'}]){
    let scheduled=false;const root=store({navigator:{connection},requestIdleCallback:()=>{scheduled=true;}});
    root.PYQAssetStore.prefetch([{id:'q',pack:'p'}]);assert.equal(scheduled,false);
  }
});
test('runtime hints start together after authentication and execution stays ordered',async()=>{
  const sources=['bank.js','app.js','cloud-sync.js'].map(runtime=>({dataset:{runtime}})),hints=[],appended=[];
  const document={querySelectorAll:()=>sources,createElement:tag=>({tag,remove(){}}),head:{append:n=>hints.push(n)},body:{appendChild:n=>appended.push(n)},addEventListener(){}};
  const context={document,window:{}};vm.runInNewContext(read('access.js'),context);
  assert.equal(hints.length,0);const loading=context.window.PYQAccess.loadRuntime();assert.equal(hints.length,3);assert.equal(appended.length,1);
  for(let i=0;i<3;i++){assert.equal(appended[i].src,sources[i].dataset.runtime);assert.equal(appended[i].async,false);appended[i].onload();await new Promise(r=>setImmediate(r));}
  await loading;assert.equal(context.window.PYQAccess.allowed(),false);
});
test('image cache intercepts only content-addressed screenshots, reuses cache and survives storage denial',async()=>{
  const handlers={},saved=new Map();let calls=0,deny=false;
  const cache={match:async r=>saved.get(r.url),put:async(r,response)=>{if(deny)throw Error('Quota');saved.set(r.url,response);},keys:async()=>[...saved.keys()].map(url=>({url})),delete:async r=>saved.delete(r.url)};
  const context={URL,self:{registration:{scope:'https://example.test/lab/'},clients:{claim:async()=>{}},addEventListener:(event,fn)=>handlers[event]=fn},caches:{open:async()=>{if(deny)throw Error('Storage disabled');return cache;}},fetch:async()=>{calls++;return {ok:true,type:'basic',clone(){return this;}};}};
  vm.runInNewContext(read('image-cache-sw.js'),context);
  async function request(url,method='GET'){let result;const waits=[];handlers.fetch({request:{url,method},respondWith:p=>result=p,waitUntil:p=>waits.push(p)});if(result){await result;await Promise.all(waits);}return result;}
  const url='https://example.test/lab/question-images/aa/'+'a'.repeat(64)+'.webp';
  assert(await request(url));assert(await request(url));assert.equal(calls,1);
  for(const other of ['https://example.test/lab/index.html','https://auth.test/api',url+'?private=1','https://example.test/lab/question-images/private.json'])assert.equal(await request(other),undefined);
  assert.equal(await request(url,'POST'),undefined);deny=true;assert(await request(url));assert.equal(calls,2);
});
test('image exporter preserves the original byte stream, not a resized or recompressed image',()=>{
  const {decodeImage}=require('./build-site.cjs'),bytes=Buffer.from('original screenshot bytes');
  const decoded=decodeImage('data:image/webp;base64,'+bytes.toString('base64'));
  assert.deepEqual(decoded.bytes,bytes);assert.equal(decoded.file,crypto.createHash('sha256').update(bytes).digest('hex')+'.webp');
  assert.throws(()=>decodeImage('data:text/html;base64,eA=='));
});
