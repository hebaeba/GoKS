const test=require('node:test');
test('independent-window sources belong to the same release',()=>require('../scripts/check-window-assets.cjs')());
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),assert=require('node:assert/strict');
test('Windows CRLF checkout and UTF-8 BOM do not cause a false mismatch',()=>{
 const root=path.resolve(__dirname,'..'),tmp=fs.mkdtempSync(path.join(os.tmpdir(),'kifu-assets-'));
 try{
  const manifest=JSON.parse(fs.readFileSync(path.join(root,'web/window-assets.json'),'utf8').replace(/^\uFEFF/,''));
  for(const name of ['web/window-assets.json',...Object.keys(manifest.files)]){
   const out=path.join(tmp,name);fs.mkdirSync(path.dirname(out),{recursive:true});
   fs.writeFileSync(out,'\uFEFF'+fs.readFileSync(path.join(root,name),'utf8').replace(/^\uFEFF/,'').replace(/\r\n?/g,'\n').replace(/\n/g,'\r\n'));
  }
  const check=require('../scripts/check-window-assets.cjs');assert.doesNotThrow(()=>check(tmp));
  fs.appendFileSync(path.join(tmp,'web/index.html'),'<!-- real change -->');
  assert.throws(()=>check(tmp),/web\/index.html/);
 }finally{fs.rmSync(tmp,{recursive:true,force:true});}
});
