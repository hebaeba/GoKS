const test=require('node:test'),assert=require('node:assert/strict'),A=require('../web/analysis-core.js');
const s={sgf:'(;SZ[9]KM[0];B[aa];W[bb];B[cc])',size:9,komi:0,path:[0,0,0],index:3};
const item=(index,score,win=.5)=>({index,move:index,result:{rootInfo:{scoreLead:score,winrate:win}}});
test('ranking uses mover perspective and sorts loss, not lowest absolute score',()=>{const r=A.worstMoves(s,[item(0,2),item(1,-3),item(2,4),item(3,-4)]);assert.deepEqual(r.map(x=>[x.move,x.color,x.loss]),[[3,'B',8],[2,'W',7],[1,'B',5]]);assert.equal(r[0].point,'C7');});
test('missing positions, improving moves and setup nodes are not ranked as mistakes',()=>{assert.equal(A.worstMoves(s,[item(0,0),item(2,-10)]).length,0);assert.equal(A.worstMoves(s,[item(0,0),item(1,2)]).length,0);const setup={...s,sgf:'(;SZ[9];AB[aa];W[bb])',path:[0,0],index:2};assert.equal(A.worstMoves(setup,[item(0,9),item(1,-9)]).length,0);});
test('ranking follows selected branch and includes pass',()=>{const v={...s,sgf:'(;SZ[9];B[aa](;W[bb])(;W[]))',path:[0,1],index:2};const r=A.worstMoves(v,[item(0,0),item(1,0),item(2,3)]);assert.equal(r[0].point,'pass');assert.equal(r[0].loss,3);});

test('winrate ranking includes score improvements with winrate losses and changes order',()=>{const items=[item(0,0,.9),item(1,2,.5),item(2,4,.6),item(3,-4,.55)];assert.deepEqual(A.worstMoves(s,items,'winrate').map(x=>x.move),[1,2,3]);assert.deepEqual(A.worstMoves(s,items,'score').map(x=>x.move),[3,2]);assert.equal(A.worstMoves(s,items,'winrate')[0].loss,-2);});
