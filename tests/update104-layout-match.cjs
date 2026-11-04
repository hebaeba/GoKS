const {chromium}=require('playwright'),fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert/strict');
const root=path.resolve(__dirname,'../web');const server=http.createServer((req,res)=>{const f=path.join(root,req.url.split('?')[0]==='/'?'index.html':req.url.split('?')[0]);if(!fs.existsSync(f)){res.writeHead(404);return res.end();}res.setHeader('Content-Type',f.endsWith('.js')?'text/javascript':f.endsWith('.css')?'text/css':f.endsWith('.wav')?'audio/wav':f.endsWith('.svg')?'image/svg+xml':'text/html; charset=utf-8');res.end(fs.readFileSync(f));});

(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;try{
 browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox','--disable-gpu','--disable-software-rasterizer','--use-gl=disabled','--single-process','--no-zygote']});
 const page=await browser.newPage({viewport:{width:1600,height:940}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:'+server.address().port);await page.waitForSelector('#simple-toggle');await page.evaluate(()=>document.fonts.ready);
 // Return native size before the delayed WebView resize event, like Windows.
 await page.exposeFunction('resizeMock',async({simple,width})=>{
  const target={width:simple?Math.round(width):1600,height:940};
  await page.evaluate(v=>window.nativeReturning=!v,simple);setTimeout(()=>page.setViewportSize(target).catch(()=>{}),300);
  await new Promise(r=>setTimeout(r,800));return {width:target.width+10,height:target.height};
 });
 await page.evaluate(()=>{window.__TAURI_INTERNALS__={invoke:(cmd,args)=>cmd==='desktop_simple_window'?resizeMock(args):Promise.resolve({})};window.badFrames=[];window.sample=true;
 const tick=()=>{if(!sample)return;const simple=document.body.classList.contains('simple-mode'),r=document.querySelector('.canvas-wrap').getBoundingClientRect();
  if(simple&&(r.x<0||r.x>12||r.right>innerWidth+1))badFrames.push({simple,width:innerWidth,x:r.x,right:r.right});
  if(simple&&innerWidth>=1500&&window.nativeReturning)badFrames.push({expandedSimple:true,width:innerWidth});
  if(!simple&&innerWidth<1500)badFrames.push({simple,width:innerWidth});
  requestAnimationFrame(tick);
 };requestAnimationFrame(tick);});
 for(let i=0;i<4;i++){
  await page.evaluate(()=>{nativeReturning=false;KifuSimple.setMode(true);});await page.waitForTimeout(950);
  await page.evaluate(()=>{window.dispatchEvent(new Event('resize'));KifuSimple.setMode(false);});
  await page.waitForTimeout(100);assert.equal(await page.evaluate(()=>document.body.classList.contains('simple-mode')),true,'must keep simple board until native width arrives');
  await page.waitForTimeout(450);assert.equal(await page.evaluate(()=>document.body.classList.contains('simple-mode')),false);await page.waitForTimeout(450);
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
 await page.setViewportSize({width:1600,height:940});await page.evaluate(()=>KifuI18n.set('ja'));
 await page.locator('#tab-match').click();
 assert.equal(await page.locator('#match-settings>summary').textContent(),'新規対局（対局者・条件）');
 await page.locator('#match-settings>summary').click();assert.equal(await page.locator('#match-start').isVisible(),false);assert.equal(await page.locator('#match-status').isVisible(),false);
 await page.locator('#match-settings>summary').click();await page.locator('#match-white').selectOption('human');
 await page.locator('#match-black-name').fill('黒の友人');await page.locator('#match-white-name').fill('White Friend');await page.locator('#match-start').click();await page.waitForFunction(()=>KifuMatch.phase==='playing');
 assert.equal(await page.locator('#match-settings').getAttribute('open'),null);assert(await page.locator('#match-pause').isVisible());assert(await page.locator('#match-end').isVisible());
 assert.match(await page.locator('#match-session-info').textContent(),/黒 黒の友人白 White Friend互先コミ 6.5/);
 await page.locator('#match-pause').click();assert(await page.locator('#match-resume').isEnabled());await page.locator('#match-resume').click();await page.waitForFunction(()=>KifuMatch.phase==='playing');
 await page.evaluate(()=>KifuMatch.humanMove(0));await page.locator('#match-takeback').click();await page.waitForFunction(()=>KifuMatch.phase==='playing'&&IndependentGo.getMove()===0);
 await page.evaluate(()=>KifuI18n.set('en'));await page.waitForTimeout(80);assert.match(await page.locator('#match-settings>summary').textContent(),/New Game/);assert.match(await page.locator('#match-session-info').textContent(),/黒の友人/);
 // GTP results are already BLACK perspective. Only AI-AI white series flips score.
 for(const dual of [false,true]){await page.evaluate(dual=>{window.dispatchEvent(new CustomEvent('kifu-match-start',{detail:{blackHuman:!dual,whiteHuman:false}}));document.getElementById('graph-visible').checked=true;const s=IndependentGo.peekAnalysisSnapshot();window.dispatchEvent(new CustomEvent('kifu-match-evaluation',{detail:{snapshot:s,index:0,move:0,color:'W',result:{rootInfo:{winrate:.7,scoreLead:4},moveInfos:[]}}}));},dual);
 const d=await page.locator('#side-eval-graph path[data-metric="scoreLead"]'+(dual?'[data-side="W"]':'')).getAttribute('d');const y=Number(d.match(/M[\d.]+ ([\d.]+)/)[1]);assert.equal(y<140,!dual,d);
 }
 assert.deepEqual(errors,[]);console.log('PASS: match fold, fixed session names, pause/resume/takeback, human-AI BLACK score, AI-AI white score; delayed native resize sampled every frame; four normal/simple round trips; compact ja/en Edit across 3 widths');
 }finally{await browser?.close();server.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
