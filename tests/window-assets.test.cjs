const test=require('node:test');
test('independent-window sources belong to the same release',()=>require('../scripts/check-window-assets.cjs')());
