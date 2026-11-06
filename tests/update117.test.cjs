// GoKS Update117: regression checks for disabled repair actions.
'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');

test('engine is the default sidebar pane on launch',()=>{
 const js=read('web/workspace.js');
 assert.match(js,/window\.KifuWorkspace=\{activate\};activate\('settings'\)/);
});
test('auto-resume validates missing model and does not block setup buttons',()=>{
 const js=read('web/analysis.js');
 assert.match(js,/async function autoConnect\(\)/);
 assert.match(js,/rawCall\('check_paths',config\)/);
 assert.match(js,/if\(!files\.ready\)\{showSetupMessage/);
 assert.match(js,/missing:'エンジン設定の修復が必要です'/);
 assert.match(js,/engine-install'\)\.disabled=installing/);
 assert.match(js,/key==='folder'&&choosingFolder/);
 assert.doesNotMatch(js,/if\(pendingCalls\)return;pendingCalls\+\+;controls\(\);\n try\{\n  const found=await call\('pick'/);
});
test('path validation and file pick do not wait for engine process lock',()=>{
 const native=read('src-tauri/src/main.rs'),backend=read('backend-rs/src/lib.rs');
 assert.match(native,/if action=="check_paths"/);
 assert.match(native,/if action=="pick"/);
 assert.match(native,/Engine::pick\(&payload\)/);
 assert.match(backend,/pub fn pick\(payload/);
});
test('repair installer is atomic and backs up old installations',()=>{
 const ps=read('backend/install-recommended.ps1');
 assert.doesNotMatch(ps,/\$code='exists'/);
 assert.match(ps,/\[IO\.Directory\]::Move\(\$dest,\$backup\)/);
 assert.match(ps,/\[IO\.Directory\]::Move\(\$backup,\$dest\)/);
 assert.match(ps,/\$info\.backup=/);
});
test('reinstall retains existing registration by matching path not name',()=>{
 const js=read('web/analysis.js');
 assert.match(js,/installedProfileFor\(r\.exe\)/);
 assert.match(js,/\$\('engine-profile'\)\.value=existing\?\.id\|\|''/);
 assert.match(js,/if\(existing\)\{\$\('engine-name'\)\.value=existing\.name/);
});
