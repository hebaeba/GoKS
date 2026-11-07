const {chromium}=require('playwright'),fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert/strict');
const root=path.resolve(__dirname,'../web');const server=http.createServer((req,res)=>{const f=path.join(root,req.url.split('?')[0]==='/'?'index.html':req.url.split('?')[0]);if(!fs.existsSync(f)){res.writeHead(404);return res.end();}res.setHeader('Content-Type',f.endsWith('.js')?'text/javascript':f.endsWith('.css')?'text/css':f.endsWith('.wav')?'audio/wav':f.endsWith('.svg')?'image/svg+xml':'text/html; charset=utf-8');res.end(fs.readFileSync(f));});

(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;try{
 browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox','--disable-gpu','--disable-software-rasterizer','--use-gl=disabled','--single-process','--no-zygote']});
 const page=await browser.newPage({viewport:{width:1600,height:940}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:'+server.address().port);await page.waitForSelector('#simple-toggle');await page.evaluate(()=>document.fonts.ready);
 // Return native size before the delayed WebView resize event, like Windows.
 await page.exposeFunction('resizeMock',async({simple,width})=>{
  const target={width:simple?Math.round(width):1600,height:940};
  setTimeout(()=>page.setViewportSize(target).catch(()=>{}),300);
  return target;
 });
 await page.evaluate(()=>{window.__TAURI_INTERNALS__={invoke:(cmd,args)=>cmd==='desktop_simple_window'?resizeMock(args):Promise.resolve({})};window.badFrames=[];window.sample=true;
 const tick=()=>{if(!sample)return;const simple=document.body.classList.contains('simple-mode'),r=document.querySelector('.canvas-wrap').getBoundingClientRect();
  if(simple&&(r.x<0||r.x>12||r.right>innerWidth+1))badFrames.push({simple,width:innerWidth,x:r.x,right:r.right});
  // The normal layout is committed immediately even before native window expansion.
  requestAnimationFrame(tick);
 };requestAnimationFrame(tick);});
 for(let i=0;i<4;i++){
  await page.evaluate(()=>KifuSimple.setMode(true));await page.waitForTimeout(450);
  await page.evaluate(()=>{window.dispatchEvent(new Event('resize'));KifuSimple.setMode(false);});
  assert.equal(await page.evaluate(()=>document.body.classList.contains('simple-mode')),false,'normal layout must commit before delayed native width');
  await page.waitForTimeout(100);assert.equal(await page.evaluate(()=>document.body.classList.contains('simple-mode')),false);
  await page.waitForTimeout(450);assert.equal(await page.evaluate(()=>document.body.classList.contains('simple-mode')),false);
 }
 assert.deepEqual(await page.evaluate(()=>{sample=false;return badFrames}),[]);
 // Browser layout works synchronously too; Edit uses content width in both languages.
 await page.evaluate(()=>{delete window.__TAURI_INTERNALS__;});
 for(const width of [1280,1600,800])for(const lang of ['ja','en']){
  await page.setViewportSize({width,height:940});await page.evaluate(lang=>{KifuI18n.set(lang);KifuSimple.setMode(true);},lang);
  await page.locator('#simple-menu summary').nth(2).click();await page.waitForTimeout(100);
  const box=await page.locator('.simple-edit-menu').boundingBox();assert(box.width<490,JSON.stringify({width,lang,box}));
  assert.equal(await page.locator('.simple-edit-menu').evaluate(e=>e.scrollWidth<=e.clientWidth),true);
  if(width===800&&lang==='ja')await page.screenshot({path:'/tmp/gks103-edit.png'});
  await page.evaluate(()=>KifuSimple.setMode(false));
 }
 assert.deepEqual(errors,[]);console.log('PASS: immediate normal/simple layout with delayed native window resize; four round trips; compact ja/en Edit across 3 widths');
 }finally{await browser?.close();server.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
