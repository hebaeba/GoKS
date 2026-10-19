const test=require('node:test'),assert=require('node:assert/strict'),A=require('../web/analysis-core.js');
const s={sgf:'(;SZ[9]KM[0]AB[aa]DD[aa][ba][bb];W[bb])',size:9,komi:0,path:[0],index:0};
test('irregular region restricts both players, preserves outside board and permits pass',()=>{const region=A.regionPoints(s);assert.deepEqual(region,[0,1,10]);const p=A.plan(s,'japanese',{seconds:1,pvLength:20,region},false)[0];assert.deepEqual(p.request.allowMoves.map(x=>x.player),['B','W']);assert.deepEqual(p.request.allowMoves[0].moves,['A9','B9','B8','pass']);assert.equal(p.request.allowMoves[0].untilDepth,1000000);assert.equal(p.request.boardXSize,9);assert.deepEqual(p.request.initialStones,[['B','A9']]);assert.deepEqual(A.regionPoints({...s,index:1}),region);});
test('empty, stoneless and full-game restrictions rejected',()=>{assert.throws(()=>A.plan(s,'japanese',{seconds:1,region:[]},false),/網掛け/);assert.throws(()=>A.plan(s,'japanese',{seconds:1,region:[1,10]},false),/石がありません/);assert.throws(()=>A.plan(s,'japanese',{seconds:1,region:[0,1]},true),/現在局面/);assert.throws(()=>A.validateRegion([81],9),/不正/);assert.equal(A.plan(s,'japanese',100,false)[0].request.allowMoves,undefined);});
test('annotations preserve ordinary analysis identity but region masks remain distinct',()=>{
 const changed={...s,sgf:s.sgf.replace('DD[aa][ba][bb]','DD[aa][cc]TR[dd]C[note]')};
 assert.equal(A.identity(s),A.identity(changed));assert.notDeepEqual(A.regionPoints(s),A.regionPoints(changed));
 for(const sgf of [s.sgf.replace('KM[0]','KM[1]'),s.sgf.replace('AB[aa]','AB[cc]'),s.sgf.replace('W[bb]','W[bc]')])assert.notEqual(A.identity(s),A.identity({...s,sgf}));
});
