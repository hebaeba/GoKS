'use strict';
const {spawn}=require('node:child_process'),readline=require('node:readline'),fs=require('node:fs'),path=require('node:path');
const windowsFiles=require('./windows-files.cjs');
class Engine {
 constructor(){this.child=null;this.events=[];this.logs=[];this.generation=0;this.meta=null;this.legacyTempDir=null;}
 event(e){if(this.events.length>=5000){this.stop();throw Error('受信キューが上限に達しました。');}this.events.push(e);}
 stop(){const child=this.child;this.child=null;this.generation++;if(this.legacyTempDir){try{fs.rmSync(this.legacyTempDir,{recursive:true,force:true});}catch{}this.legacyTempDir=null;}if(child){child.stdin.destroy();child.kill();}return {running:false};}
 async start(config){
  const {kind,exe,model,cfg,args,cwd,isLegacy,legacyRules,configText,legacyTempDir}=require('./launch-config.cjs').launchConfig(config,path.resolve(__dirname,'../config/default_gtp.cfg'));
  if(process.platform==='win32'){const missing=windowsFiles.missingDlls(exe);if(missing.length)throw Error('必要なDLLが見つかりません：'+missing.join('、')+'。エンジンの配布ZIPをすべて展開してください。');}
  this.stop();this.legacyTempDir=legacyTempDir;this.events=[];this.logs=[];const gen=this.generation;
  const child=spawn(exe,args,{cwd,windowsHide:true,stdio:['pipe','pipe','pipe'],shell:false});this.child=child;
  child.stdin.on('error',e=>{if(gen===this.generation)this.logs.push(e.message);});
  const modelStat=model?fs.statSync(model):null;this.meta={engine:path.basename(exe),kind,supportsAnalysis:kind==='katago',model:model?path.basename(model):'',modelBytes:modelStat?.size??null,modelModified:modelStat?.mtime.toISOString()??null,config:cfg?path.basename(cfg):'',protocol:'GTP',perspective:kind==='katago'?'BLACK':null,legacy:isLegacy,legacyRules,configText:kind==='katago'?(configText||fs.readFileSync(cfg,'utf8')).slice(0,100000):''};
  readline.createInterface({input:child.stdout}).on('line',line=>{if(gen!==this.generation)return;try{if(line.length>4*1024*1024)throw Error('応答が長すぎます');this.event({type:'gtp',line});}catch(e){this.logs.push('標準出力：'+line.slice(0,1000));}});
  readline.createInterface({input:child.stderr}).on('line',line=>{if(gen!==this.generation)return;this.logs.push(line.slice(0,4000));if(this.logs.length>200)this.logs.shift();});
  child.on('close',(code,signal)=>{if(gen===this.generation){this.child=null;this.event({type:'exit',message:windowsFiles.exitMessage(code,signal)});}});
  await new Promise((resolve,reject)=>{child.once('spawn',resolve);child.once('error',e=>{if(gen===this.generation)this.child=null;reject(Error('エンジンを起動できません：'+e.message));});});
  return {running:true,meta:this.meta};
 }
 send(query){if(!this.child)throw Error('エンジンを起動してください。');const commands=query?.commands;if(!Array.isArray(commands)||!commands.length||commands.length>20001||commands.some(c=>typeof c!=='string'||!/^\d+ [a-z_][a-z_0-9-]*(?: |$)/i.test(c)||/[\r\n\0]/.test(c)))throw Error('GTP命令が不正です');const text=commands.join('\n')+'\n';if(Buffer.byteLength(text)>2*1024*1024)throw Error('GTPリクエストが大きすぎます');this.child.stdin.write(text);return {accepted:true};}
 poll(){return {running:!!this.child,events:this.events.splice(0),logs:this.logs.splice(0),meta:this.meta};}
 async call(action,payload={}){if(action==='defaults')return require('./bundled-engines.cjs').bundledEngines();if(action==='pick')return windowsFiles.pick(payload.kind);if(action==='start')return this.start(payload);if(action==='stop')return this.stop();if(action==='send')return this.send(payload);if(action==='poll')return this.poll();throw Error('操作が不正です');}
}
module.exports={Engine};
