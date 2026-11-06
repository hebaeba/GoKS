const assert=require('node:assert/strict'),{chromium}=require('playwright'),http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../web');const server=http.createServer((req,res)=>{let p=path.join(root,decodeURIComponent(req.url.split('?')[0]));if(req.url==='/')p=path.join(root,'index.html');if(!p.startsWith(root)||!fs.existsSync(p)||!fs.statSync(p).isFile()){res.writeHead(404);res.end();return;}res.setHeader('Content-Type',p.endsWith('.js')?'application/javascript':p.endsWith('.css')?'text/css':'text/html; charset=utf-8');res.end(fs.readFileSync(p));});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;try{
 browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,headless:true,args:['--no-sandbox','--disable-gpu','--use-gl=disabled','--disable-software-rasterizer','--single-process','--no-zygote']});
 const page=await browser.newPage({viewport:{width:1600,height:940}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 page.setDefaultTimeout(10000);await page.addInitScript(()=>{
  window.starts=[];window.__TAURI_INTERNALS__={invoke:async(cmd,{action,payload}={})=>{
   if(cmd!=='engine_call')return{};
   if(action==='start')starts.push(payload);
   if(action==='pick'&&payload.kind==='folder')return {folder:'C:/engines/katago',exe:['C:/engines/katago/katago.exe'],model:['C:/engines/katago/models/a.bin.gz','C:/engines/katago/models/b.txt.gz'],config:[]};
   return {};
  }};
 });
 await page.goto('http://127.0.0.1:'+server.address().port);await page.waitForFunction(()=>window.KifuAnalysisControl);
 assert.deepEqual(await page.evaluate(()=>KifuAnalysisControl.profiles()),[]);assert.equal(await page.locator('#engine-notice').isVisible(),false);
 await page.locator('#tab-match').click();assert.equal(await page.locator('#match-white').inputValue(),'human');
 await page.locator('#match-white').selectOption('current');await page.locator('#match-start').click();
 await page.locator('#app-confirm-dialog button').first().click();assert.deepEqual(await page.evaluate(()=>starts),[]);
 await page.locator('#tab-analysis').click();await page.locator('#analyze-live').click();await page.locator('#app-confirm-dialog button').last().click();
 await page.locator('#engine-folder').click();await page.locator('#engine-found-model').selectOption({index:2});
 await page.locator('#engine-profile-save').click();
 const [p]=await page.evaluate(()=>KifuAnalysisControl.profiles());assert.equal(p.exe,'C:/engines/katago/katago.exe');assert.match(p.model,/b.txt.gz$/);assert.equal(p.config,'');assert.deepEqual(await page.evaluate(()=>starts),[]);
 for(const [width,height] of [[1280,940],[1280,740],[1600,940]]){await page.setViewportSize({width,height});assert.ok(await page.locator('#engine-folder').isVisible());}
 assert.deepEqual(errors,[]);console.log('Engine-free startup, AI setup and external folder registration OK');
 }finally{if(browser)await browser.close();server.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
