'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const root=path.resolve(__dirname,'..');
const source=(name)=>fs.readFileSync(path.join(root,name),'utf8');
const old=require('../backend/legacy-katago.cjs');
const {launchConfig}=require('../backend/launch-config.cjs');
const {positionCommands,analyzeCommand,parseInfo}=require('../web/gtp.js');
const ancient=new Set(['boardsize','clear_board','komi','play','kata-analyze','clear_cache','stop']);
const current=new Set([...ancient,'set_position','kata-set-rules','set_free_handicap']);
test('Update129: v1.2 -help detection and model filename are supported without bundling engines',()=>{
 assert(old.legacyHelp('Brief USAGE: gtp -model <FILE> -config <FILE> [-help]'));
 assert(!old.legacyHelp('USAGE: gtp -model <FILE> -config <FILE> -override-config <KV>'));
 for(const doc of ['README.md','README-en.md','Manual.html']){
  assert.match(source(doc),/igoh120-s618909184-d292623510|igoh120 special/i);
 }
 assert(!fs.existsSync(path.join(root,'katago')));
});
test('Update129: modern KataGo retains overriding while v1.2 uses temporary CFG and selected rule', {skip:process.platform==='win32'},()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'goks-special-old-'));
 try{
  const exe=path.join(dir,'katago.exe'),model=path.join(dir,'igoh120-s618909184-d292623510.txt.gz'),cfg=path.join(dir,'gtp_example.cfg');
  fs.writeFileSync(exe,'#!/bin/sh\nprintf "Brief USAGE: gtp -model <FILE> -config <FILE> [-help]\\n"\n',{mode:0o755});
  fs.writeFileSync(model,'model-stub');fs.writeFileSync(cfg,'koRule = SIMPLE\nscoringRule = TERRITORY\n');
  const oldConfig=launchConfig({exe,model,initialRules:'chinese'},'/unused-default_gtp.cfg');
  try{
   assert.equal(oldConfig.isLegacy,true);assert(!oldConfig.args.includes('-override-config'));
   assert.match(fs.readFileSync(oldConfig.args[4],'utf8'),/scoringRule = AREA/);
   assert.match(fs.readFileSync(oldConfig.args[4],'utf8'),/reportAnalysisWinratesAs = BLACK/);
   assert.equal(oldConfig.legacyRules,'chinese');assert.notEqual(oldConfig.args[4],cfg);
  }finally{fs.rmSync(oldConfig.legacyTempDir,{recursive:true,force:true});}
  assert.throws(()=>launchConfig({exe,model,extraArgs:['-override-config=bad']},cfg),/-override-config/);
  fs.writeFileSync(exe,'#!/bin/sh\nprintf "USAGE: gtp -model <FILE> -config <FILE> -override-config <OPTIONS>\\n"\n',{mode:0o755});
  const modern=launchConfig({exe,model,config:cfg,initialRules:'japanese'},cfg);
  assert.equal(modern.isLegacy,false);assert(modern.args.includes('-override-config'));
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('Update129: old tsumego board replay is supported; unsupported regional restriction fails openly',()=>{
 const q={boardXSize:9,boardYSize:9,rules:'japanese',komi:0,initialStones:[['B','C4'],['W','D4']],moves:[],initialPlayer:'B'};
 const older=positionCommands(q,ancient,'japanese');
 assert(older.includes('play B C4'));assert(older.includes('play W D4'));
 assert(!older.some(s=>s.includes('set_position')));assert(!older.some(s=>s.includes('kata-set-rules')));
 const newer=positionCommands(q,current);assert(newer.some(s=>s.startsWith('set_position B C4 W D4')));
 assert.throws(()=>analyzeCommand({...q,allowMoves:[{player:'B',moves:['C4']}]},ancient),/網掛け領域/);
 assert.match(analyzeCommand(q,ancient),/^kata-analyze B 10$/);
 assert.match(analyzeCommand(q,current),/rootInfo true/);
});
test('Update129: 2019 analysis results can be viewed as approximate estimates',()=>{
 const parsed=parseInfo('info move D4 visits 60 winrate 0.47 scoreMean -2.0 order 0 pv D4 E5');
 assert(parsed?.rootInfo.legacyEstimate);assert.equal(parsed.rootInfo.scoreLead,-2);
});
test('Update129: preserve Update128 shading, ranking, quick picker and native engine backends',()=>{
 assert.match(source('web/app.js'),/kifu-clear-shading/);
 assert.match(source('web/analysis.js'),/analysis-clear-shading/);
 assert.match(source('web/studio.js'),/悪手ランキング（勝率／目数差）/);
 assert.match(source('web/analysis.js'),/initialRules:\$\('analysis-rules'\)\.value/);
 assert.match(source('backend-rs/src/lib.rs'),/legacy_engine\(&exe\)/);
 assert.match(source('web/index.html'),/gtp\.js\?v=130/);
 assert.match(source('web/index.html'),/analysis\.js\?v=132/);
 assert.match(source('web/analysis.js'),/gokifu-startup-engine-v1/);
});
