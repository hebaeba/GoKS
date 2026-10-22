const test=require('node:test'),assert=require('node:assert/strict'),M=require('../web/match-core.js'),S=require('../web/sgf.js');
test('genmove response extracts genuine BLACK-perspective evaluation and actual move',()=>{const r=M.parseMove('info move D4 visits 8 winrate 0.2 scoreLead -4 order 0 pv D4 E5 rootInfo visits 10 winrate 0.1 scoreLead -5\nplay D4');assert.deepEqual(r,{move:'D4',evaluation:{winrate:.1,scoreLead:-5}});assert.deepEqual(M.view(r.evaluation,'W'),{winrate:.9,scoreLead:5});assert.equal(M.parseMove('play pass').evaluation,null);assert.equal(M.parseMove('play resign').move,'resign');assert.throws(()=>M.parseMove('info no move'));});
test('resignation uses each color own consecutive turns, unrounded rates and recovery reset',()=>{let b=0,w=0;for(let i=0;i<3;i++){b=M.streak(b,{winrate:0.0001,scoreLead:-30},'B',.001);w=M.streak(w,{winrate:0.0001,scoreLead:-30},'W',.001);}assert.equal(b,3);assert.equal(w,0);assert.equal(M.streak(b,{winrate:.1},'B',.001),0);assert.equal(M.streak(2,null,'B',.001),0);assert.equal(M.streak(2,{winrate:.9999},'W',.001),3);assert.equal(M.streak(2,{winrate:.0011},'B',.001),0);});
test('match SGF keeps metadata and selected played prefix, removes sibling and unplayed future',()=>{const sgf='(;SZ[9]KM[6.5]PB[永草　伸一朗]PW[鈴木　全]GN[テスト]DT[2026-10-20];B[aa](;W[bb];B[cc])(;W[dd];B[ee]))';const result=M.sgf({sgf,index:2,path:[0,1,0]},S);assert.match(result,/PB\[永草　伸一朗\]/);assert.match(result,/W\[dd\]/);assert.doesNotMatch(result,/W\[bb\]|B\[ee\]/);assert.equal(S.parse(result).size,9);});

test('match limits independently set both colors, reject invalid visits, and preserve time cap',()=>{
 for(const visits of [50,100,200,500,1000,321]){const cmds=M.limits(0.5,visits);assert.ok(cmds.includes('kata-set-param maxVisits '+visits));assert.ok(cmds.includes('kata-set-param maxTime 0.5'));}
 assert.ok(M.limits(2,200).includes('kata-set-param maxVisits 200'));assert.ok(M.limits(1,1000).includes('kata-set-param maxVisits 1000'));
 for(const v of [0,-1,1.5,NaN,Infinity,1000000001])assert.throws(()=>M.limits(1,v));
});

test('match time may exceed 600 seconds or be unlimited while visits stay capped',()=>{
 assert.ok(M.limits(3600,500).includes('kata-set-param maxTime 3600'));
 const unlimited=M.limits(0,200);assert.ok(unlimited.includes('kata-set-param maxTime 100000000000000000000'));assert.ok(unlimited.includes('kata-set-param maxVisits 200'));
 for(const seconds of [-1,NaN,Infinity,0.01])assert.throws(()=>M.limits(seconds,500));
});
