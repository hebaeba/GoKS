'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const base = path.join(__dirname, '..');
const read = p => fs.readFileSync(path.join(base,p),'utf8');

test('top engine name picker lists all registered profiles regardless of old connect button state', () => {
  const src = read('web/studio.js');
  assert.match(src, /\.filter\(o=>o\.value\)/);
  assert.match(src, /KifuAnalysisControl\.startProfile\(option\.value\)/);
  assert.doesNotMatch(src, /b\.disabled=\$\('engine-connect'\)\.disabled/);
  assert.doesNotMatch(src, /\$\('engine-connect'\)\.click\(\)/);
});

test('quick profile selection validates chosen paths and starts it without a hidden button click', () => {
  const src = read('web/analysis.js');
  assert.match(src, /async function startProfile\(id\)/);
  assert.match(src, /const entry=profiles\.find\(p=>p\.id===id\)/);
  assert.match(src, /\$\('engine-profile'\)\.value=entry\.id/);
  assert.match(src, /if\(!checked\?\.ready\)/);
  assert.match(src, /if\(running\|\|handshake\)await disconnect\(\);\s*await connect\(\)/);
  assert.match(src, /KifuAnalysisControl=\{offerSetup,setFieldsCollapsed,startProfile/);
});

test('old engine cannot override a user chosen replacement during asynchronous startup check', () => {
 const src=read('web/analysis.js');
 assert.match(src,/const startupSelection=selectionSequence/);
 assert.match(src,/if\(startupSelection!==selectionSequence\)return/);
});

test('duplicate start/stop buttons are hidden and optional null DOM inputs are dropped',()=>{
 const src=read('web/refine.js'),css=read('web/sidebar.css');
 assert.match(src,/legacyActions\.hidden=true/);
 assert.match(css, /#engine-list-disclosure \.engine-actions\[hidden\]\{display:none!important\}/);
 assert.match(src,/\.after\(\.\.\.\[note,kind,kindNote,hint\]\.filter\(Boolean\)\)/);
});
