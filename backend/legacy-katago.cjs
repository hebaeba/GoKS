'use strict';
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {spawnSync}=require('node:child_process');
const knownOverrideKeys=['reportAnalysisWinratesAs','analysisPVLen','ponderingEnabled','koRule','scoringRule','multiStoneSuicideLegal','cleanupBeforePass','allowResignation','maxTime','maxVisits','maxPlayouts','resignThreshold','resignConsecTurns'];
function legacyHelp(output){
 const t=String(output||'');
 if(t.includes('-override-config'))return false;
 return /(?:Brief\s+USAGE|USAGE|Usage):?/i.test(t)&&t.includes('-model')&&t.includes('-config');
}
function needsLegacyMode(exe){
 const r=spawnSync(exe,['gtp','-help'],{windowsHide:true,encoding:'utf8',timeout:4000,maxBuffer:512*1024});
 return legacyHelp((r.stdout||'')+'\n'+(r.stderr||''));
}
function legacyBaseConfig(exe,requested,defaultConfig){
 if(requested){return requested;}
 const adjacent=path.join(path.dirname(exe),'gtp_example.cfg');
 if(!fs.existsSync(adjacent)||!fs.statSync(adjacent).isFile())throw Error('この旧版KataGoには付属のgtp_example.cfgが必要です。KataGoのZIPをすべて展開するか、設定CFGで旧版用ファイルを指定してください。');
 return adjacent;
}
function legacyOverrides(config){
 const rules=config.initialRules==='chinese'?'chinese':'japanese';
 const map={reportAnalysisWinratesAs:'BLACK',analysisPVLen:30,ponderingEnabled:false,
  koRule:rules==='japanese'?'SIMPLE':'POSITIONAL',scoringRule:rules==='japanese'?'TERRITORY':'AREA',multiStoneSuicideLegal:false,cleanupBeforePass:rules!=='japanese'};
 if(config.matchMode)throw Error('KataGo v1.2は現在のGoKSのAI対局に必要なGTP命令を備えていません。解析専用に使用してください。');
 return {rules,values:map};
}
function buildLegacyConfig(original,values){
 if(/^\s*(?:rules|logDir|rootSymmetryPruning)\s*=/m.test(original))throw Error('旧版KataGoには新しいCFG設定が指定されています。v1.2付属のgtp_example.cfgを設定CFGに指定してください。');
 let text=original.replace(/^\s*(?!#)([A-Za-z][A-Za-z0-9]*)\s*=.*$/gm,(line,key)=>Object.hasOwn(values,key)?'# GoKS legacy: replaced '+key:line);
 for(const [key,value] of Object.entries(values)){
  if(!knownOverrideKeys.includes(key)||!(typeof value==='boolean'||typeof value==='number'||/^(?:BLACK|SIMPLE|POSITIONAL|TERRITORY|AREA)$/.test(String(value))))throw Error('旧版エンジンの設定に不正な値があります');
  text+='\n'+key+' = '+String(value)+'\n';
 }
 return text;
}
function writeLegacyConfig(text){const dir=fs.mkdtempSync(path.join(os.tmpdir(),'goks-legacy-'));const cfg=path.join(dir,'gtp.cfg');try{fs.writeFileSync(cfg,text,{encoding:'utf8',mode:0o600});return {cfg,dir};}catch(e){fs.rmSync(dir,{recursive:true,force:true});throw e;}}
module.exports={legacyHelp,needsLegacyMode,legacyBaseConfig,legacyOverrides,buildLegacyConfig,writeLegacyConfig};
