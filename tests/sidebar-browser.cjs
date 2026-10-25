/* Optional integration check: npm install playwright; CHROMIUM_PATH may specify a browser. */
const assert=require('node:assert/strict'),{chromium}=require('playwright'),http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../web');
const server=http.createServer((req,res)=>{let p=path.join(root,decodeURIComponent(req.url.split('?')[0]));if(req.url==='/')p=path.join(root,'index.html');if(!p.startsWith(root)||!fs.existsSync(p)||!fs.statSync(p).isFile()){res.writeHead(404);res.end();return;}res.setHeader('Content-Type',p.endsWith('.js')?'application/javascript':p.endsWith('.css')?'text/css':'text/html; charset=utf-8');res.end(fs.readFileSync(p));});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;try{
 browser=await chromium.launch({...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),headless:true,args:['--no-sandbox','--disable-gpu','--use-gl=disabled','--disable-software-rasterizer','--single-process','--no-zygote']});
 const p=await browser.newPage({viewport:{width:1280,height:940}}),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto('http://127.0.0.1:'+server.address().port);await p.waitForTimeout(150);
 const bbox=s=>p.locator(s).boundingBox();
 for(const [width,height]of [[1280,940],[1280,740],[1600,940],[390,844]]){
  await p.setViewportSize({width,height});await p.waitForTimeout(100);
  assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  const board=await bbox('#board'),info=await bbox('#normal-info'),slider=await bbox('#normal-slider');
  assert(board.x>=0&&board.x+board.width<=width);assert(info.y>=board.y+board.height-1);assert(slider.y>=info.y+info.height-1);
  if(width>=900){assert(slider.y+slider.height<=height-18);assert((await bbox('#board-sidebar')).x<board.x);}
  assert.equal(await p.locator('#jump').evaluate(e=>getComputedStyle(e).padding),'3px');
  assert.equal(await p.locator('#delete-move').evaluate(e=>e.getBoundingClientRect().height),26);
  console.log('Normal layout fits',width,height,'board',Math.round(board.width));
 }
 await p.setViewportSize({width:1280,height:940});await p.waitForTimeout(100);
 assert.equal(await p.textContent('#tab-settings'),'エンジン');
 await p.evaluate(()=>document.body.classList.remove('inspector-collapsed'));await p.waitForTimeout(100);
 const tabs=await p.locator('.workspace-tabs button:not([hidden])').evaluateAll(es=>es.map(e=>{const r=e.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height,font:getComputedStyle(e).fontSize}}));
 assert.equal(tabs.length,6);assert.equal(new Set(tabs.map(t=>t.y)).size,1);assert(new Set(tabs.map(t=>t.w)).size>2);assert(tabs.every(t=>t.h===30&&t.font==='16px'));
 const gaps=tabs.slice(1).map((t,i)=>t.x-tabs[i].x-tabs[i].w);assert(Math.max(...gaps)-Math.min(...gaps)<1);
 const small=(await bbox('#board')).width;await p.locator('#inspector-toggle').click();await p.waitForTimeout(100);assert((await bbox('#board')).width>small);await p.locator('#inspector-toggle').click();
 assert(!await p.locator('#board-notes').isVisible());
 assert(await p.evaluate(()=>IndependentGo.loadSgf('(;SZ[19]PB[Black]PW[White]EV[Event]PC[Tokyo]BR[3d];B[aa];W[bb]C[Second move])','notes.sgf')));await p.waitForTimeout(80);
 assert.equal(await p.textContent('#board-notes'),'コメント・対局情報');await p.locator('#board-notes').click();assert((await p.textContent('#board-notes-dialog')).includes('Tokyo'));assert((await p.textContent('#board-notes-dialog')).includes('Second move'));await p.locator('#board-notes-dialog button').click();
 await p.locator('#back').click();assert.equal(await p.textContent('#board-notes'),'対局情報');await p.locator('#board-notes').click();assert((await p.textContent('#board-notes-dialog')).includes('3d'));assert(!(await p.textContent('#board-notes-dialog')).includes('Second move'));await p.locator('#board-notes-dialog button').click();
 await p.evaluate(()=>document.getElementById('edit').click());await p.locator('#delete-move').click();assert.equal(await p.inputValue('#slider'),'0');await p.locator('#undo').click();assert.equal(await p.inputValue('#slider'),'1');
 const sgf=await p.evaluate(()=>IndependentGo.getSgf());await p.locator('#rotate-right').click();assert.equal(await p.evaluate(()=>IndependentGo.getRotation()),1);await p.locator('#rotate-reset').click();
 for(let i=0;i<3;i++){await p.locator('#simple-toggle').click();await p.locator('#simple-menu>details').nth(2).locator(':scope > summary').click();assert(await p.locator('#undo').isVisible());assert(await p.locator('#rotate-right').isVisible());assert.equal(await p.locator('#delete-move').evaluate(e=>getComputedStyle(e).padding),'3px');await p.keyboard.press('Escape');await p.locator('#simple-return').click();assert.equal(await p.evaluate(()=>IndependentGo.getSgf()),sgf);assert(await p.locator('#board-sidebar #undo').isVisible());assert(await p.locator('#normal-slider #slider').isVisible());assert.equal(await p.locator('#board').count(),1);}
 await p.evaluate(()=>KifuWorkspace.activate('storage'));assert(await p.locator('#save-main').isVisible());await p.evaluate(()=>KifuWorkspace.activate('tools'));assert(await p.locator('[data-tool=AB]').isVisible());
 assert.deepEqual(errors,[]);console.log('Sidebar controls, content-sized evenly spaced menus, notes, resize and mode restoration: OK');
 }finally{if(browser)await browser.close();server.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
