const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),S=require('./sync-core.js');
function app(){
  const storage=new Map(),rows=new Map(),events={},timers=new Map();let timerId=0;
  const blank=()=>({answers:{},flags:{},bookmarks:{},notes:{},attempts:[],overrides:{},drawings:{},theme:'dark',session:null,subject:'all',planner:[]});
  const ctx={NexusSyncCore:S,PYQ_ACCOUNT_CONFIG:{cloudBackups:true},state:blank(),STORAGE:'som-lab-v1',LIBRARY:{original:{has:()=>true}},BANK:[],PYQ_CURRICULUM_DATA:{orderRevision:1},PYQDedup:{migrate:s=>s},PYQCurriculum:{migrateSession:s=>s},PYQInsights:{preferences:v=>v||{}},PYQLearning:{preferences:v=>v||{}},nxUpgradePractice:()=>{},revealed:new Set(),view:'dashboard',render:()=>{},document:{querySelector:()=>null,addEventListener:(k,v)=>events[k]=v,visibilityState:'visible'},navigator:{onLine:true},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},setTimeout:f=>{timers.set(++timerId,f);return timerId;},clearTimeout:id=>timers.delete(id),setInterval:()=>{},addEventListener:(k,v)=>events[k]=v,console,Date};
  ctx.save=()=>storage.set(ctx.STORAGE,JSON.stringify(ctx.state));ctx.window=ctx;vm.createContext(ctx);vm.runInContext(fs.readFileSync(__dirname+'/cloud-sync.js','utf8'),ctx);
  const client={from(){let op='read',body,filters={};const q={select(){return q;},eq(k,v){filters[k]=v;return q;},insert(v){op='insert';body=v;return q;},update(v){op='update';body=v;return q;},single(){return q.maybeSingle();},async maybeSingle(){const id=body?.user_id||filters.user_id,old=rows.get(id);if(op==='read')return {data:S.clone(old||null)};if(op==='insert'&&old)return {error:{code:'23505'}};if(op==='update'&&old?.revision!==filters.revision)return {data:null};const row={payload:S.clone(body.payload),revision:(old?.revision||0)+1,updated_at:new Date().toISOString()};rows.set(id,row);return {data:S.clone(row)};}};return q;}};
  return {ctx,storage,rows,events,timers,client,blank};
}
test('save hook uploads a question change and restores it into an independent device',async()=>{const a=app();await a.ctx.PYQSync.connect(a.client,{id:'alice'});a.ctx.state.session={ids:['q1','q2'],index:1,start:1,mode:'practice',answers:{q1:'C'},times:{},submitted:{q1:true}};a.ctx.state.answers.q1='C';a.ctx.save();assert.equal(a.ctx.PYQSync.isDirty(),true);await a.ctx.PYQSync.syncNow();assert.equal(a.rows.get('alice').payload.state.session.index,1);const b=app();b.rows.set('alice',S.clone(a.rows.get('alice')));await b.ctx.PYQSync.connect(b.client,{id:'alice'});assert.equal(b.ctx.state.session.index,1);assert.equal(b.ctx.state.answers.q1,'C');assert.equal(b.ctx.view,'practice');});
test('changing accounts never uploads the previous account workspace',async()=>{const a=app();a.ctx.state.notes.q1='Alice only';await a.ctx.PYQSync.connect(a.client,{id:'alice'});await a.ctx.PYQSync.connect(a.client,{id:'bob'});assert.equal(a.rows.get('bob').payload.state.notes.q1,undefined);assert.equal(a.ctx.state.notes.q1,undefined);await a.ctx.PYQSync.connect(a.client,{id:'alice'});assert.equal(a.ctx.state.notes.q1,'Alice only');});
test('same-browser tab changes update the in-memory workspace without a storage loop',async()=>{const a=app();await a.ctx.PYQSync.connect(a.client,{id:'alice'});const other=S.clone(a.ctx.state);other.notes.q1='Another tab';a.events.storage({key:'som-lab-v1',newValue:JSON.stringify(other)});assert.equal(a.ctx.state.notes.q1,'Another tab');await a.ctx.PYQSync.syncNow();assert.equal(a.rows.get('alice').payload.state.notes.q1,'Another tab');});
test('offline warning retains local queue and reconnect schedules a retry',async()=>{const a=app();await a.ctx.PYQSync.connect(a.client,{id:'alice'});a.ctx.state.notes.q2='offline note';a.ctx.save();a.events.offline();assert.equal(a.ctx.PYQSync.status().kind,'error');assert.equal(JSON.parse(a.storage.get('pyq-nexus-sync:alice')).local.notes.q2,'offline note');a.events.online();assert(a.timers.size>0);await a.ctx.PYQSync.syncNow();assert.equal(a.rows.get('alice').payload.state.notes.q2,'offline note');});

