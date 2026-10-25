/* Optional integration check: npm install playwright; CHROMIUM_PATH may specify a browser. */
const assert=require('node:assert/strict'),{chromium}=require('playwright'),http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../web');
const server=http.createServer((req,res)=>{let p=path.join(root,decodeURIComponent(req.url.split('?')[0]));if(req.url==='/')p=path.join(root,'index.html');if(!p.startsWith(root)||!fs.existsSync(p)||!fs.statSync(p).isFile()){res.writeHead(404);res.end();return;}res.setHeader('Content-Type',p.endsWith('.js')?'application/javascript':p.endsWith('.css')?'text/css':'text/html; charset=utf-8');res.end(fs.readFileSync(p));});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;try{
 browser=await chromium.launch({...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),headless:true,args:['--no-sandbox','--disable-gpu','--use-gl=disabled','--disable-software-rasterizer','--single-process','--no-zygote']});
 const p=await browser.newPage({viewport:{width:1280,height:940}}),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto('http://127.0.0.1:'+server.address().port);await p.waitForTimeout(150);

 const bbox=s=>p.locator(s).boundingBox();
 await p.evaluate(()=>IndependentGo.loadSgf('(;SZ[19];B[aa])','test.sgf'));
 for(const [width,height]of [[1280,940],[1280,740],[1600,940],[390,844],[320,740]]){
  await p.setViewportSize({width,height});await p.waitForTimeout(100);if(width<1101&&await p.locator('#normal-panel-close').isVisible())await p.locator('#normal-panel-close').click();
  await p.locator('#workspace-save').click();const buttons=p.locator('#workspace-save-popup button');
  const rects=await buttons.evaluateAll(es=>es.map(e=>{const r=e.getBoundingClientRect();return {top:r.top,bottom:r.bottom,scroll:e.scrollHeight,client:e.clientHeight}}));
  for(let i=0;i<rects.length;i++){assert(rects[i].scroll<=rects[i].client+1);if(i)assert(rects[i].top>=rects[i-1].bottom-1)}
  const menu=await bbox('#workspace-save-popup');assert(menu.x>=0&&menu.x+menu.width<=width);await p.locator('#quick-more').click();assert(await p.locator('#save-main').isVisible());
  await p.evaluate(()=>{KifuWorkspace.activate('match');for(const side of ['black','white']){const e=document.getElementById('match-'+side);e.add(new Option('KataGo very long registered engine name CUDA TensorRT '+side,'long'));e.value='long';e.onchange();document.getElementById('match-'+side+'-preset').value=side==='black'?'custom':'1';document.getElementById('match-'+side+'-preset').onchange();document.getElementById('match-'+side+'-seconds').value=3;document.getElementById('match-'+side+'-visits-preset').value=side==='black'?'1000':'3000';document.getElementById('match-'+side+'-visits-preset').onchange();}});await p.waitForTimeout(120);
  let b=await bbox('#match-black-visits-row'),w=await bbox('#match-white-visits-row');assert(Math.abs(b.x+b.width-w.x-w.width)<1);
  for(const side of ['black','white']){const grid=await bbox('.match-player[data-side='+side+']');for(const sel of ['#match-'+side,'.match-player[data-side='+side+'] .match-time-label','#match-'+side+'-visits-row','.match-player[data-side='+side+'] .match-name-label']){const r=await bbox(sel);assert(r.x>=grid.x-1&&r.x+r.width<=grid.x+grid.width+1,JSON.stringify({width,sel,grid,r}));}}
  await p.evaluate(()=>{for(const side of ['black','white']){document.getElementById('match-'+side+'-visits-preset').value='custom';document.getElementById('match-'+side+'-visits-preset').onchange();}});await p.waitForTimeout(80);
  b=await bbox('#match-black-visits-row');w=await bbox('#match-white-visits-row');assert(Math.abs(b.x+b.width-w.x-w.width)<1);
  await p.evaluate(()=>{KifuWorkspace.activate('settings');document.querySelector('.engine-running-details').open=true;document.getElementById('engine-running-files').textContent='実行ファイル：C:\\GoKifuStudio-pre4\\engines\\'+('a_long_folder-name_'.repeat(15))+'\\katago.exe\nモデル：C:\\model.bin.gz';});await p.waitForTimeout(80);
  assert.equal(await p.locator('#engine-settings').evaluate(e=>e.tagName),'SECTION');assert.equal(await p.locator('#engine-settings>summary').count(),0);
  assert(await p.evaluate(()=>document.querySelector('.engine-running-details').parentElement===document.getElementById('engine-list-disclosure').parentElement));
  const pre=await p.locator('#engine-running-files').evaluate(e=>({scroll:e.scrollWidth,client:e.clientWidth,style:getComputedStyle(e).wordBreak,rect:e.getBoundingClientRect().width,parent:e.parentElement.getBoundingClientRect().width}));assert(pre.scroll<=pre.client+1);assert.equal(pre.style,'break-all');assert(Math.abs(pre.rect-pre.parent)<1);
  assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));console.log('Menus/limits/paths fit',width,height);
  if(width<1101)await p.locator('#normal-panel-close').click();
 }
 await p.setViewportSize({width:1280,height:940});await p.evaluate(()=>KifuWorkspace.activate('settings'));await p.locator('#engine-list-disclosure>summary').click();await p.waitForTimeout(60);assert(await p.locator('#engine-exe').isVisible());await p.locator('#engine-exe').fill('C:/example/katago.exe');await p.locator('#engine-model').fill('C:/example/model.bin.gz');await p.locator('#engine-name').fill('Test CPU');await p.locator('#engine-profile-save').click();await p.locator('#engine-list-disclosure>summary').click();await p.waitForTimeout(60);assert(!await p.locator('#engine-exe').isVisible());assert.equal(await p.evaluate(()=>KifuAnalysisControl.config().exe),'C:/example/katago.exe');await p.locator('#engine-list-disclosure>summary').click();await p.waitForTimeout(60);assert.equal(await p.inputValue('#engine-exe'),'C:/example/katago.exe');
 assert.deepEqual(errors,[]);console.log('update73: save menu, asymmetric/custom match limits, running file wrapping, sibling engine list and registration: OK');
 }finally{if(browser)await browser.close();server.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
