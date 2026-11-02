// Fail before packaging if the independent-window entry points come from different releases.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');
function check(base=root){
 const manifest=JSON.parse(fs.readFileSync(path.join(base,'web/window-assets.json'),'utf8').replace(/^\uFEFF/,''));
 const mismatches=[];
 for(const [name,hash]of Object.entries(manifest.files)){
  const file=path.join(base,name);
  if(!fs.existsSync(file)||crypto.createHash('sha256').update(fs.readFileSync(file,'utf8').replace(/^\uFEFF/,'').replace(/\r\n?/g,'\n')).digest('hex')!==hash)
   mismatches.push(name);
 }
 if(mismatches.length)throw Error('Release files are mixed or missing:\n'+mismatches.join('\n')+'\nUpload the complete web, src-tauri, scripts and tests folders from update'+manifest.update+'.');
 console.log('Independent-window assets: update'+manifest.update+' OK');
}
module.exports=check;if(require.main===module)check();
