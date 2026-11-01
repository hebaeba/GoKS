// Fail before packaging if the independent-window entry points come from different releases.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');
function check(){
 const manifest=JSON.parse(fs.readFileSync(path.join(root,'web/window-assets.json'),'utf8'));
 for(const [name,hash]of Object.entries(manifest.files)){
  const file=path.join(root,name);
  if(!fs.existsSync(file)||crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')!==hash)
   throw Error('Independent-window files are mixed or missing: '+name+'. Upload web, src-tauri, scripts and tests from the same update93 ZIP.');
 }
 console.log('Independent-window assets: update'+manifest.update+' OK');
}
module.exports=check;if(require.main===module)check();
