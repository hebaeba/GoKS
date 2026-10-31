const assert=require('node:assert/strict'),{chromium}=require('playwright'),http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../web');const server=http.createServer((req,res)=>{let p=path.join(root,decodeURIComponent(req.url.split('?')[0]));if(req.url==='/')p=path.join(root,'index.html');if(!p.startsWith(root)||!fs.existsSync(p)||!fs.statSync(p).isFile()){res.writeHead(404);res.end();return;}res.setHeader('Content-Type',p.endsWith('.js')?'application/javascript':p.endsWith('.css')?'text/css':'text/html; charset=utf-8');res.end(fs.readFileSync(p));});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;try{
 browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,headless:true,args:['--no-sandbox','--disable-gpu','--use-gl=disabled','--disable-software-rasterizer','--single-process','--no-zygote']});

 const p=await browser.newPage({viewport:{width:1600,height:940}}),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto('http://127.0.0.1:'+server.address().port);
 assert(await p.locator('#graph-visible').isChecked());
 if(fs.existsSync('/workspace/scratch/b72cb62d57dc/work/NotoSansCJKjp-Regular.otf'))await p.addStyleTag({content:'@font-face{font-family:TestJP;src:url(data:font/otf;base64,'+fs.readFileSync('/workspace/scratch/b72cb62d57dc/work/NotoSansCJKjp-Regular.otf').toString('base64')+')}*{font-family:TestJP,sans-serif!important}'});await p.evaluate(()=>document.fonts.ready);
 const sgf='(;SZ[9]KM[0];B[aa];W[bb];B[cc];W[dd];B[ee];W[ff])';
 await p.evaluate(sgf=>IndependentGo.loadSgf(sgf,'test.sgf'),sgf);
 await p.evaluate(()=>{window.dispatchEvent(new CustomEvent('kifu-match-start',{detail:{blackHuman:false,whiteHuman:false}}));window.dispatchEvent(new Event('kifu-match-ready'));const snapshot=IndependentGo.peekAnalysisSnapshot();for(let index=0;index<6;index++)window.dispatchEvent(new CustomEvent('kifu-match-evaluation',{detail:{snapshot,index,move:index,color:index%2?'W':'B',result:{rootInfo:{winrate:index%2?.2:.6,scoreLead:index%2?-3:2}}}}));});
 assert.match(await p.locator('path[data-metric=scoreLead][data-side=W]').getAttribute('d'),/ 101(?: |$)/);
 await p.locator('#tab-match').click();assert(await p.locator('#match-ranking').getAttribute('open')!==null);assert.equal(await p.locator('.match-ranking-columns tbody').first().locator('tr').count(),3);
 assert.deepEqual(await p.locator('.match-ranking-columns tbody').first().locator('tr').first().locator('td').allTextContents(),['1','5.0','40.0']);
 for(const viewport of [{width:1280,height:940},{width:1280,height:740},{width:1600,height:940},{width:1752,height:940}]){
 await p.setViewportSize(viewport);await p.waitForTimeout(150);await p.locator('.panel-width-handle[data-side=left]').dblclick();await p.waitForTimeout(150);
 const box=await p.locator('#board-sidebar').boundingBox();assert(box.x<25,JSON.stringify({viewport,box}));
 const toggle=await p.locator('.graph-toggle').boundingBox(),legend=await p.locator('.side-eval-legend').boundingBox();assert(Math.abs(toggle.x+toggle.width/2-legend.x-legend.width/2)<2);
 const sizes=[];for(const visits of ['999','9,999','99,999']){await p.evaluate(v=>document.querySelector('#analysis-visits').textContent=v,visits);await p.waitForTimeout(80);sizes.push(await p.locator('.analysis-conditions').boundingBox());}
 assert.equal(sizes[0].height,sizes[2].height);assert.equal(sizes[0].width,sizes[2].width);
 assert((await p.locator('#analysis-pv-length').boundingBox()).width<70);assert.equal(await p.locator('#analysis-pv-length').evaluate(e=>Math.round(e.getBoundingClientRect().height)),26);
 }
 await p.setViewportSize({width:1752,height:940});await p.screenshot({path:'/tmp/update86-layout.png'});
 await p.evaluate(async()=>{IndependentGo.matchSaved(IndependentGo.peekAnalysisSnapshot());await IndependentGo.loadSgf('(;SZ[19]KM[0])','empty.sgf');});
 await p.locator('#match-white').selectOption('human');await p.locator('#match-start').click();await p.waitForFunction(()=>KifuMatch.phase==='playing');assert.equal(await p.locator('#match-settings').getAttribute('open'),null);assert(await p.locator('#match-ranking').getAttribute('open')!==null);assert(!(await p.locator('#graph-visible').isChecked()));await p.locator('#graph-visible').check();assert(await p.locator('#side-eval-graph').isVisible());
 await p.locator('#match-settings>summary').click();assert.equal(await p.locator('#match-settings .match-resign-rule').count(),1);
 assert.deepEqual(errors,[]);console.log('update86: margins, compact visits, inline graph toggle, white score perspective, live ranking and match folding OK');
 }finally{if(browser)await browser.close();server.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
