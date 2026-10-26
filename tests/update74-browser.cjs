/* Optional integration check: npm install playwright; CHROMIUM_PATH may specify a browser. */
const assert=require('node:assert/strict'),{chromium}=require('playwright'),http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../web');
const server=http.createServer((req,res)=>{let p=path.join(root,decodeURIComponent(req.url.split('?')[0]));if(req.url==='/')p=path.join(root,'index.html');if(!p.startsWith(root)||!fs.existsSync(p)||!fs.statSync(p).isFile()){res.writeHead(404);res.end();return;}res.setHeader('Content-Type',p.endsWith('.js')?'application/javascript':p.endsWith('.css')?'text/css':'text/html; charset=utf-8');res.end(fs.readFileSync(p));});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;try{
 browser=await chromium.launch({...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),headless:true,args:['--no-sandbox','--disable-gpu','--use-gl=disabled','--disable-software-rasterizer','--single-process','--no-zygote']});
 const p=await browser.newPage({viewport:{width:1280,height:940}}),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto('http://127.0.0.1:'+server.address().port);await p.waitForTimeout(150);

 const bbox=s=>p.locator(s).boundingBox();
 await p.evaluate(()=>IndependentGo.loadSgf('(;SZ[19]KM[6.5]PB[Black]PW[White]GN[Title]EV[Event];B[aa];W[bb])','test.sgf'));
 for(const [width,height] of [[1280,740],[1600,940],[1920,1000],[2560,1000]]){
  await p.setViewportSize({width,height});await p.waitForTimeout(120);
  const board=await bbox('#board'),side=await bbox('#board-sidebar'),panel=await bbox('.inspector'),head=await bbox('.board-heading'),komi=await bbox('#komi'),notes=await bbox('#board-notes'),title=await bbox('.game-title');
  assert(board.x-side.x-side.width<20);assert(panel.x-board.x-board.width<20);
  assert(komi.x>title.x&&notes.x<title.x);assert(komi.y<board.y&&notes.y<board.y);
  assert((await bbox('#normal-slider')).y+18<height);
  console.log('Compact gaps / upper komi and notes',width,height,Math.round(board.width));
 }
 assert.deepEqual(await p.locator('#recent-count option').evaluateAll(es=>es.map(e=>e.value)),['1','2','3','5','10','20','30','50','custom']);
 await p.locator('#recent-count').selectOption('custom');assert(await p.locator('#recent-custom').isVisible());await p.locator('#recent-custom').fill('75');assert.equal(await p.inputValue('#recent-custom'),'75');
 await p.locator('#recent-count').selectOption('20');assert(!await p.locator('#recent-custom').isVisible());
 await p.evaluate(()=>KifuWorkspace.activate('match'));for(const side of ['black','white'])assert.equal(await p.inputValue('#match-'+side+'-visits-preset'),'0');
 await p.locator('#inspector-toggle').click();await p.reload();await p.waitForTimeout(120);assert(await p.evaluate(()=>document.body.classList.contains('inspector-collapsed')));await p.locator('#inspector-toggle').click();await p.reload();await p.waitForTimeout(120);assert(!await p.evaluate(()=>document.body.classList.contains('inspector-collapsed')));
 await p.locator('#simple-toggle').click();assert(await p.locator('#simple-info #komi').isVisible());await p.locator('#simple-return').click();assert(await p.locator('.board-heading #komi').isVisible());

 await p.evaluate(()=>{const moves=Array.from({length:60},(_,i)=>';'+(i%2?'W':'B')+'['+String.fromCharCode(97+(i%10)*2)+String.fromCharCode(97+Math.floor(i/10)*2)+']').join('');IndependentGo.loadSgf('(;SZ[19]'+moves+')','numbers.sgf');document.getElementById('recent').checked=true;document.getElementById('recent').onchange();});
 const labels=await p.evaluate(()=>{const proto=CanvasRenderingContext2D.prototype,original=proto.fillText;let out=[];proto.fillText=function(text,...args){if(this.canvas.id==='board'&&/^\d+$/.test(String(text)))out.push(Number(text));return original.call(this,text,...args);};const counts=[];for(const n of ['5','20','50','custom']){document.getElementById('recent-count').value=n;document.getElementById('recent-custom').value='60';out=[];document.getElementById('recent-count').onchange();counts.push(out.length);}proto.fillText=original;return counts;});
 assert.equal(labels[1]-labels[0],15);assert.equal(labels[2]-labels[1],30);assert.equal(labels[3]-labels[2],10);
 await p.evaluate(()=>document.getElementById('print').click());assert(await p.locator('#print-preview').isVisible());assert((await p.getAttribute('#print-preview-image','src')).startsWith('data:image/png'));await p.locator('#print-close').click();
 await p.setViewportSize({width:1745,height:940});await p.waitForTimeout(100);await p.screenshot({path:process.env.UI_SCREENSHOT||'/tmp/update74.png'});
 assert.deepEqual(errors,[]);console.log('update74 layout, recent ranges, unlimited default and preference restoration: OK');
 }finally{if(browser)await browser.close();server.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
