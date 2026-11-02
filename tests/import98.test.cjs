const test=require('node:test'),assert=require('node:assert/strict'),I=require('../web/import'),S=require('../web/sgf');
const komi=t=>I.parse(t).root.props.KM[0];
test('Fox legacy values normalize once, preserving original provenance and rules',()=>{
 for(const [raw,expected] of [[650,'6.5'],[550,'5.5'],[375,'7.5']]){const g=I.parse(`(;SZ[19]AP[GNU Go]AP[foxwq]KM[${raw}]RU[Chinese])`);assert.equal(g.root.props.KM[0],expected);assert.equal(g.root.props.XIGORIGINALKM[0],String(raw));assert.equal(g.root.props.RU[0],'Chinese');assert.equal(komi(S.write(g.root)),expected);g.root.props.KM=['0'];assert.equal(komi(S.write(g.root)),'0');}
 assert.equal(komi('(;AP[foxwq]HA[2]KM[0])'),'0.5');
});
test('standard, unknown, custom and already-normalized komi are not guessed or doubled',()=>{
 for(const value of ['0','0.5','6.5','7.5','3.75','-6.5','650'])assert.equal(komi(`(;AP[Other]KM[${value}]RU[Chinese])`),value);
 for(const value of ['0','0.5','6.5','7.5','3.75','-6.5','123'])assert.equal(komi(`(;AP[foxwq]KM[${value}])`),value);
 assert.equal(komi('(;AP[foxwq]HA[2]KM[0]XIGKOMINORMALIZED[foxwq])'),'0');
});
test('Tygem GIB tenths are converted including signed komi',()=>{
 for(const [value,want] of [[65,'6.5'],[0,'0'],[-5,'-0.5']]){
 const t='\\HS\n\\[GAMEINFOMAIN=GONGJE:'+value+',GRLT:3,\\]\nINI 0 0 0\nSTO 0 1 1 3 3';assert.equal(komi(t),want);
 }
});
test('UGF/UGI decimal komi remains in points',()=>{assert.equal(komi('[Header]\nSize=19\nHdcp=0,6.5\n[Data]\nDD,B,1'),'6.5');});

test('WBaduk NGF restores omitted half-point only for non-handicap integer komi',()=>{for(const [h,k,want] of [[0,6,'6.5'],[0,6.5,'6.5'],[2,0,'0']]){const lines=['game','19','White 1d','Black 1d','',String(h),'',String(k),'20261102','','White win','','PM01BAA'];assert.equal(komi(lines.join('\n')),want);}});
