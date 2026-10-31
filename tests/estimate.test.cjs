const test=require('node:test'),assert=require('node:assert/strict'),E=require('../web/estimate-core.js'),S=require('../web/sgf.js');
const snap=(sgf,index,path)=>({sgf,index,path});
test('ownership validates dimensions and values and preserves BLACK perspective',()=>{
 const line='info move A1 winrate 0.9 scoreLead 9 rootInfo visits 20 winrate 0.4 scoreLead -2 ownership 1 -1 0 0.5 ownershipStdev 0 0 0 0';
 assert.deepEqual(E.parse(line,2),{ownership:[1,-1,0,0.5],scoreLead:-2,winrate:.4});
 assert.equal(E.parse(line,3),null);assert.equal(E.parse(line.replace('1 -1 0 0.5','1 -1 0 2'),2),null);assert.equal(E.parse('play D4',19),null);
});
test('score gate rejects unfinished, resignation, timeout and active matches',()=>{
 const pass=snap('(;SZ[19];B[];W[])',2,[0,0]);assert(E.canScore(pass,S));assert(!E.canScore(pass,S,'playing'));assert(!E.canScore(pass,S,'paused'));
 assert(!E.canScore(snap('(;SZ[19])',0,[]),S));assert(!E.canScore(snap('(;SZ[19];B[aa];W[bb])',2,[0,0]),S));
 for(const result of ['B+R','W+Resign','B+T','W+F'])assert(!E.canScore(snap('(;SZ[19]RE['+result+'];B[];W[])',2,[0,0]),S));
 assert(E.canScore(snap('(;SZ[19]RE[W+6.5];B[aa])',1,[0]),S));assert(!E.canScore(snap('(;SZ[19]RE[W+6.5];B[aa])',0,[0]),S));
});

test('loaded records allow manual scoring without end markers but never during a match',()=>{
 for(const sgf of ['(;SZ[19];B[aa];W[bb])','(;SZ[19]RE[W+R];B[aa];W[bb])']){
  for(const index of [0,2]){
   const record=snap(sgf,index,[0,0]);
   assert(E.canScore(record,S,'idle',true));
   for(const phase of ['starting','playing','paused','stopping'])assert(!E.canScore(record,S,phase,true));
  }
 }
 assert(E.canScore(snap('(;SZ[19];B[];W[])',2,[0,0]),S,'finished',false));
 assert(!E.canScore(snap('(;SZ[19]RE[W+R];B[aa])',1,[0]),S,'finished',false));
 assert(!E.canScore(snap('(;SZ[19])',0,[]),S,'idle',false));
});
