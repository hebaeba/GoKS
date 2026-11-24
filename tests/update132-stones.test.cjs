const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const R=require('../web/engine.js');
const S=require('../web/sgf.js');
const source=fs.readFileSync(require.resolve('../web/app.js'),'utf8');
const annotate=source.slice(source.indexOf('  async function annotate(point)'),source.indexOf('  // Delete just the DD'));
const removeAt=source.split('\n').find(line=>line.startsWith('  function removeAt('));
const click=Function('R','S','root','route','frames','index','tool',`
 const size=9,editing=true,insertion=false,choices=new WeakMap(),canLeave=async()=>true,transaction=action=>action();
 ${removeAt}
 ${annotate}
 return annotate(0);
`);
test('A second setup click clears either color, including a point from a compressed SGF range',async()=>{
 for(const tool of ['AB','AW']){
  const root=S.node();
  const apply=()=>R.apply(R.position(9),root.props,true);
  await click(R,S,root,[root],[apply()],0,tool);
  assert.deepEqual(root.props[tool],['aa']);
  root.props[tool]=['aa:ba'];
  await click(R,S,root,[root],[apply()],0,tool);
  assert.deepEqual(root.props[tool],['ba']);
  assert.equal(apply().board[0],R.EMPTY);
 }
});
test('Clearing an inherited stone preserves the parent move and records AE in a separate node',async()=>{
 const root=S.parse('(;SZ[9];B[aa];W[bb])').root,move=root.children[0],reply=move.children[0];
 const start=R.apply(R.position(9),root.props,true),played=R.apply(start,move.props);
 await click(R,S,root,[root,move],[start,played],1,'AB');
 assert.deepEqual(move.props.B,['aa']);
 const setup=move.children[0];
 assert.deepEqual(setup.props.AE,['aa']);
 assert.equal(setup.children[0],reply);
 assert.equal(R.apply(played,setup.props).board[0],R.EMPTY);
});
