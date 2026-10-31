const assert=require('node:assert/strict'),{chromium}=require('playwright'),http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../web');const server=http.createServer((req,res)=>{let p=path.join(root,decodeURIComponent(req.url.split('?')[0]));if(req.url==='/')p=path.join(root,'index.html');if(!p.startsWith(root)||!fs.existsSync(p)||!fs.statSync(p).isFile()){res.writeHead(404);res.end();return;}res.setHeader('Content-Type',p.endsWith('.js')?'application/javascript':p.endsWith('.css')?'text/css':'text/html; charset=utf-8');res.end(fs.readFileSync(p));});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;try{
 browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,headless:true,args:['--no-sandbox','--disable-gpu','--use-gl=disabled','--disable-software-rasterizer','--single-process','--no-zygote']});

 const p=await browser.newPage({viewport:{width:1600,height:940}}),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto('http://127.0.0.1:'+server.address().port);
 assert(await p.locator('#graph-visible').isChecked());
 const sgf='(;SZ[9]KM[0];B[aa];W[bb];B[cc];W[dd];B[ee];W[ff])';
 await p.evaluate(sgf=>IndependentGo.loadSgf(sgf,'test.sgf'),sgf);
 await p.evaluate(()=>{window.dispatchEvent(new CustomEvent('kifu-match-start',{detail:{blackHuman:false,whiteHuman:false}}));const snapshot=IndependentGo.peekAnalysisSnapshot();for(let index=0;index<6;index++)window.dispatchEvent(new CustomEvent('kifu-match-evaluation',{detail:{snapshot,index,move:index,color:index%2?'W':'B',result:{rootInfo:{winrate:index%2?.2:.6,scoreLead:index%2?-3:2}}}}));});
 for(const side of ['B','W']){const line=p.locator('path[data-metric=winrate][data-side='+side+']');assert.equal(await line.getAttribute('stroke'),side==='B'?'#000':'#fff');assert.equal((await line.getAttribute('d')).match(/ L/g).length,2);}
 assert.match(await p.locator('path[data-metric=winrate][data-side=W]').getAttribute('d'),/ 62(?: |$)/);
 assert.equal(await p.locator('path[data-metric=scoreLead][data-side=W]').getAttribute('stroke-dasharray'),'5 4');
 for(const human of [{blackHuman:true,whiteHuman:false},{blackHuman:true,whiteHuman:true}]){await p.evaluate(detail=>window.dispatchEvent(new CustomEvent('kifu-match-start',{detail})),human);assert(!(await p.locator('#graph-visible').isChecked()));assert(await p.locator('#side-eval-graph').isHidden());await p.locator('#graph-visible').check();assert(await p.locator('#side-eval-graph').isVisible());}
 for(const viewport of [{width:1280,height:940},{width:1280,height:740},{width:1600,height:940}]){
 await p.setViewportSize(viewport);await p.locator('#auto-play').click();await p.waitForTimeout(100);const box=await p.locator('.canvas-wrap').boundingBox(),warning=await p.locator('#message').boundingBox();assert(Math.abs(box.x-warning.x)<2);assert(Math.abs(box.y-warning.y)<2);assert(warning.width<=box.width+1);
 }
 assert.deepEqual(errors,[]);console.log('update85: separate AI perspectives, alternating connections, black score perspective, human visibility defaults and board warning placement OK');
 }finally{if(browser)await browser.close();server.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
