const test=require('node:test'),assert=require('node:assert/strict'),C=require('../web/appearance-core.js');
const sample=()=>C.clean({...C.defaults(),ja:{size:'large',font:'Yu Gothic'},en:{size:'small',font:'Arial'},theme:'night',...C.themes.night,texture:'image',boardImage:'data:image/png;base64,AAAA',boardImageName:'board.png',stone:'image',blackImage:'data:image/png;base64,AAAA',blackImageName:'black.png',blackPreset:'custom',whiteImage:'data:image/png;base64,AAAA',whiteImageName:'white.png',whitePreset:'custom',boardText:1.2,lineWidth:4,lineStyle:'dash',sound:'custom',soundData:'data:audio/wav;base64,AAAA',soundName:'stone.wav',volume:80,moves:false,navigation:true,autoplay:true});
const groups={
 text:['ja','boardText'],
 board:['theme','board','background','panel','text','texture','boardImage','boardImageName','stone','blackPreset','whitePreset','blackImage','whiteImage','blackImageName','whiteImageName'],
 graph:['graph','graphText','win','score','lineWidth','lineStyle'],
 audio:['sound','volume','moves','navigation','autoplay','soundData','soundName']
};
for(const [tab,keys]of Object.entries(groups))test('reset '+tab+' preserves every other preference and imported media',()=>{
 const before=sample(),copy=structuredClone(before),after=C.resetSection(before,tab,'ja'),d=C.defaults();
 for(const key of new Set([...Object.keys(before),...Object.keys(after)]))assert.deepEqual(after[key],keys.includes(key)?d[key]:before[key],key);
 assert.deepEqual(before,copy);
});
test('English text reset preserves Japanese and all non-text tabs',()=>{const before=sample(),after=C.resetSection(before,'text','en');assert.deepEqual(after.en,C.defaults().en);assert.deepEqual(after.ja,before.ja);assert.equal(after.boardText,1);assert.equal(after.soundData,before.soundData);});
