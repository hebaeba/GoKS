const {test}=require('node:test'),assert=require('node:assert/strict'),S=require('../web/sgf.js'),{hasContent}=require('../web/record-state.js');
test('default empty boards do not need replacement confirmation',()=>{for(const n of [4,9,19])assert.equal(hasContent(S.create(n)),false)});
test('metadata, stones, marks and pass sequences remain protected',()=>{for(const sgf of ['(;SZ[19]KM[6.5])','(;SZ[19]PB[名前])','(;SZ[19]C[説明])','(;SZ[19]AB[dd])','(;SZ[19]TR[dd])','(;SZ[19];B[])'])assert.equal(hasContent(S.parse(sgf).root),true,sgf)});
