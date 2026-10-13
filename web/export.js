/* Independent Go Editor: newly implemented raster exports and GIF89a writer. MIT. */
(function(root){'use strict';
 async function save(blob,name){
  if(root.__TAURI_INTERNALS__?.invoke){const result=await root.__TAURI_INTERNALS__.invoke("desktop_save",{name,bytes:Array.from(new Uint8Array(await blob.arrayBuffer()))});return result.saved;}
  if(root.showSaveFilePicker){let handle;try{handle=await root.showSaveFilePicker({suggestedName:name});}catch(error){if(error.name==='AbortError')return false;if(!['SecurityError','NotAllowedError','TypeError'].includes(error.name))throw error;}if(handle){const out=await handle.createWritable();await out.write(blob);await out.close();return true;}}
  const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=name;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);return true;
 }
 function raster(canvas,type='png'){return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(Error('画像を生成できません。')),type==='jpg'?'image/jpeg':'image/png',.88));}
 function mainOnly(game,clean=false){let first=null,tail=null,current=game;while(current){const props=Object.create(null);for(const [key,value] of Object.entries(current.props))if(!(clean&&['C','GC','N'].includes(key)))props[key]=value.slice();const node={props,children:[]};if(tail)tail.children.push(node);else first=node;tail=node;current=current.children[0];}first.props.CA=['UTF-8'];return first;}
 function palette(){const colors=[];for(let r=0;r<6;r++)for(let g=0;g<6;g++)for(let b=0;b<6;b++)colors.push(r*51,g*51,b*51);for(let n=0;n<40;n++){const v=Math.round(n*255/39);colors.push(v,v,v);}return colors;}
 function indexed(rgba){const out=new Uint8Array(rgba.length/4);for(let i=0,j=0;i<rgba.length;i+=4,j++){const r=rgba[i],g=rgba[i+1],b=rgba[i+2];out[j]=Math.max(r,g,b)-Math.min(r,g,b)<18?216+Math.round((r+g+b)/3*39/255):Math.round(r/51)*36+Math.round(g/51)*6+Math.round(b/51);}return out;}
 // Reset before the dictionary reaches the 10-bit boundary. This keeps codes
 // unambiguously 9-bit while still compressing repeated runs and board patterns.
 function lzw(pixels){const bytes=[];let bits=0,used=0,dict=new Map(),next=258;function emit(code){bits|=code<<used;used+=9;while(used>=8){bytes.push(bits&255);bits>>>=8;used-=8;}}emit(256);if(pixels.length){let prefix=pixels[0];for(let i=1;i<pixels.length;i++){const byte=pixels[i],key=prefix*256+byte;if(dict.has(key))prefix=dict.get(key);else{emit(prefix);dict.set(key,next++);if(next>=500){emit(256);dict.clear();next=258;}prefix=byte;}}emit(prefix);}emit(257);if(used)bytes.push(bits&255);return new Uint8Array(bytes);}
 class Gif{
  constructor(width,height,loop=true){this.parts=[];this.bytes=0;this.width=width;this.height=height;this.add([71,73,70,56,57,97,...this.word(width),...this.word(height),247,0,0,...palette()]);if(loop)this.add([33,255,11,...[...'NETSCAPE2.0'].map(c=>c.charCodeAt(0)),3,1,0,0,0]);}
  word(n){return [n&255,(n>>8)&255];}
  add(bytes){const data=bytes instanceof Uint8Array?bytes:new Uint8Array(bytes);this.parts.push(data);this.bytes+=data.length;if(this.bytes>50*1024*1024)throw Error('GIFが大きすぎます。範囲や画像サイズを小さくしてください。');}
  frame(rgba,seconds){const codes=lzw(indexed(rgba));this.add([33,249,4,4,...this.word(Math.max(1,Math.round(seconds*100))),0,0,44,0,0,0,0,...this.word(this.width),...this.word(this.height),0,8]);for(let i=0;i<codes.length;i+=255){const chunk=codes.subarray(i,i+255);this.add([chunk.length]);this.add(chunk);}this.add([0]);}
  finish(){this.add([59]);return new Blob(this.parts,{type:'image/gif'});}
 }
 const api={save,raster,mainOnly,Gif,indexed,lzw};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.GoExport=api;
})(typeof globalThis==='undefined'?this:globalThis);
