const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
test('release source and initial engine list are engine-free',()=>{
assert.deepEqual(require('../backend/bundled-engines.cjs').bundledEngines(),{profiles:[]});
assert.ok(!fs.existsSync(path.resolve(__dirname,'../engines/katago')));
});
