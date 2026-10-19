'use strict';
const {spawn}=require('node:child_process'),readline=require('node:readline'),fs=require('node:fs'),path=require('node:path');
const windowsFiles=require('./windows-files.cjs');
class Engine {
 constructor(){this.child=null;this.events=[];this.logs=[];this.generation=0;this.meta=null;}
 event(e){if(this.events.length>=5000){this.stop();throw Error('受信キューが上限に達しました。');}this.events.push(e);}
 stop(){const child=this.child;this.child=null;this.generation++;if(child){child.stdin.destroy();child.kill();}return {running:false};}
 async start(config){
  const exe=path.resolve(config.exe||''),model=path.resolve(config.model||''),cfg=config.config?path.resolve(config.config):path.resolve(__dirname,'../config/default_gtp.cfg');
  for(const [label,p]of [['実行ファイル',exe],['モデル',model],['設定ファイル',cfg]])if(!fs.existsSync(p)||!fs.statSync(p).isFile())throw Error(label+'が見つかりません：'+p);
  for(const [kind,file] of [['exe',exe],['model',model],['config',cfg]])windowsFiles.validateFile(kind,file);
  if(process.platform==='win32'){const missing=windowsFiles.missingDlls(exe);if(missing.length)throw Error('必要なDLLが見つかりません：\n'+missing.join('\n')+'\nKataGoの配布ZIPをDLLも含めて展開し直してください。動的に読み込むDLLは起動後のログでも確認します。');}
  const args=config.extraArgs||[];if(!Array.isArray(args)||args.length>100||args.some(a=>typeof a!=='string'||/[\r\n\0]/.test(a)))throw Error('追加引数が不正です');const cwd=config.workdir?path.resolve(config.workdir):path.dirname(exe);if(!fs.existsSync(cwd)||!fs.statSync(cwd).isDirectory())throw Error('作業フォルダーが見つかりません');
  this.stop();this.events=[];this.logs=[];const gen=this.generation;
  const child=spawn(exe,['gtp','-model',model,'-config',cfg,...args,'-override-config','reportAnalysisWinratesAs=BLACK,analysisPVLen=30,ponderingEnabled=false,rootSymmetryPruning=false'],{cwd:path.dirname(exe),windowsHide:true,stdio:['pipe','pipe','pipe'],shell:false});this.child=child;
  child.stdin.on('error',e=>{if(gen===this.generation)this.logs.push(e.message);});
  const modelStat=fs.statSync(model);this.meta={engine:path.basename(exe),model:path.basename(model),modelBytes:modelStat.size,modelModified:modelStat.mtime.toISOString(),config:path.basename(cfg),protocol:'GTP',perspective:'BLACK',configText:fs.readFileSync(cfg,'utf8').slice(0,100000)};
  readline.createInterface({input:child.stdout}).on('line',line=>{if(gen!==this.generation)return;try{if(line.length>4*1024*1024)throw Error('応答が長すぎます');this.event({type:'gtp',line});}catch(e){this.logs.push('標準出力：'+line.slice(0,1000));}});
  readline.createInterface({input:child.stderr}).on('line',line=>{if(gen!==this.generation)return;this.logs.push(line.slice(0,4000));if(this.logs.length>200)this.logs.shift();});
  child.on('close',(code,signal)=>{if(gen===this.generation){this.child=null;this.event({type:'exit',message:windowsFiles.exitMessage(code,signal)});}});
  await new Promise((resolve,reject)=>{child.once('spawn',resolve);child.once('error',e=>{if(gen===this.generation)this.child=null;reject(Error('KataGoを起動できません：'+e.message));});});
  return {running:true,meta:this.meta};
 }
 send(query){if(!this.child)throw Error('KataGoを起動してください。');const commands=query?.commands;if(!Array.isArray(commands)||!commands.length||commands.length>20001||commands.some(c=>typeof c!=='string'||!/^\d+ [a-z_][a-z_0-9-]*(?: |$)/i.test(c)||/[\r\n\0]/.test(c)))throw Error('GTP命令が不正です');const text=commands.join('\n')+'\n';if(Buffer.byteLength(text)>2*1024*1024)throw Error('GTPリクエストが大きすぎます');this.child.stdin.write(text);return {accepted:true};}
 poll(){return {running:!!this.child,events:this.events.splice(0),logs:this.logs.splice(0),meta:this.meta};}
 async call(action,payload={}){if(action==='defaults'){const base=path.resolve(__dirname,'../engines/eigen');return {name:'KataGo Eigen（CPU・標準）',exe:path.join(base,'katago.exe'),model:path.join(base,'model.bin.gz'),config:path.join(base,'analysis_example.cfg'),missing:['katago.exe','model.bin.gz','analysis_example.cfg','z.dll','zip.dll','libssl-3-x64.dll','libcrypto-3-x64.dll'].filter(n=>!fs.existsSync(path.join(base,n)))};}if(action==='pick')return windowsFiles.pick(payload.kind);if(action==='start')return this.start(payload);if(action==='stop')return this.stop();if(action==='send')return this.send(payload);if(action==='poll')return this.poll();throw Error('操作が不正です');}
}
module.exports={Engine};
