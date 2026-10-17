'use strict';
// Publish the original screenshot bytes individually. Source bundles stay in Git.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto'),zlib=require('node:zlib');
const root=__dirname;
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
function decodeImage(uri){
  const match=/^data:image\/(webp|png|jpeg);base64,([A-Za-z0-9+/=\r\n]+)$/.exec(uri);
  if(!match)throw Error('Unsupported screenshot format');
  const bytes=Buffer.from(match[2],'base64'),ext=match[1]==='jpeg'?'jpg':match[1];
  if(!bytes.length)throw Error('Empty screenshot');
  return {bytes,file:hash(bytes)+'.'+ext};
}
function buildSite(destination){
  const out=path.resolve(destination);
  if(out===root||fs.existsSync(out)&&fs.readdirSync(out).length)throw Error('Build destination must be an empty dedicated folder');
  fs.mkdirSync(out,{recursive:true});
  const html=fs.readFileSync(path.join(root,'index.html'),'utf8'),context={window:{}};
  const bankFiles=[...html.matchAll(/data-runtime="([^"?]+)(?:\?[^\"]*)?"/g)].map(m=>m[1]).filter(f=>f==='bank.js'||f.endsWith('-bank.js'));
  for(const file of bankFiles)vm.runInNewContext(fs.readFileSync(path.join(root,file),'utf8'),context,{timeout:10000});
  const original=require('./catalog.js').prepare([{subject:'som',questions:context.window.SOM_BANK},...context.window.PYQ_BANKS]);
  for(const file of ['answers-data.js','crops-data.js'])vm.runInNewContext(fs.readFileSync(path.join(root,file),'utf8'),context,{timeout:10000});
  const bank=require('./crops.js').apply(require('./answers.js').apply(original,context.window.PYQ_ANSWER_DATA),context.window.PYQ_CROP_DATA);
  const imageIndex={},packs=[...new Set(bank.map(q=>q.pack))].sort(),seen=new Map(),sizes=[],packBytes={};
  const bundleReader=require('./asset-test-utils.cjs');
  for(const pack of packs){
    if(!pack||!/^[-\w]+\.js$/.test(pack))throw Error('Unexpected screenshot bundle '+pack);
    const data=bundleReader.read(pack),images={...data.SOM_IMAGES,...data.PYQ_IMAGES};
    imageIndex[pack]={};packBytes[pack]=fs.statSync(path.join(root,bundleReader.index[pack]?.url||pack)).size;
    for(const [id,uri] of Object.entries(images)){
      const {bytes,file}=decodeImage(uri),relative=file.slice(0,2)+'/'+file;
      imageIndex[pack][id]=relative;
      if(seen.has(file)){if(seen.get(file)!==bytes.length)throw Error('Screenshot hash collision');continue;}
      const directory=path.join(out,'question-images',file.slice(0,2));fs.mkdirSync(directory,{recursive:true});
      fs.writeFileSync(path.join(directory,file),bytes);seen.set(file,bytes.length);sizes.push(bytes.length);
    }
  }
  for(const q of bank)if(!imageIndex[q.pack]?.[q.assetId||q.id])throw Error('Missing screenshot for '+q.id);
  const excludes=new Set([...fs.readFileSync(path.join(root,'_config.yml'),'utf8').matchAll(/^\s+- "([^"]+)"/gm)].map(m=>m[1]));
  for(const entry of fs.readdirSync(root,{withFileTypes:true})){
    const name=entry.name;
    if(!entry.isFile()||excludes.has(name)||name.startsWith('.')||/assets[-.]|\.pack$|\.cjs$|\.test\.|^performance-/.test(name))continue;
    if(!/\.(?:html|js|css|json|svg|png|webp|txt|ico)$/.test(name))continue;
    fs.copyFileSync(path.join(root,name),path.join(out,name));
  }
  fs.appendFileSync(path.join(out,'asset-index.js'),'\nwindow.PYQ_IMAGE_INDEX='+JSON.stringify(imageIndex)+';\n');
  fs.writeFileSync(path.join(out,'.nojekyll'),'');
  sizes.sort((a,b)=>a-b);
  const samples=bank.filter((q,i)=>i%Math.max(1,Math.floor(bank.length/12))===0).map(q=>({id:q.id,pack:q.pack,previousBundleBytes:packBytes[q.pack],image:imageIndex[q.pack][q.assetId||q.id],imageBytes:seen.get(path.basename(imageIndex[q.pack][q.assetId||q.id]))}));
  const stats={questions:bank.length,packs:packs.length,uniqueImages:seen.size,imageBytes:sizes.reduce((a,b)=>a+b,0),medianImageBytes:sizes[Math.floor(sizes.length/2)],maxImageBytes:sizes.at(-1),indexGzipBytes:zlib.gzipSync(JSON.stringify(imageIndex)).length,samples};
  fs.writeFileSync(path.join(out,'image-delivery-report.json'),JSON.stringify(stats,null,2));
  return stats;
}
if(require.main===module)console.log(JSON.stringify(buildSite(process.argv[2]||path.join(root,'_site')),null,2));
module.exports={decodeImage,buildSite};
