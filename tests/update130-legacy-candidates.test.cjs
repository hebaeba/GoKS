'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {plan,normalizedResult}=require('../web/analysis-core.js');
const {parseInfo,positionCommands}=require('../web/gtp.js');
const valid='info move C4 visits 68 winrate 0.010 scoreMean -37.6 order 1 pv C4';
const invalid='info move D4 visits 5 winrate -0.001 scoreMean -37 order 0 pv D4';
test('A bad candidate cannot stop analysis or poison the legacy root',()=>{
 for(const bad of [invalid,invalid.replace('-0.001','1.002'),invalid.replace('visits 5 winrate -0.001','winrate 0.01')]){
  for(const line of [bad+' '+valid,valid+' '+bad]){
   const result=normalizedResult(parseInfo(line),19);
   assert.deepEqual(result.moveInfos.map(m=>m.move),['C4']);
   assert.equal(result.rootInfo.visits,68);
   assert.equal(result.rootInfo.scoreLead,-37.6);
  }
 }
 assert.equal(parseInfo(invalid),null);
 const modern=normalizedResult(parseInfo(valid+' '+invalid+' rootInfo visits 91 winrate 0.02 scoreLead -34'),19);
 assert.equal(modern.rootInfo.visits,91);
 assert.equal(modern.moveInfos.length,1);
});
test('Pasted 19x19 setup reaches the legacy analyzer with all 15 stones and black to play',()=>{
 const sgf='(;GM[1]FF[4]SZ[19]KM[0]AB[aq][br][bp][ds][dq]AW[ap][ao][bo][co][dp][ep][gp][fq][gr][fs]CA[UTF-8])';
 const [{request}]=plan({sgf,size:19,index:0,path:[],komi:0},'japanese',100,false);
 const commands=positionCommands(request,new Set(['play']),'japanese');
 for(const color of ['B','W']){
  assert.deepEqual(commands.filter(c=>c.startsWith('play '+color+' ')).map(c=>c.split(' ')[2]).sort(),
   (color==='B'?['A3','B2','B4','D1','D3']:['A4','A5','B5','C5','D4','E4','G4','F3','G2','F1']).sort());
 }
 assert.equal(request.initialPlayer,'B');
 assert(commands.includes('komi 0'));
});
