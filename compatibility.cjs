const assert=require('node:assert/strict'),crypto=require('node:crypto');
const fixture=require('./industrial-turbo-prior-ids.json');
// This snapshot was taken before Industrial/Turbomachinery import, not from
// the post-import bank. Moved IDs have explicit reviewed destinations.
function verifyPrior(bank,lib){
 const by=new Map(bank.map(q=>[q.id,q]));
 assert.equal(fixture.unchanged.length,11224);
 assert.equal(fixture.relocated.length,885);
 for(const[id,hash]of fixture.unchanged){
  assert.equal(lib.resolve(id),id,id);const q=by.get(id);assert(q,id);
  assert.equal(crypto.createHash('sha256').update(JSON.stringify(fixture.fields.map(k=>q[k]??null))).digest('hex'),hash,id);
 }
 for(const[id,target]of fixture.relocated){assert.equal(lib.resolve(id),target,id);assert(by.has(target),id);assert(lib.original.has(id),id);}
 return 12109;
}
module.exports={verifyPrior};
