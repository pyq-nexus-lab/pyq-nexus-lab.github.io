(function(root){
 'use strict';
 const fields=new Set(['pack','assetId','width','height','cropSha256','sourceRepair','cropReview','cropPanels']);
 function apply(raw,data={patches:{}}){
  const known=new Set(raw.map(q=>q.id));
  for(const [id,patch] of Object.entries(data.patches||{})){
   if(!known.has(id))throw Error('Unknown screenshot repair: '+id);
   if(Object.keys(patch).some(k=>!fields.has(k)))throw Error('Screenshot repairs may not change question or answer metadata');
   if(!patch.pack||!patch.assetId||!/^[a-f0-9]{64}$/.test(patch.cropSha256)||!Number.isInteger(patch.width)||!Number.isInteger(patch.height)||!(patch.width>0&&patch.height>0)||!patch.cropPanels?.length)throw Error('Incomplete screenshot provenance: '+id);
   for(const panel of patch.cropPanels){const b=panel.box,s=panel.pageSize;if(!(panel.page>0)||b?.length!==4||s?.length!==2||![...b,...s].every(Number.isFinite)||b[0]<0||b[1]<0||b[2]>s[0]||b[3]>s[1]||b[2]<=b[0]||b[3]<=b[1])throw Error('Invalid source crop bounds: '+id)}
  }
  return raw.map(q=>({...q,...data.patches?.[q.id]}));
 }
 const api={apply};root.PYQCrops=api;if(typeof module!=='undefined')module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
