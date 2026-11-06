const assert=require('node:assert/strict'),{chromium}=require('playwright'),http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../web');const server=http.createServer((req,res)=>{let p=path.join(root,decodeURIComponent(req.url.split('?')[0]));if(req.url==='/')p=path.join(root,'index.html');if(!p.startsWith(root)||!fs.existsSync(p)||!fs.statSync(p).isFile()){res.writeHead(404);res.end();return;}res.setHeader('Content-Type',p.endsWith('.js')?'application/javascript':p.endsWith('.css')?'text/css':'text/html; charset=utf-8');res.end(fs.readFileSync(p));});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;try{
 browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,headless:true,args:['--no-sandbox','--disable-gpu','--use-gl=disabled','--disable-software-rasterizer','--single-process','--no-zygote']});
 const page=await browser.newPage({viewport:{width:1600,height:940}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 const manifest=[];
 await page.addInitScript(manifest=>{
  const legacy={id:'bundled-eigen',name:'KataGo Eigen（CPU）',userEdited:true,exe:'D:/GoKifuStudio-pre8/engines/katago/katago-eigen.exe',workdir:'D:/GoKifuStudio-pre8/engines/katago',model:'D:/GoKifuStudio-pre8/engines/katago/models/test.gz',config:'D:/GoKifuStudio-pre8/engines/katago/configs/test.cfg'};
  const external={id:'custom',name:'User GPU',exe:'C:/user/katago.exe',model:'C:/user/network.gz',config:'C:/user/user.cfg'};
  localStorage.setItem('kifu-engine-profiles-v1',JSON.stringify([external,legacy,...['eigenavx2','opencl'].map(kind=>({id:'bundled-'+kind,name:'Retired '+kind,exe:'C:/app/engines/katago/katago-'+kind+'.exe',model:'C:/app/engines/katago/models/old.gz',config:'C:/app/engines/katago/configs/old.cfg'}))]));localStorage.setItem('kifu-engine-paths-v1',JSON.stringify(legacy));localStorage.setItem('gokifu-startup-engine-v1','custom');window.starts=[];window.events=[];let running=false;
  window.__TAURI_INTERNALS__={invoke:async(cmd,args={})=>{if(cmd!=='engine_call')return{};const {action,payload}=args;
   if(action==='defaults'){const profiles=manifest.map(p=>({...p,exe:'C:/app/engines/katago/'+p.exe,model:'C:/app/engines/katago/'+p.model,config:'C:/app/engines/katago/'+p.config,workdir:'C:/app/engines/katago',missing:[]}));return {...profiles[0],profiles};}
   if(action==='start'){starts.push(payload);running=true;return{meta:{kind:'katago'}};}
   if(action==='stop'){running=false;return{};}
   if(action==='poll')return{running,events:events.splice(0),logs:[]};
   if(action==='send'){for(const line of payload.commands){const [,n,c]=/^(\d+) (.*)$/.exec(line);const text=c==='name'?'KataGo':c==='version'?'1.18.1':c==='protocol_version'?'2':c==='list_commands'?'kata-analyze kata-set-rules set_position clear_cache stop':'';events.push({type:'gtp',line:'='+n+' '+text},{type:'gtp',line:''});}return{};}
   return{};
  }};
 },manifest);
 await page.goto('http://127.0.0.1:'+server.address().port);await page.waitForFunction(()=>window.starts.length===1&&KifuAnalysisControl.profiles().length===2);
 const data=await page.evaluate(()=>({profiles:KifuAnalysisControl.profiles(),starts}));assert.deepEqual(data.profiles.map(p=>p.name),['User GPU','KataGo Eigen（CPU）']);assert.equal(data.starts[0].exe,'C:/user/katago.exe');assert.equal(data.profiles[1].exe,'D:/GoKifuStudio-pre8/engines/katago/katago-eigen.exe');assert.deepEqual(errors,[]);
 for(const width of [1280,1600,800,1280]){await page.setViewportSize({width,height:940});await page.evaluate(()=>KifuSimple.setMode(true));await page.waitForTimeout(150);const rect=await page.locator('.canvas-wrap').evaluate(e=>{const r=e.getBoundingClientRect();return {x:r.x,right:r.right,width:r.width};});assert.ok(rect.x>=0&&rect.right<=width+1,JSON.stringify(rect));await page.evaluate(()=>KifuSimple.setMode(false));await page.waitForTimeout(150);}
 console.log('PASS: stale user-edited bundled path migration and narrow/wide simple-mode transitions');
 }finally{if(browser)await browser.close();server.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
