'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');

test('Update123: folder chooser is hidden before removing it from the connected DOM',()=>{
 const src=read('web/refine.js');
 assert.match(src,/\$\('engine-folder'\)\.hidden=true;setup\.append\(\$\('engine-install'\),\$\('engine-folder'\)\)/);
 assert.doesNotMatch(src,/setup\.append\(\$\('engine-install'\),\$\('engine-folder'\)\);\$\('engine-folder'\)\.hidden=true/);
 assert.match(src,/tools\.prepend\(setup,downloads\)/);
 assert.match(src,/downloads\.lastElementChild\.append\(\$\('engine-cpu'\),\$\('engine-network'\)\)/);
 assert.match(src,/legacyActions\.hidden=true/);
 assert.match(src,/settings\.replaceChildren\(tools,separator,d,running\)/);
 assert.match(read('web/index.html'),/refine\.js\?v=123/);
});

test('Update123: engine name is above engine executable and picker launches selected profile',()=>{
 const refine=read('web/refine.js'),studio=read('web/studio.js'),analysis=read('web/analysis.js');
 assert.match(refine,/d\.querySelector\('\.engine-profiles'\)\.after\(\$\('engine-name'\)\.parentElement\)/);
 assert.match(refine,/for\(const key of \['exe','model','config'\]\)/);
 assert.match(studio,/KifuAnalysisControl\.startProfile\(option\.value\)/);
 assert.match(analysis,/choose\.onclick=\(\)=>\{void startProfile\(p\.id\);\}/);
 assert.match(analysis,/const d=profiles\.find\(p=>p\.id===startupId\(\)\)/);
 assert.match(analysis,/radio\.onchange=.*localStorage\.setItem\(startupKey,p\.id\)/);
});

test('Update123: update122 labels, clock defaults, and transparent annotations remain',()=>{
 const engine=read('web/analysis.js'),clock=read('web/match-clock-window.js'),match=read('web/match.js');
 assert.match(engine,/CPU版エンジンを自動セットアップ/);
 assert.match(engine,/CPU版エンジンを入手/);
 assert.match(engine,/CPU版モデルを入手/);
 assert.match(match,/row\.mainTimes\?\?=\{byoyomi:30,absolute:30,fischer:30,canadian:0\}/);
 assert.match(clock,/clock-canadian-remaining/);
 assert.match(read('web/app.js'),/Text markers are drawn directly on the board/);
 assert.match(read('web/appearance.js'),/button\(text\('保存','Save'\),save\)/);
});
