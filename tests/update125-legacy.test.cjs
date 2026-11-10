'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const legacy=require('../backend/legacy-katago.cjs');
const {launchConfig}=require('../backend/launch-config.cjs');
const {parseInfo,positionCommands,analyzeCommand,Bridge}=require('../web/gtp.js');
test('old CLI help cannot use override-config; modern help can',()=>{
 assert(legacy.legacyHelp('Brief USAGE: gtp -model <FILE> -config <FILE> -help'));
 assert(!legacy.legacyHelp('Brief USAGE: gtp -model <FILE> -config <FILE> -override-config <PARAMS>'));
 assert(!legacy.legacyHelp('usage: other program'));
});
test('old CFG overlay keeps base, replaces keys once, preserves user file',()=>{
 const old='koRule = POSITIONAL\nscoringRule = AREA\n# analysisPVLen = 9\nmaxVisits = 1000\n';
 const {rules,values}=legacy.legacyOverrides({initialRules:'japanese'});
 assert.equal(rules,'japanese');const text=legacy.buildLegacyConfig(old,values);
 assert.match(text,/koRule = SIMPLE/);assert.match(text,/scoringRule = TERRITORY/);assert.match(text,/analysisPVLen = 30/);
 assert.match(text,/reportAnalysisWinratesAs = BLACK/);assert.doesNotMatch(text,/^rootSymmetryPruning\s*=/m);
 assert.equal([...text.matchAll(/^scoringRule\s*=/gm)].length,1);
 assert.match(legacy.buildLegacyConfig(old,legacy.legacyOverrides({initialRules:'chinese'}).values),/scoringRule = AREA/);
 assert.throws(()=>legacy.buildLegacyConfig('rules = chinese\n',values),/旧版/);
 assert.throws(()=>legacy.legacyOverrides({matchMode:true}),/解析専用/);
});
test('legacy GTP can omit unsupported rules and board setup, but never silently changes rules',()=>{
 const commands=new Set(['kata-analyze','set_free_handicap','clear_cache','stop']);
 const q={boardXSize:9,boardYSize:9,rules:'japanese',komi:6.5,initialStones:[],moves:[]};
 assert.deepEqual(positionCommands(q,commands,'japanese'),['boardsize 9','clear_board','komi 6.5','clear_cache']);
 assert.equal(analyzeCommand(q,commands),'kata-analyze B 10');
 assert.throws(()=>positionCommands({...q,rules:'chinese'},commands,'japanese'),/再接続/);
 assert.throws(()=>positionCommands({...q,initialStones:[['W','D4']]},commands,'japanese'),/配置石/);
 assert.equal(positionCommands({...q,initialStones:[['B','D4'],['B','E5']],initialHandicap:2},commands,'japanese')[3],'set_free_handicap D4 E5');
});
test('v1.2 analysis info without rootInfo still yields compatible candidate estimates',()=>{
 const line='info move D4 visits 50 winrate 0.6 scoreMean 2.2 order 0 pv D4 C4 info move Q4 visits 20 winrate 0.52 scoreMean 0.7 order 1 pv Q4 Q16';
 const r=parseInfo(line,10);assert(r);assert.equal(r.rootInfo.legacyEstimate,true);assert.equal(r.rootInfo.visits,70);assert.equal(r.rootInfo.scoreLead,2.2);assert.equal(r.moveInfos.length,2);assert.equal(r.moveInfos[0].scoreLead,2.2);
});
test('legacy engine help can be detected from a simulated CLI on non-Windows', {skip:process.platform==='win32'},()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'goks-old-cli-'));
 try{
  const exe=path.join(dir,'katago.exe'),model=path.join(dir,'old.txt.gz'),cfg=path.join(dir,'gtp_example.cfg');
  fs.writeFileSync(exe,'#!/bin/sh\nprintf "Brief USAGE: gtp -model <FILE> -config <FILE> [-help]\\n"\n',{mode:0o700});
  fs.writeFileSync(model,'dummy');fs.writeFileSync(cfg,'koRule = POSITIONAL\nscoringRule = AREA\n');
  const config=launchConfig({exe,model,initialRules:'japanese'},path.join(dir,'default_gtp.cfg'));
  try{
   assert.equal(config.isLegacy,true);assert(!config.args.includes('-override-config'));
   assert.equal(config.args[4],config.cfg);assert(config.cfg!==cfg);
   assert.match(fs.readFileSync(config.cfg,'utf8'),/scoringRule = TERRITORY/);
  }finally{fs.rmSync(config.legacyTempDir,{recursive:true,force:true});}
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
