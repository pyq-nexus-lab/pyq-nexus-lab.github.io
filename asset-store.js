(function(root){
  'use strict';
  const tasks=new Map(),prepared=new Map();
  let generation=0;
  function direct(q){const file=root.PYQ_IMAGE_INDEX?.[q?.pack]?.[q?.assetId||q?.id];return file?'question-images/'+file:null;}
  function load(pack){
    if(tasks.has(pack))return tasks.get(pack);
    const entry=root.PYQ_ASSET_INDEX?.[pack];
    const task=(async()=>{
      if(!entry){
        await new Promise((resolve,reject)=>{const script=document.createElement('script');script.src=pack;script.onload=resolve;script.onerror=()=>{script.remove();reject(Error('Image bundle failed to load'));};document.head.append(script);});return;
      }
      const response=await fetch(entry.url);if(!response.ok)throw Error('Image download failed');
      const bytes=await response.arrayBuffer();if(bytes.byteLength!==entry.bytes)throw Error('Incomplete image download');
      const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),v=>v.toString(16).padStart(2,'0')).join('');
      if(digest!==entry.sha256)throw Error('Image integrity check failed');
      if(typeof DecompressionStream!=='function')throw Error('Update your browser to view these screenshots');
      const stream=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
      const data=JSON.parse(await new Response(stream).text());
      for(const name of ['PYQ_IMAGES','SOM_IMAGES'])if(data[name])Object.assign(root[name]||(root[name]={}),data[name]);
    })();
    tasks.set(pack,task);task.catch(()=>tasks.delete(pack));return task;
  }
  async function source(q){
    const url=direct(q);if(url)return url;
    const id=q.assetId||q.id;
    if(q.pack&&!root.PYQ_IMAGES?.[id]&&!root.SOM_IMAGES?.[id])await load(q.pack);
    return root.PYQ_IMAGES?.[id]||root.SOM_IMAGES?.[id]||q.imageUrl||'public/'+q.image;
  }
  // Warm at most two nearby images, after the visible question has loaded.
  // Content-addressed URLs let the browser reuse exactly the same bytes.
  function prefetch(questions){
    const token=++generation,connection=root.navigator?.connection;
    if(connection?.saveData||/^(slow-)?2g$/.test(connection?.effectiveType||''))return;
    const urls=[...new Set(questions.map(direct).filter(Boolean))].slice(0,2);
    const run=()=>{
      if(token!==generation||root.document?.hidden||root.PYQAccess&&!root.PYQAccess.allowed())return;
      for(const url of urls){
        if(prepared.has(url))continue;
        const img=new root.Image();img.decoding='async';img.fetchPriority='low';
        prepared.set(url,img);img.onerror=()=>prepared.delete(url);img.src=url;
        if(prepared.size>12)prepared.delete(prepared.keys().next().value);
      }
    };
    if(root.requestIdleCallback)root.requestIdleCallback(run,{timeout:700});else root.setTimeout(run,30);
  }
  function enableCache(){
    if(!root.PYQ_IMAGE_INDEX||!root.navigator?.serviceWorker||!root.isSecureContext)return;
    root.navigator.serviceWorker.register('image-cache-sw.js',{scope:'./'}).catch(()=>{});
  }
  root.PYQAssetStore={load,source,prefetch,enableCache};
  enableCache();
})(window);
