const test=require('node:test'),assert=require('node:assert/strict'),S=require('../web/sgf'),I=require('../web/import');
test('duplicate producer metadata is tolerated, conflicting game data is rejected',()=>{assert.equal(S.parse('(;AP[GNU Go:3.8]AP[foxwq]SZ[19])').root.props.AP[0],'foxwq');assert.throws(()=>S.parse('(;SZ[19]KM[0]KM[6.5])'),/重複/);assert.throws(()=>S.parse('(;B[aa]B[bb])'),/重複/);});
test('deeply nested exporter continuations and sibling variations preserve order',()=>{const text='(;SZ[19]'+ '(;B[])'.replace(')','').repeat(1500)+')'.repeat(1501);const p=S.parse(text);assert.equal(p.count,1501);assert.equal(S.parse(S.write(p.root)).count,1501);const q=S.parse('(;SZ[19](;B[aa](;W[ab])(;W[ac]))(;B[bb]))');assert.deepEqual(S.parse(S.write(q.root)).root,q.root);assert.throws(()=>S.parse('(;B[aa](;W[bb]);B[cc])'));});
test('decoder error gives actionable Japanese rather than native TextDecoder exception',()=>{assert.throws(()=>I.decode(Uint8Array.from([255]),'', 'utf-8'),/文字コードを読み取れません/);});
test('free placement uses actual setup coordinates and the handicap GTP command',()=>{
 const A=require('../web/analysis-core'),G=require('../web/gtp');
 const s={sgf:'(;SZ[19]KM[0.5]HA[3]AB[ff][nn][cj]PL[W]XIGFREEHANDICAP[1])',size:19,komi:.5,index:0,path:[]};
 const q=A.plan(s,'japanese',{seconds:1},false)[0].request;
 assert.equal(q.initialPlayer,'W');assert.equal(q.initialHandicap,3);assert.equal(q.initialStones.length,3);
 assert(G.positionCommands(q).includes('set_free_handicap F14 C10 O6'));
});
