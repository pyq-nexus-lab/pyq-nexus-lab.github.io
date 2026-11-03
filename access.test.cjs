const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const read=f=>fs.readFileSync(__dirname+'/'+f,'utf8'),accountSource=read('account.js');
const config={url:'https://example-project.supabase.co',publishableKey:'sb_publishable_public123',cloudBackups:true};
const user={id:'owner-a',email:'owner@example.test'},session={user};
const flush=async()=>{for(let i=0;i<8;i++)await new Promise(setImmediate);};
function harness(options={}){
 const events=[],calls=[],scheduled=[];let allowed=false,callback;
 const gate={allowed:()=>allowed,paint(){},modal(){},lock(message){allowed=false;calls.push(['lock',message]);},fail(message){allowed=false;calls.push(['fail',message]);},async loadRuntime(){calls.push(['load']);if(options.loadError)throw Error('Load failed');if(options.loadRuntime)await options.loadRuntime();},unlock(){allowed=true;calls.push(['unlock']);}};
 const auth={onAuthStateChange(fn){callback=fn;},getSession:options.getSession||async function(){return {data:{session:options.session??null}};},getUser:options.getUser||async function(){calls.push(['verify']);return {data:{user},error:options.error};},async signInWithPassword(){callback('SIGNED_IN',session);return {data:{session}};}};
 const sessionStore=new Map(options.guestSession?[['pyq-nexus-guest-session','1']]:[]);
 const context={PYQ_ACCOUNT_CONFIG:options.config||config,PYQAccess:gate,PYQSync:{connect(c,u){calls.push(['sync',u.id]);},disconnect(){calls.push(['disconnect']);},useGuest(){calls.push(['guest']);},paint(){}},sessionStorage:{getItem:k=>sessionStore.get(k)||null,setItem:(k,v)=>sessionStore.set(k,v),removeItem:k=>sessionStore.delete(k)},supabase:{createClient:()=>({auth})},document:{querySelector:s=>options.nodes?.[s]||null,addEventListener:(...args)=>events.push(args)},FormData:class{get(k){return k==='email'?'owner@example.test':'test-only-password';}},setTimeout:fn=>{scheduled.push(fn);}};
 context.window=context;vm.runInNewContext(accountSource,context);
 return {context,calls,gate,events,sessionStore,emit:(type,s)=>callback(type,s),tasks:async()=>{while(scheduled.length)await scheduled.shift()();await flush();}};
}
test('signed-out visits do not load question banks or unlock the workspace',async()=>{
 const h=harness();await flush();assert.equal(h.gate.allowed(),false);assert.equal(h.calls.some(x=>x[0]==='load'),false);assert.equal(h.context.PYQAccount.isSignedIn(),false);
});
test('cached sessions require successful server verification before runtime loading',async()=>{
 let resolve;const h=harness({session,getUser:()=>new Promise(r=>resolve=r)});await flush();assert.equal(h.gate.allowed(),false);assert.equal(h.calls.some(x=>x[0]==='load'),false);
 resolve({data:{user}});await flush();assert.equal(h.gate.allowed(),true);assert.equal(h.context.PYQAccount.isSignedIn(),true);assert.deepEqual(h.calls.filter(x=>['load','unlock','sync'].includes(x[0])).map(x=>x[0]),['load','sync','unlock']);
});
test('rejected, expired and mismatched cached accounts remain locked',async()=>{
 for(const result of [{data:{user:null},error:Error('Expired')},{data:{user:{id:'different-owner'}}}]){
  const h=harness({session,getUser:async()=>result});await flush();assert.equal(h.gate.allowed(),false);assert.equal(h.calls.some(x=>x[0]==='load'),false);assert(h.calls.some(x=>x[0]==='fail'));
 }
});
test('network verification and workspace-load failures fail closed',async()=>{
 for(const options of [{session,getUser:async()=>{throw Error('Offline');}},{session,loadError:true}]){
  const h=harness(options);await flush();assert.equal(h.gate.allowed(),false);assert.equal(h.context.PYQAccount.isSignedIn(),false);
 }
});
test('sign-out immediately locks the interface and disconnects cloud saving',async()=>{
 const h=harness({session});await flush();assert(h.gate.allowed());h.emit('SIGNED_OUT',null);assert.equal(h.gate.allowed(),false);assert.equal(h.context.PYQAccount.isSignedIn(),false);assert(h.calls.slice(-3).some(x=>x[0]==='disconnect'));
});
test('late verification cannot unlock an account after sign-out',async()=>{
 let resolve;const h=harness({session,getUser:()=>new Promise(r=>resolve=r)});await flush();h.emit('SIGNED_OUT',null);resolve({data:{user}});await flush();assert.equal(h.gate.allowed(),false);assert.equal(h.calls.some(x=>x[0]==='unlock'),false);
});
test('queued auth callbacks cannot undo a later sign-out',async()=>{
 const h=harness();await flush();h.emit('SIGNED_IN',session);h.emit('SIGNED_OUT',null);await h.tasks();assert.equal(h.gate.allowed(),false);assert.equal(h.calls.some(x=>x[0]==='load'),false);
});
test('all entry pages offer guest access and defer runtime until an access choice',()=>{
 for(const file of ['index.html','studio-preview.html','sync-device-preview.html','access-preview.html']){
  const html=read(file);assert.match(html,/<html[^>]+data-access="locked"/);assert.match(html,/id="access-gate"/);
  const scripts=[...html.matchAll(/<script src="([^"]+)"/g)].map(x=>x[1].split('?')[0]);assert.deepEqual(scripts,['access.js','account-config.js','account.js'],file);
  assert.match(html,/data-runtime="bank\.js/);assert.match(html,/data-runtime="app\.js\?v=\d+/);assert.match(html,/data-runtime="cloud-sync\.js/);
  assert.match(html,/data-guest-access>Continue as guest/);assert.doesNotMatch(html,/Login is required|workspace requires an account/);
 }
 assert.match(accountSource,/data-guest-access>Continue as guest/);assert.doesNotMatch(accountSource,/Login is required to access/);
});

test('guest access loads the workspace without an account or cloud connection',async()=>{
 const h=harness();await flush();await h.context.PYQAccount.continueGuest();
 assert(h.gate.allowed());assert(h.context.PYQAccount.isGuest());assert.equal(h.context.PYQAccount.isSignedIn(),false);
 assert.equal(h.sessionStore.get('pyq-nexus-guest-session'),'1');assert.equal(h.calls.some(x=>x[0]==='sync'),false);
 assert.deepEqual(h.calls.filter(x=>['load','guest','unlock'].includes(x[0])).map(x=>x[0]),['load','guest','unlock']);
 h.emit('SIGNED_OUT',null);assert(h.gate.allowed());h.emit('TOKEN_REFRESHED',session);await h.tasks();assert(h.context.PYQAccount.isGuest());assert.equal(h.calls.some(x=>x[0]==='sync'),false);
});
test('guest selection wins over a pending cached account verification',async()=>{
 let resolve;const h=harness({session,getUser:()=>new Promise(r=>resolve=r)});await flush();
 await h.context.PYQAccount.continueGuest();resolve({data:{user}});await flush();
 assert(h.gate.allowed());assert(h.context.PYQAccount.isGuest());assert.equal(h.calls.some(x=>x[0]==='sync'),false);
});
test('guest visits resume after refresh and work when the account service is unconfigured',async()=>{
 for(const options of [{guestSession:true},{config:{}}]){const h=harness(options);await flush();if(!options.guestSession)await h.context.PYQAccount.continueGuest();assert(h.gate.allowed());assert(h.context.PYQAccount.isGuest());assert.equal(h.calls.some(x=>x[0]==='verify'||x[0]==='sync'),false);}
});

test('late initial sessions and auth events cannot cancel a guest workspace still loading',async()=>{
 let finishSession,finishRuntime;
 const h=harness({getSession:()=>new Promise(r=>finishSession=r),loadRuntime:()=>new Promise(r=>finishRuntime=r)});
 await flush();const opening=h.context.PYQAccount.continueGuest();await flush();
 h.emit('SIGNED_IN',session);finishSession({data:{session}});await h.tasks();
 finishRuntime();await opening;assert(h.gate.allowed());assert(h.context.PYQAccount.isGuest());assert.equal(h.calls.some(x=>x[0]==='sync'),false);
});

test('an explicit login from guest verifies the account and reconnects cloud saving',async()=>{
 const button={},form={querySelector:()=>button,querySelectorAll:()=>[]};
 const nodes={'#studio-auth-form':form,'#studio-device-export':{},'#studio-logout':{},'#studio-cloud-save':{}};
 const h=harness({nodes});h.context.exportData=()=>{};await flush();await h.context.PYQAccount.continueGuest();
 h.context.PYQAccount.open('login');await form.onsubmit({preventDefault(){},currentTarget:form});await h.tasks();
 assert(h.context.PYQAccount.isSignedIn());assert.equal(h.context.PYQAccount.isGuest(),false);assert.equal(h.sessionStore.has('pyq-nexus-guest-session'),false);assert(h.calls.some(x=>x[0]==='verify'));assert(h.calls.some(x=>x[0]==='sync'));assert.equal(button.disabled,false);
});
test('a failed guest runtime load stays on the welcome screen and can be retried',async()=>{
 const h=harness({loadError:true});await flush();await h.context.PYQAccount.continueGuest();assert.equal(h.gate.allowed(),false);assert.equal(h.calls.some(x=>x[0]==='guest'),false);
 h.gate.loadRuntime=async()=>{};await h.context.PYQAccount.continueGuest();assert(h.gate.allowed());
});
test('locked gate erases rendered questions and blocks hidden controls',()=>{
 const listeners={},elements={'#main':{replaceChildren(){this.cleared=true;}},'#access-gate':{},'#access-status':{dataset:{}},'#access-retry':{}};
 const document={documentElement:{dataset:{}},querySelector:s=>elements[s]||null,querySelectorAll:()=>[],addEventListener:(name,fn,capture)=>{if(capture)listeners[name]=fn;}};
 const ctx={document};ctx.window=ctx;vm.runInNewContext(read('access.js'),ctx);ctx.PYQAccess.lock();assert(elements['#main'].cleared);assert.equal(document.documentElement.dataset.access,'locked');
 let blocked=0;listeners.click({target:{closest:()=>null},preventDefault(){blocked++;},stopImmediatePropagation(){blocked++;}});assert.equal(blocked,2);
 blocked=0;listeners.click({target:{closest:s=>s==='#access-gate'},preventDefault(){blocked++;},stopImmediatePropagation(){blocked++;}});assert.equal(blocked,0);
});
