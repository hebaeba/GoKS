// Update116: source-level regression checks that run without native Windows tooling.
'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');

test('engine tab is first and named エンジン',()=>{
 const js=read('web/workspace.js'),refine=read('web/refine.js');
 assert.match(js,/tabs\.prepend\(\$\('tab-settings'\)\)/);
 assert.match(refine,/\$\('tab-settings'\)\.textContent='エンジン'/);
});

test('setup controls precede individual downloads, list and running details',()=>{
 const js=read('web/refine.js');
 const markers=["setup.append($('engine-install'),$('engine-folder'))", "downloads.id='engine-downloads'", "downloads.lastElementChild.append($('engine-cpu'),$('engine-network'))", "separator.className='engine-divider'", "settings.replaceChildren(tools,separator,d,running)"];
 for(const marker of markers)assert.ok(js.includes(marker),marker);
 assert.ok(!js.slice(js.indexOf("downloads.id='engine-downloads'")).includes('d.open=true'), 'engine list must start collapsed');
 assert.ok(!js.includes('running.open=true'), 'running list must start collapsed');
});

test('not registered is neutral, analysis actions disabled, last-used engine retained for manual selection',()=>{
 const js=read('web/analysis.js');
 assert.match(js,/unconfigured:'エンジン未設定'/);
 assert.match(js,/idle:'エンジン停止中'/);
 assert.match(js,/lastEngineKey='gokifu-last-engine-v116'/);
 assert.match(js,/profiles\.find\(p=>p\.id===lastEngineId\(\)/);
 assert.match(js,/\$\('analyze-live'\)\.disabled=!analysisAllowed\(\)/);
 assert.match(js,/\$\('analyze-all'\)\.disabled=!analysisAllowed\(\)/);
 const css=read('web/analysis.css');
 assert.match(css,/#engine-notice\[data-state="unconfigured"\]/);
 assert.match(css,/#analyze-live:disabled/);
});

test('progress is streamed by stage, then engine registered automatically',()=>{
 const ps=read('backend/install-recommended.ps1');
 for(const text of ['KataGoをダウンロード中','KataGoを展開中','モデルをダウンロード中','エンジンを登録中'])assert.ok(ps.includes(text));
 const rs=read('src-tauri/src/main.rs');
 assert.ok(rs.includes('action=="install_status"'));
 assert.ok(rs.includes('BufReader::new(output).lines()'));
 const js=read('web/analysis.js');
 assert.ok(js.includes('installProgress(status.stage'));
 assert.ok(js.includes("if(!saveProfile())"));
 assert.ok(js.includes('KataGoのセットアップが完了しました。解析を開始できます。'));
});

test('CPU, model, and engine tooltip explanations are provided',()=>{
 const js=read('web/analysis.js');
 for(const text of ['CPU版は','モデルはKataGoが学習した知識','エンジンは囲碁の局面を解析'])assert.ok(js.includes(text));
});
