// Regression for update119 startup crash and update120 radio-based startup.
'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
test('initial restore cannot access estimateJob before initialization',()=>{
 const js=read('web/analysis.js');
 assert.ok(js.indexOf('let estimateJob=null,estimateSerial=0;')<js.indexOf('const remembered=profiles.find('),'estimateJob must be initialized before restoring a profile');
 assert.ok(js.indexOf('let estimateJob=null,estimateSerial=0;')<js.indexOf("$('engine-profile').onchange();"),'restoration must not enter the temporal dead zone');
});
test('only radio-selected startup engine is automatically launched',()=>{
 const js=read('web/analysis.js'),auto=js.split('async function autoConnect(){')[1].split('let selectionSequence=0')[0];
 assert.match(auto,/profiles\.find\(p=>p\.id===startupId\(\)\)/);
 assert.doesNotMatch(auto,/lastEngineId\(\)/);
 assert.match(js,/radio\.checked=startupId\(\)===p\.id/);
 assert.match(js,/localStorage\.setItem\(startupKey,p\.id\)/);
});
test('top picker and engine-list row start selected profile directly',()=>{
 const js=read('web/analysis.js'),studio=read('web/studio.js');
 assert.match(js,/choose\.onclick=\(\)=>\{void startProfile\(p\.id\);\}/);
 assert.match(studio,/KifuAnalysisControl\.startProfile\(option\.value\)/);
});
test('setup, folder and download buttons give visible feedback and use direct native commands',()=>{
 const js=read('web/analysis.js');
 assert.match(js,/function actionFeedback\(message\)/);
 assert.match(js,/id='engine-action-feedback'/);
 assert.match(js,/const found=await rawCall\('pick',\{kind:'folder'\}\)/);
 assert.match(js,/await rawCall\('pick',\{kind\}\)/);
 assert.match(js,/const r=await rawCall\('install_recommended'\)/);
 assert.doesNotMatch(js,/document\.addEventListener\('click',\(\)=>profileMessage\(''\),true\)/);
});
