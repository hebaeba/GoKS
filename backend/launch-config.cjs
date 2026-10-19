'use strict';
const fs=require('node:fs'),path=require('node:path'),files=require('./windows-files.cjs');
function launchConfig(config,defaultConfig){
 const kind=config.kind||'katago';if(kind!=='katago')throw Error('KataGo専用です。KataGoの登録を選択してください。');
 const file=(key,required,fallback)=>{const value=config[key]||fallback;if(!value){if(required)throw Error(key+'を指定してください');return null;}const p=path.resolve(value);files.validateFile(key,p);return p;};
 const exe=file('exe',true),model=file('model',true),cfg=file('config',true,defaultConfig);
 let extra=config.extraArgs||[];if(!Array.isArray(extra)||extra.length>100||extra.some(a=>typeof a!=='string'||/[\r\n\0]/.test(a)))throw Error('追加引数が不正です');
 extra=extra.map(arg=>{if(arg.includes('{model}')&&!model)throw Error('{model}に対応するモデルを指定してください');if(arg.includes('{config}')&&!cfg)throw Error('{config}に対応する設定ファイルを指定してください');return arg.replaceAll('{model}',model||'').replaceAll('{config}',cfg||'');});
 const args=['gtp','-model',model,'-config',cfg,...extra,'-override-config','reportAnalysisWinratesAs=BLACK,analysisPVLen=30,ponderingEnabled=false,rootSymmetryPruning=false'];
 const cwd=config.workdir?path.resolve(config.workdir):path.dirname(exe);if(!fs.existsSync(cwd)||!fs.statSync(cwd).isDirectory())throw Error('作業フォルダーが見つかりません');
 return {kind,exe,model,cfg,args,cwd};
}
module.exports={launchConfig};
