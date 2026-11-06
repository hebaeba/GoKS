const fs=require('node:fs'),path=require('node:path');
const target=path.resolve(process.argv[2]||'dist');
for(const name of ['README.md','README-en.md','Manual.html','LICENSE.txt','licenses.html','licenses-en.html','THIRD_PARTY_NOTICES.md','licenses/Sabaki-MIT.txt','licenses/KataGo-config-LICENSE.txt'])if(!fs.existsSync(path.join(target,name)))throw Error('Missing release document: '+name);
for(const name of fs.readdirSync(target)){if(name.toLowerCase()==='engines'||/\.dll$|^katago.*\.exe$|\.(bin|txt)\.gz$/i.test(name))throw Error('Unexpected engine payload: '+name);}
 // Distribution is an executable, not a website; remove board-return links from copied notices.
for(const name of ['licenses.html','licenses-en.html']){const file=path.join(target,name);let s=fs.readFileSync(file,'utf8');s=s.replace(/<nav>[\s\S]*?<\/nav>/g,'').replace(/<script>[\s\S]*?<\/script>/g,'');fs.writeFileSync(file,s);}
console.log('Release documents OK');
