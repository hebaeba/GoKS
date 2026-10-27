/* Optional integration check: npm install playwright; CHROMIUM_PATH may specify a browser. */
const assert=require('node:assert/strict'),{chromium}=require('playwright'),http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../web');
const server=http.createServer((req,res)=>{let p=path.join(root,decodeURIComponent(req.url.split('?')[0]));if(req.url==='/')p=path.join(root,'index.html');if(!p.startsWith(root)||!fs.existsSync(p)||!fs.statSync(p).isFile()){res.writeHead(404);res.end();return;}res.setHeader('Content-Type',p.endsWith('.js')?'application/javascript':p.endsWith('.css')?'text/css':'text/html; charset=utf-8');res.end(fs.readFileSync(p));});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;try{
 browser=await chromium.launch({...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),headless:true,args:['--no-sandbox','--disable-gpu','--use-gl=disabled','--disable-software-rasterizer','--single-process','--no-zygote']});
 const p=await browser.newPage({viewport:{width:1280,height:940}}),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto('http://127.0.0.1:'+server.address().port);await p.waitForTimeout(150);



 assert.equal(await p.locator('#side-eval-graph circle').count(),0);
 assert.equal(await p.textContent('#side-black-rate'),'');
 assert.equal(await p.locator('.side-group h2').allTextContents().then(a=>a.join(',')),'分岐');
 const sgf='(;SZ[9]KM[0];B[aa];W[bb];B[cc];W[dd];B[ee];W[ff])';
 const archive={format:'kifu-katago-analysis',version:1,perspective:'BLACK',rules:'japanese',snapshot:{sgf,size:9,komi:0,index:3,path:[0,0,0,0,0,0]},results:[0,1,3,6].map(i=>({index:i,result:{rootInfo:{winrate:i===3?.7:.5,scoreLead:i-2,visits:100},moveInfos:[]}}))};
 await p.locator('#analysis-file').setInputFiles({name:'test.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(archive))});await p.waitForTimeout(180);
 assert.equal(await p.locator('#side-eval-graph circle').count(),8);
 assert.equal(await p.textContent('#side-black-rate'),'黒 70.0%');
 assert.equal(await p.textContent('#side-white-rate'),'白 30.0%');
 const d=await p.getAttribute('#side-eval-graph path[data-metric=winrate]','d');assert.equal((d.match(/M/g)||[]).length,3);assert.equal((d.match(/L/g)||[]).length,1);
 await p.locator('#side-eval-graph circle[data-index="1"][data-metric="winrate"]').click();await p.waitForTimeout(80);assert.equal(await p.evaluate(()=>IndependentGo.peekAnalysisSnapshot().index),1);
 await p.evaluate(()=>IndependentGo.analysisAt(2,IndependentGo.peekAnalysisSnapshot().sgf));await p.waitForTimeout(50);assert.equal(await p.textContent('#side-black-rate'),'');assert.equal(await p.locator('#side-eval-graph circle').count(),8);
 for(const [width,height]of [[1280,940],[1280,740],[1600,940],[1920,1000]]){await p.setViewportSize({width,height});await p.waitForTimeout(100);assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));const b=await p.locator('#board').boundingBox();assert(b.x+b.width<=width);assert(b.y+b.height<=height);assert.equal(await p.locator('#board-sidebar').evaluate(e=>Math.round(e.getBoundingClientRect().width)),290);assert.equal(await p.locator('#delete-move').evaluate(e=>getComputedStyle(e).padding),'3px');}
 await p.setViewportSize({width:1600,height:940});await p.waitForTimeout(100);
 if(process.env.UI_SCREENSHOT)await p.screenshot({path:process.env.UI_SCREENSHOT});
 await p.locator('#simple-toggle').click();assert.equal(await p.locator('#simple-info').evaluate(e=>e.firstElementChild.id),'komi');await p.locator('#simple-return').click();assert.equal(await p.locator('.board-heading #komi').count(),1);

 archive.results=Array.from({length:7},(_,i)=>({index:i,result:{rootInfo:{winrate:.4+i*.03,scoreLead:i-3,visits:100},moveInfos:[]}}));
 await p.locator('#analysis-file').setInputFiles({name:'full.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(archive))});await p.waitForTimeout(100);
 const full=await p.getAttribute('#side-eval-graph path[data-metric=winrate]','d');assert.equal((full.match(/M/g)||[]).length,1);assert.equal((full.match(/L/g)||[]).length,6);
 assert.equal(await p.getAttribute('#side-eval-graph path[data-metric=winrate]','stroke'),'#00ee00');assert.equal(await p.getAttribute('#side-eval-graph path[data-metric=scoreLead]','stroke'),'#ed00ed');
 await p.evaluate(()=>IndependentGo.loadSgf('(;SZ[19]HA[2]KM[0.5]AB[pd][dp]PL[W])','handicap.sgf'));await p.waitForTimeout(50);assert.equal(await p.locator('#match-auto-resign').isChecked(),false);assert.equal(await p.locator('#side-eval-graph circle').count(),0);assert.equal(await p.textContent('#side-black-rate'),'');
 await p.evaluate(()=>{const e=document.getElementById('match-auto-resign');e.checked=true;e.dispatchEvent(new Event('change'));window.dispatchEvent(new Event('kifu-position-change'));});assert.equal(await p.locator('#match-auto-resign').isChecked(),true);
 await p.evaluate(()=>document.getElementById('match-options').disabled=true);assert.equal(await p.locator('#match-auto-resign').isEnabled(),true);await p.evaluate(()=>document.getElementById('match-options').disabled=false);
 await p.evaluate(()=>IndependentGo.loadSgf('(;SZ[19]KM[6.5])','even.sgf'));assert.equal(await p.locator('#match-auto-resign').isChecked(),true);
 assert.deepEqual(errors,[]);console.log('update76: sparse evaluations, colors, navigation, stale results, PC layout, simple komi, handicap defaults and live checkbox: OK');
 }finally{if(browser)await browser.close();server.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
