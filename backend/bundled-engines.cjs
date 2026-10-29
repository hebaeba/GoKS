const path=require('node:path'),fs=require('node:fs'),manifest=require('../engines/manifest.json');
function bundledEngines(root=path.resolve(__dirname,'../engines/katago')){
 const profiles=manifest.map(p=>({...p,kind:'katago',exe:path.join(root,p.exe),model:path.join(root,p.model),config:path.join(root,p.config),workdir:root,missing:[p.exe,p.model,p.config].filter(f=>!fs.existsSync(path.join(root,f)))}));
 return {...profiles[0],profiles};
}
module.exports={bundledEngines};
