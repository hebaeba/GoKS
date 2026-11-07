const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');

test('Update122 engine setup labels and no visible folder chooser',()=>{
 const engine=read('web/analysis.js'),layout=read('web/refine.js');
 assert.match(engine,/CPU版エンジンを自動セットアップ/);
 assert.match(engine,/CPU版エンジンを入手/);
 assert.match(engine,/CPU版モデルを入手/);
 assert.match(layout,/\$\('engine-folder'\)\.hidden=true/);
 assert.doesNotMatch(engine,/推奨CPU版|推奨モデル/);
});

test('Update122 ordinary engine hints are hidden while errors and installation progress remain',()=>{
 const engine=read('web/analysis.js');
 assert.match(engine,/function engineMessageIsImportant/);
 assert.match(engine,/box\.hidden=!engineMessageIsImportant\(message\)/);
 assert.match(engine,/\$\('engine-install-status'\)\.hidden=!engineMessageIsImportant\(message\)/);
 assert.match(engine,/function installProgress\(stage,percent\)/);
 assert.match(engine,/msg\.hidden=false;bar\.hidden=false/);
});

test('Update122 Fischer defaults and larger Canadian move counter',()=>{
 const match=read('web/match.js'),clock=read('web/match-clock-window.js');
 assert.match(match,/row\.mainTimes\?\?=\{byoyomi:30,absolute:30,fischer:30,canadian:0\}/);
 assert.match(match,/value="10"><\/label><label data-clock-field="canadian"/);
 assert.match(clock,/clock-canadian-remaining/);
 assert.match(clock,/detailEl\.append\(count,document\.createTextNode/);
 assert.doesNotMatch(clock,/c\.blockMs\/60000/);
 assert.match(match,/対局時計は「方式」から/);
});

test('Update122 board annotation labels have no opaque rectangles and sound button says Save',()=>{
 const board=read('web/app.js'),appearance=read('web/appearance.js');
 assert.doesNotMatch(board,/c\.fillRect\(x-width\/2-1,y-font\*/);
 assert.match(board,/Text markers are drawn directly on the board/);
 assert.match(appearance,/button\(text\('保存','Save'\),save\)/);
});

test('Update122 Japanese and English public manuals have matching section counts',()=>{
 const manual=read('Manual.html'),j=manual.match(/<article id="ja"[\s\S]*?<\/article>/)?.[0],e=manual.match(/<article id="en"[\s\S]*?<\/article>/)?.[0];
 assert.ok(j&&e);assert.equal((j.match(/<section>/g)||[]).length,(e.match(/<section>/g)||[]).length);
 assert.match(e,/Fischer: defaults to 30 minutes with an additional 10 seconds/);
 assert.match(read('README-en.md'),/Fischer \| Main time: 30 minutes; increment: 10 seconds/);
 assert.match(read('README.md'),/フィッシャー \| 持ち時間（分）30／加算（秒／手）10/);
});
