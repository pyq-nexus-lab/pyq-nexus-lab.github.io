const fs=require('node:fs'),vm=require('node:vm'),zlib=require('node:zlib');
const c={window:{}};vm.runInNewContext(fs.readFileSync('asset-index.js','utf8'),c);const index=c.window.PYQ_ASSET_INDEX;
function read(pack){if(index[pack])return JSON.parse(zlib.gunzipSync(fs.readFileSync(index[pack].url)));const context={window:{}};vm.runInNewContext(fs.readFileSync(pack,'utf8'),context);return context.window;}
function load(pack,target){const data=read(pack);for(const name of ['PYQ_IMAGES','SOM_IMAGES'])if(data[name])Object.assign(target[name]||(target[name]={}),data[name]);}
module.exports={index,read,load};
