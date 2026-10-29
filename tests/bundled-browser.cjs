const assert=require('node:assert/strict'),{chromium}=require('playwright'),http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../web');const server=http.createServer((req,res)=>{let p=path.join(root,decodeURIComponent(req.url.split('?')[0]));if(req.url==='/')p=path.join(root,'index.html');if(!p.startsWith(root)||!fs.existsSync(p)||!fs.statSync(p).isFile()){res.writeHead(404);res.end();return;}res.setHeader('Content-Type',p.endsWith('.js')?'application/javascript':p.endsWith('.css')?'text/css':'text/html; charset=utf-8');res.end(fs.readFileSync(p));});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;try{
 browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,headless:true,args:['--no-sandbox','--disable-gpu','--use-gl=disabled','--disable-software-rasterizer','--single-process','--no-zygote']});
 const page=await browser.newPage({viewport:{width:1600,height:940}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 const manifest=require('../engines/manifest.json');
 await page.addInitScript(manifest=>{
  const legacy={id:'bundled-eigen',name:'KataGo Eigen（CPU）',exe:'C:/old/engines/eigen/katago.exe',model:'C:/old/engines/eigen/model.bin.gz',config:'C:/old/engines/eigen/default_gtp.cfg'};
  const external={id:'custom',name:'User GPU',exe:'C:/user/katago.exe',model:'C:/user/network.gz',config:'C:/user/user.cfg'};
  localStorage.setItem('kifu-engine-profiles-v1',JSON.stringify([external,legacy]));localStorage.setItem('kifu-engine-paths-v1',JSON.stringify(legacy));window.starts=[];window.events=[];let running=false;
  window.__TAURI_INTERNALS__={invoke:async(cmd,args={})=>{if(cmd!=='engine_call')return{};const {action,payload}=args;
   if(action==='defaults'){const profiles=manifest.map(p=>({...p,exe:'C:/app/engines/katago/'+p.exe,model:'C:/app/engines/katago/'+p.model,config:'C:/app/engines/katago/'+p.config,workdir:'C:/app/engines/katago',missing:[]}));return {...profiles[0],profiles};}
   if(action==='start'){starts.push(payload);running=true;return{meta:{kind:'katago'}};}
   if(action==='stop'){running=false;return{};}
   if(action==='poll')return{running,events:events.splice(0),logs:[]};
   if(action==='send'){for(const line of payload.commands){const [,n,c]=/^(\d+) (.*)$/.exec(line);const text=c==='name'?'KataGo':c==='version'?'1.18.1':c==='protocol_version'?'2':c==='list_commands'?'kata-analyze kata-set-rules set_position clear_cache stop':'';events.push({type:'gtp',line:'='+n+' '+text},{type:'gtp',line:''});}return{};}
   return{};
  }};
 },manifest);
 await page.goto('http://127.0.0.1:'+server.address().port);await page.waitForFunction(()=>window.starts.length===1&&KifuAnalysisControl.profiles().length===4);
 const data=await page.evaluate(()=>({profiles:KifuAnalysisControl.profiles(),starts}));assert.deepEqual(data.profiles.map(p=>p.name),['User GPU','KataGo-Eigen','KataGo-EigenAVX2','KataGo-OpenCL']);assert.equal(await page.locator('#engine-active-name').textContent(),'KataGo-Eigen');assert.match(data.starts[0].model,/kata1-b10c128-/);assert.equal(data.starts[0].workdir,'C:/app/engines/katago');assert(!data.profiles.some(p=>p.exe.includes('/old/')));
 await page.locator('#tab-match').click();assert.equal(await page.locator('#match-white option').count(),6);assert.equal(await page.locator('#score').textContent(),'地合い計算');assert.deepEqual(errors,[]);console.log('bundle migration, three registrations, default startup and match options OK');
 }finally{if(browser)await browser.close();server.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