test('guest progress is isolated from signed-in progress and survives account round trips',async()=>{
 const a=app();a.ctx.state.notes.q1='Private account note';await a.ctx.PYQSync.connect(a.client,{id:'alice'});a.ctx.save();
 a.ctx.PYQSync.useGuest();assert.equal(a.ctx.STORAGE,'pyq-nexus-guest-v1');assert.equal(a.ctx.state.notes.q1,undefined);
 a.ctx.state.notes.q2='Guest note';a.ctx.state.session={ids:['q1','q2'],index:1,start:1,mode:'practice',answers:{q1:'B'},times:{}};a.ctx.save();
 assert.equal(await a.ctx.PYQSync.syncNow(),false);assert.equal(a.rows.get('alice').payload.state.notes.q2,undefined);
 await a.ctx.PYQSync.connect(a.client,{id:'alice'});assert.equal(a.ctx.STORAGE,'som-lab-v1');assert.equal(a.ctx.state.notes.q1,'Private account note');assert.equal(a.ctx.state.notes.q2,undefined);
 a.ctx.PYQSync.useGuest();assert.equal(a.ctx.state.notes.q2,'Guest note');assert.equal(a.ctx.state.notes.q1,undefined);assert.equal(a.ctx.state.session.index,1);
 const b=app();b.ctx.STORAGE='pyq-nexus-guest-v1';b.ctx.state=JSON.parse(a.storage.get('pyq-nexus-guest-v1'));b.ctx.PYQSync.useGuest();assert.equal(b.ctx.state.session.index,1);assert.equal(b.ctx.state.notes.q2,'Guest note');
});
test('first account login from guest starts separate cloud progress and retains the guest copy',async()=>{
 const a=app();a.ctx.PYQSync.useGuest();a.ctx.state.answers.q1='D';a.ctx.state.notes.q1='Guest only';a.ctx.save();
 await a.ctx.PYQSync.connect(a.client,{id:'bob'});assert.equal(a.ctx.state.notes.q1,undefined);assert.equal(a.rows.get('bob').payload.state.answers.q1,undefined);
 assert.equal(JSON.parse(a.storage.get('pyq-nexus-guest-v1')).answers.q1,'D');a.ctx.PYQSync.useGuest();assert.equal(a.ctx.state.answers.q1,'D');
});
test('a late account download cannot overwrite the guest workspace',async()=>{
 const a=app();let resolve;const delayed={from:()=>({select(){return this;},eq(){return this;},maybeSingle:()=>new Promise(r=>resolve=r)})};
 const loading=a.ctx.PYQSync.connect(delayed,{id:'alice'});a.ctx.PYQSync.useGuest();a.ctx.state.notes.q2='Guest now';a.ctx.save();
 resolve({data:{payload:{format:'pyq-lab-backup',version:1,state:{...a.blank(),notes:{q1:'Private'}}},revision:1}});await loading;
 assert.equal(a.ctx.state.notes.q2,'Guest now');assert.equal(a.ctx.state.notes.q1,undefined);assert.equal(a.ctx.STORAGE,'pyq-nexus-guest-v1');
});
test('private workspace storage events are ignored in guest mode',async()=>{
 const a=app();a.ctx.PYQSync.useGuest();const privateState={...a.blank(),notes:{q1:'Private'}};a.events.storage({key:'som-lab-v1',newValue:JSON.stringify(privateState)});assert.equal(a.ctx.state.notes.q1,undefined);assert.equal(a.rows.size,0);
});
