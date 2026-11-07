/* Optional integration check: npm install playwright; CHROMIUM_PATH may specify a browser. */
const assert=require('node:assert/strict'),{chromium}=require('playwright'),http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../web');
const server=http.createServer((req,res)=>{let p=path.join(root,decodeURIComponent(req.url.split('?')[0]));if(req.url==='/')p=path.join(root,'index.html');if(!p.startsWith(root)||!fs.existsSync(p)||!fs.statSync(p).isFile()){res.writeHead(404);res.end();return;}res.setHeader('Content-Type',p.endsWith('.js')?'application/javascript':p.endsWith('.css')?'text/css':'text/html; charset=utf-8');res.end(fs.readFileSync(p));});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;try{
 browser=await chromium.launch({...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),headless:true,args:['--no-sandbox','--disable-gpu','--use-gl=disabled','--disable-software-rasterizer','--single-process','--no-zygote']});
 const p=await browser.newPage({viewport:{width:1280,height:940}}),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto('http://127.0.0.1:'+server.address().port);await p.waitForTimeout(150);
 assert.deepEqual(errors,[]);
 assert.equal(await p.title(),'Go棋譜Studio');
 assert.equal(await p.locator('#analysis-graph,#analysis-summary,#analysis-metric').count(),0);
 assert.equal(await p.locator('#side-eval-graph circle').count(),0);
 assert.equal(await p.locator('#side-eval-graph').evaluate(e=>e.getBoundingClientRect().height),300);
 const box=s=>p.locator(s).boundingBox();
 for(const [w,h]of [[1280,940],[1280,740],[1600,940],[1920,1000]]){await p.setViewportSize({width:w,height:h});await p.waitForTimeout(100);assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));const b=await box('#board');assert(b.x+b.width<=w);assert(b.y+b.height<h);}
 await p.setViewportSize({width:1600,height:940});await p.waitForTimeout(100);
 const firstLeft=(await box('#board-sidebar')).width,firstRight=(await box('.inspector')).width;

 // Update121: panel sizes are fixed, and previously stored draggable widths are ignored.
 assert.equal(await p.locator('.panel-width-handle').count(),0);
 await p.evaluate(()=>localStorage.setItem('gokifu-panel-widths',JSON.stringify({left:620,right:800})));
 await p.reload();await p.waitForTimeout(150);
 assert(Math.abs((await box('#board-sidebar')).width-400)<2);
 assert(Math.abs((await box('.inspector')).width-500)<2);
 await p.locator('#simple-toggle').click();assert.equal(await p.locator('#simple-info').evaluate(e=>e.firstElementChild.id),'komi');
 await p.locator('#simple-return').click();
 assert(Math.abs((await box('#board-sidebar')).width-firstLeft)<2);
 assert(Math.abs((await box('.inspector')).width-firstRight)<2);
 const sgf='(;SZ[9]KM[0];B[aa];W[bb];B[cc];W[dd];B[ee];W[ff])';
 const archive={format:'kifu-katago-analysis',version:1,perspective:'BLACK',rules:'japanese',snapshot:{sgf,size:9,komi:0,index:3,path:[0,0,0,0,0,0]},results:[0,1,3,6].map(i=>({index:i,result:{rootInfo:{winrate:i===3?.7:.5,scoreLead:i-2,visits:100},moveInfos:[]}}))};
 await p.locator('#analysis-file').setInputFiles({name:'test.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(archive))});await p.waitForTimeout(150);
 assert.equal(await p.textContent('#side-black-rate'),'黒 70.0%');assert.equal(await p.locator('#side-eval-graph circle').count(),0);
 const d=await p.getAttribute('#side-eval-graph path[data-metric=winrate]','d');assert.equal((d.match(/M/g)||[]).length,3);assert.equal((d.match(/L/g)||[]).length,1);
 const g=await box('#side-eval-graph');await p.mouse.click(g.x+44+(g.width-77)/6,g.y+120);await p.waitForTimeout(100);assert.equal(await p.evaluate(()=>IndependentGo.peekAnalysisSnapshot().index),1);
 await p.evaluate(()=>IndependentGo.analysisAt(2,IndependentGo.peekAnalysisSnapshot().sgf));assert.equal(await p.textContent('#side-black-rate'),'');
 if(process.env.UI_SCREENSHOT)await p.screenshot({path:process.env.UI_SCREENSHOT});
 // The new export is true monochrome, with the same dimensions, and leaves the editor untouched.
 await p.evaluate(()=>{window.savedImage=null;GoExport.save=async(blob,name)=>{window.savedImage={blob,name};return true;};document.getElementById('save-image-mono').click();});await p.waitForFunction(()=>window.savedImage);
 const pixels=await p.evaluate(async()=>{const bm=await createImageBitmap(savedImage.blob),c=document.createElement('canvas');c.width=bm.width;c.height=bm.height;const ctx=c.getContext('2d');ctx.drawImage(bm,0,0);const d=ctx.getImageData(0,0,c.width,c.height).data;let black=0,white=0,bad=0;for(let i=0;i<d.length;i+=4){if(d[i]===0&&d[i+1]===0&&d[i+2]===0)black++;else if(d[i]===255&&d[i+1]===255&&d[i+2]===255)white++;else bad++;}return{black,white,bad,width:c.width,board:Math.round(document.getElementById('board').clientWidth),sgf:IndependentGo.getSgf()};});assert.equal(pixels.bad,0);assert(pixels.black>500&&pixels.white>500);assert(pixels.width>=1600&&pixels.width>=pixels.board*2);assert(await p.evaluate(()=>{const c=document.getElementById('board'),d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;for(let i=0;i<d.length;i+=4)if(d[i]!==d[i+1])return true;return false;}));assert.equal(await p.evaluate(()=>IndependentGo.peekAnalysisSnapshot().index),2);
 const boundary=[23,24,25,26,30,31,32,39,48,57,65,66,74],enc=n=>String.fromCharCode(97+n%9,97+Math.floor(n/9));
 await p.evaluate(s=>IndependentGo.loadSgf(s,'edge.sgf'),'(;SZ[9]AB[ge]DD'+boundary.map(n=>'['+enc(n)+']').join('')+')');
 await p.evaluate(()=>{document.getElementById('edit').click();document.getElementById('tool').value='DD';document.getElementById('tool').onchange();});
 async function pointClick(point){const xy=await p.evaluate(point=>{const {geometry:g,size}=IndependentGo.peekAnalysisSnapshot(),r=document.getElementById('board').getBoundingClientRect();return{x:r.x+(g.start+point%size*g.gap)*r.width/g.extent,y:r.y+(g.start+Math.floor(point/size)*g.gap)*r.height/g.extent};},point);await p.mouse.click(xy.x,xy.y,{button:'right'});await p.waitForTimeout(300);}
 await pointClick(70);assert(await p.evaluate(()=>GoSgf.parse(IndependentGo.getSgf()).root.props.DD.includes('ii')));assert.equal(await p.locator('#undo').evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(32, 90, 80)');await p.locator('#undo').click();await p.waitForTimeout(300);assert.equal(await p.locator('#redo').evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(32, 90, 80)');
 await pointClick(0);assert(await p.evaluate(()=>GoSgf.parse(IndependentGo.getSgf()).root.props.DD.includes('aa')));await p.locator('#undo').click();
 assert.deepEqual(errors,[]);
 // Exercise the actual match controller using a deterministic GTP bridge (no real engine).
 const m=await browser.newPage({viewport:{width:1600,height:940}});const matchErrors=[];m.on('pageerror',e=>matchErrors.push(e.message));await m.goto('http://127.0.0.1:'+server.address().port);await m.waitForTimeout(150);
 await m.evaluate(()=>{let turn=0;KifuGTP.Bridge=class{async call(action){return action==='poll'?{events:[],logs:[]}:{};}reset(){}async commands(list){return list.map(c=>{if(c==='name')return 'KataGo test';if(c==='list_commands')return 'kata-genmove_analyze kata-set-param kata-set-rules set_position';if(c.startsWith('kata-genmove_analyze')){const i=turn++;return 'rootInfo winrate '+(i%2?.7:.6)+' scoreLead '+(i%2?3:2)+' visits 100\nplay '+['A1','B1','pass','pass'][i];}return '';});}};KifuAnalysisControl.suspend=async()=>{};KifuAnalysisControl.profiles=()=>[{id:'test',name:'Mock KataGo',exe:'test.exe',model:'test.bin.gz',config:'test.cfg',kind:'katago'}];window.dispatchEvent(new Event('kifu-engine-profiles'));document.getElementById('match-black').value='test';document.getElementById('match-white').value='test';KifuWorkspace.activate('match');document.getElementById('match-start').click();});
 await m.waitForFunction(()=>KifuMatch.phase==='finished',{},{timeout:8000});await m.evaluate(()=>IndependentGo.analysisAt(1,IndependentGo.peekAnalysisSnapshot().sgf));await m.waitForTimeout(70);assert.equal(await m.textContent('#side-black-rate'),'黒 70.0%');assert.equal(await m.textContent('#side-white-rate'),'白 30.0%');const md=await m.getAttribute('#side-eval-graph path[data-metric=winrate]','d');assert.equal((md.match(/L/g)||[]).length,3);
 await m.evaluate(()=>IndependentGo.matchInfo({RE:'B+R'}));await m.waitForTimeout(50);assert.equal(await m.textContent('#side-black-rate'),'黒 70.0%');assert.deepEqual(matchErrors,[]);await m.close();console.log('update121: fixed panels, line graph, sparse gaps, game evaluation, edge fill, undo/redo, monochrome export, names: OK');
 }finally{if(browser)await browser.close();server.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
