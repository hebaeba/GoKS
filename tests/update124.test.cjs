'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');const read=p=>fs.readFileSync(path.join(root,p),'utf8');
test('Update124: analysis help omits Enter-button tip in both languages',()=>{
 const help=read('web/analysis.js'),en=read('web/i18n-en.js');
 assert.match(help,/文字入力中とダイアログ表示中は通常のキー操作を優先します。/);
 assert.doesNotMatch(help,/ボタンはEnterでも操作できます/);
 assert.match(en,/"文字入力中とダイアログ表示中は通常のキー操作を優先します。":/);
 assert.doesNotMatch(en,/Buttons also work with Enter/);
});
test('Update124: position estimate precedes scoring in the left panel and uses clear labels',()=>{
 const estimate=read('web/estimate.js'),simple=read('web/simple-window-menu.js'),en=read('web/i18n-en.js');
 assert.match(estimate,/button\.id='estimate-open';button\.textContent='盤面の推定値'/);
 assert.match(estimate,/\$\('score'\)\.before\(button\)/);
 assert.match(simple,/command\(game,'盤面の推定値','estimate-open'\)/);
 assert.match(simple,/command\(analysis,'盤面の推定値','estimate-open'\)/);
 assert.match(en,/"盤面の推定値": "Position Estimate"/);
 assert.match(read('web/fields.css'),/#estimate-open\{margin-left:0\}/);
 assert.match(read('web/estimate-view.js'),/<strong>盤面の推定値<\/strong>/);
});
test('Update124: Japanese source README and matching English overview',()=>{
 const ja=read('README.md'),en=read('README-en.md');
 assert.match(ja,/網掛け部分解析/);assert.match(en,/analysis restricted to shaded regions/);
 assert.match(ja,/待った、対局時計/);assert.match(en,/takeback, and a game clock/);
 assert.match(ja,/盤面の推定値/);assert.match(en,/Board position estimates/);
 assert.match(ja,/日本語と英語に対応/);assert.match(en,/Japanese and English language support/);
 assert.match(ja,/フィッシャー \| 持ち時間（分）30／加算（秒／手）10/);
 assert.match(en,/Fischer \| Main time: 30 minutes; increment: 10 seconds/);
 assert.match(read('web/index.html'),/estimate\.js\?v=124/);
});
test('Update124: established engine UI remains available',()=>{
 const refine=read('web/refine.js'),engine=read('web/analysis.js'),startup=read('web/studio.js');
 assert.match(refine,/tools\.prepend\(setup,downloads\)/);
 assert.match(refine,/legacyActions\.hidden=true/);
 assert.match(refine,/settings\.replaceChildren\(tools,separator,d,running\)/);
 assert.match(engine,/CPU版エンジンを自動セットアップ/);
 assert.match(startup,/KifuAnalysisControl\.startProfile\(option\.value\)/);
 assert.match(engine,/const d=profiles\.find\(p=>p\.id===startupId\(\)\)/);
});
