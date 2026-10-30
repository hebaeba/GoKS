const assert=require('node:assert/strict'),{chromium}=require('playwright'),http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../web');const server=http.createServer((req,res)=>{let p=path.join(root,decodeURIComponent(req.url.split('?')[0]));if(req.url==='/')p=path.join(root,'index.html');if(!p.startsWith(root)||!fs.existsSync(p)||!fs.statSync(p).isFile()){res.writeHead(404);res.end();return;}res.setHeader('Content-Type',p.endsWith('.js')?'application/javascript':p.endsWith('.css')?'text/css':'text/html; charset=utf-8');res.end(fs.readFileSync(p));});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;const errors=[];try{
 browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,headless:true,args:['--no-sandbox','--disable-gpu','--use-gl=disabled','--disable-software-rasterizer','--single-process','--no-zygote']});
 const context=await browser.newContext({viewport:{width:1280,height:740}}),children=new Map(),sessions=new Map();let main;
 const origin='http://127.0.0.1:'+server.address().port;
 await context.exposeBinding('nativeMock',async({page},cmd,args)=>{
  if(cmd!=='auxiliary'){if(cmd==='engine_call'){if(args.action==='defaults')return{};if(args.action==='poll')return{running:false,events:[],logs:[]};return{};}return{};}
  const {action,kind,payload}=args;
  if(action==='open'){
   if(children.has(kind))return{existing:true};const child=await context.newPage();children.set(kind,child);sessions.set(kind,payload.id);child.on('pageerror',e=>errors.push(e.message));await child.goto(origin+'/auxiliary.html?kind='+kind+'&id='+payload.id);return{opened:true};
  }
  if(action==='send'){const destination=page===main?children.get(kind):main;if(destination)await destination.evaluate(m=>window.dispatchEvent(new CustomEvent('kifu-aux',{detail:m})),{kind,...payload});return{};}
  if(action==='close'){const child=children.get(kind);children.delete(kind);await main.evaluate(m=>window.dispatchEvent(new CustomEvent('kifu-aux',{detail:m})),{kind,id:sessions.get(kind),type:'closed'});if(child)await child.close();return{};}
  return{};
 });
 await context.addInitScript(()=>{window.__TAURI_INTERNALS__={invoke:(cmd,args)=>window.nativeMock(cmd,args)};});
 main=await context.newPage();main.on('pageerror',e=>errors.push(e.message));await main.goto(origin);await main.waitForFunction(()=>window.IndependentGo&&window.KifuAuxiliary);
 await main.locator('#workspace-image-open').click();await main.waitForTimeout(200);let image=children.get('image');await image.waitForSelector('#image-board-dialog[open]');assert.equal(await main.locator('#image-board-dialog').evaluate(e=>e.open),false);
 assert.equal(await image.locator('#pane-analysis').count(),0);
 await image.setViewportSize({width:2400,height:1400});const dims=await image.locator('#image-board-dialog').boundingBox();assert(dims.width>2200);assert.equal((await main.viewportSize()).width,1280);
 // File selection, recognition and import over the native message boundary.
 const png=await main.evaluate(()=>{const c=document.createElement('canvas');c.width=c.height=240;const x=c.getContext('2d');x.fillStyle='#edc976';x.fillRect(0,0,240,240);x.strokeStyle='#333';for(let i=0;i<4;i++){const p=30+i*60;x.beginPath();x.moveTo(30,p);x.lineTo(210,p);x.moveTo(p,30);x.lineTo(p,210);x.stroke();}x.fillStyle='#111';x.beginPath();x.arc(90,90,22,0,7);x.fill();return c.toDataURL().split(',')[1];});
 await image.locator('#image-size').selectOption('4');await image.locator('#image-file').setInputFiles({name:'board.png',mimeType:'image/png',buffer:Buffer.from(png,'base64')});await image.waitForFunction(()=>document.querySelector('#image-status').textContent.includes('左上'));
 const box=await image.locator('#image-source').boundingBox();for(const [x,y]of [[30,30],[210,30],[210,210],[30,210]])await image.mouse.click(box.x+x*box.width/240,box.y+y*box.height/240);
 await image.locator('#image-recognize').click();await image.locator('#image-confirm').check();await image.locator('#image-import').click();await main.waitForFunction(()=>IndependentGo.peekAnalysisSnapshot().size===4);await main.waitForTimeout(100);assert(!children.has('image'));
 await main.locator('#workspace-image-open').click();await main.waitForTimeout(100);image=children.get('image');await image.waitForSelector('#image-board-dialog[open]');assert.equal(await image.locator('#image-file').inputValue(),'');assert.equal(await image.locator('#image-stone-count').textContent(),'黒石 — 個 ／ 白石 — 個');await image.locator('#image-close').click();
 await main.locator('#score').click();await main.waitForTimeout(200);const score=children.get('score');await score.waitForSelector('#result');assert.equal(await main.locator('#score-panel').count(),0);assert(await main.locator('body').evaluate(e=>e.classList.contains('scoring-mode')));
 const before=await score.locator('#result').textContent();const cb=await main.locator('#board').boundingBox();const gap=(cb.width-46)/4;await main.mouse.click(cb.x+23+gap*1.5,cb.y+23+gap*1.5);await score.waitForFunction(t=>document.getElementById('result').textContent!==t,before);await score.locator('#reset').click();await score.waitForFunction(t=>document.getElementById('result').textContent===t,before);
 await score.locator('#komi').fill('8.5');await main.waitForFunction(()=>document.getElementById('komi-input').value==='8.5');await score.locator('#rule').click();await score.waitForFunction(()=>document.getElementById('heading').textContent.includes('中国'));await score.locator('#seki-mode').check();await score.waitForFunction(()=>document.getElementById('operation-message').textContent.includes('セキ'));
 await score.setViewportSize({width:2200,height:1300});assert((await score.locator('body').boundingBox()).width>2000);
 await score.locator('#close').click();await main.waitForFunction(()=>!document.body.classList.contains('scoring-mode'));assert(!children.has('score'));
 await main.locator('#score').click();await main.waitForTimeout(150);await children.get('score').waitForSelector('#result');await main.evaluate(()=>window.__TAURI_INTERNALS__.invoke('auxiliary',{action:'close',kind:'score',payload:{}}));await main.waitForFunction(()=>!document.body.classList.contains('scoring-mode'));assert.equal(await main.locator('[data-score-lock]').count(),0);
 assert.deepEqual(errors,[]);console.log('update82: independent image/score pages, >1920 resizing, image recognition/import/reset, score controls/komi sync and close cleanup OK');
 }finally{if(browser)await browser.close();server.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
