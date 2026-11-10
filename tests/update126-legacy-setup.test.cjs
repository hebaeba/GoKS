'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {positionCommands,replayLegacySetup}=require('../web/gtp.js');
const GoRules=require('../web/engine.js');
const letters='ABCDEFGHJKLMNOPQRSTUVWXYZ';
const p=(s,n)=>{const m=/^([A-HJ-Z])(\d{1,2})$/.exec(s);return (n-Number(m[2]))*n+letters.indexOf(m[1]);};
const old=new Set(['boardsize','clear_board','komi','play','kata-analyze','clear_cache','stop']);
const modern=new Set([...old,'set_position','kata-set-rules','set_free_handicap']);
const q=(n,initialStones)=>({boardXSize:n,boardYSize:n,rules:'japanese',komi:0,initialStones,initialHandicap:0,initialPlayer:'B',moves:[]});
// Simulate each GTP `play COLOR VERTEX`, checking that no stones are lost.
function replay(n,moves){let state=GoRules.position(n);for(const command of moves){const m=/^play ([BW]) ([A-HJ-Z]\d{1,2})$/.exec(command);assert(m,command);const color=m[1]==='B'?1:2;const before=state.captures[color];state=GoRules.play(state,p(m[2],n),color);assert.equal(state.captures[color],before,'no synthetic move may capture any stones');}return state;}
function verify(n,stones){const expected=Array(n*n).fill(0);for(const [c,vertex] of stones){const at=p(vertex,n);assert.equal(expected[at],0);expected[at]=c==='B'?1:2;}
 const commands=positionCommands(q(n,stones),old,'japanese');assert.deepEqual(commands.slice(0,3),['boardsize '+n,'clear_board','komi 0']);assert.equal(commands.at(-1),'clear_cache');
 const plays=commands.slice(3,-1);assert.equal(plays.length,stones.length);assert.deepEqual(replay(n,plays).board,expected);return commands;
}
test('Update126: black-and-white tsumego setup is exactly reconstructed for legacy GTP',()=>{
 const stones=[['B','D4'],['B','D5'],['B','E4'],['B','E5'],['W','C4'],['W','C5'],['W','C6'],['W','E6'],['W','F5'],['W','F4'],['W','D3'],['W','E3']];
 const commands=verify(9,stones);assert(commands.some(x=>x.startsWith('play B ')));assert(commands.some(x=>x.startsWith('play W ')));
 assert(!commands.some(x=>x.startsWith('set_position')));
});
test('Update126: detached groups and white surrounded chain start at points with final liberty',()=>{
 const stones=[['B','A1'],['B','H8'],['B','D4'],['B','D5'],['B','E4'],['W','C4'],['W','C5'],['W','C6'],['W','E5'],['W','E6'],['W','F5'],['W','B3'],['W','A4'],['W','H1']];
 verify(9,stones);
});
test('Update126: present position after restart can be rebuilt repeatedly without saved prior errors',()=>{
 const stones=[['B','F6'],['B','F7'],['W','G6'],['W','G7'],['W','H7']];
 const first=verify(9,stones),second=verify(9,stones);assert.deepEqual(first,second);
});
test('Update126: modern KataGo still receives set_position and does not use synthetic plays',()=>{
 const stones=[['B','F6'],['W','G6']];const commands=positionCommands(q(9,stones),modern,'japanese');
 assert(commands.some(x=>x==='set_position B F6 W G6'));assert(!commands.some(x=>x.startsWith('play ')));
});
test('Update126: handicap without set_position uses documented standard command',()=>{
 const commands=positionCommands({...q(9,[['B','C3'],['B','G7']]),initialHandicap:2},new Set([...old,'set_free_handicap']),'japanese');
 assert(commands.includes('set_free_handicap C3 G7'));
});
test('Update126: invalid diagrams fail rather than silently using the wrong position',()=>{
 assert.throws(()=>replayLegacySetup([['B','C3'],['W','C3']],9),/重複/);
 assert.throws(()=>replayLegacySetup([['W','A1'],['B','B1'],['B','A2']],9),/呼吸点/);
 assert.throws(()=>replayLegacySetup([['B','A10']],9),/盤外/);
 assert.throws(()=>replayLegacySetup([['B','pass']],9),/盤外/);
 assert.throws(()=>replayLegacySetup([['X','A1']],9),/色/);
});
test('Update126: legacy manual and cache-busted scripts explain the setup replay limit',()=>{
 const root=path.resolve(__dirname,'..');const src=p=>fs.readFileSync(path.join(root,p),'utf8');
 assert.match(src('web/index.html'),/gtp\.js\?v=126/);assert.match(src('web/index.html'),/analysis\.js\?v=126/);
 for(const file of ['README.md','Manual.html'])assert.match(src(file),/コウ履歴/);
 for(const file of ['README-en.md','Manual.html'])assert.match(src(file),/ko restrictions/);
});
