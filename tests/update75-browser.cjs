/* Optional integration check: npm install playwright; CHROMIUM_PATH may specify a browser. */
const assert=require('node:assert/strict'),{chromium}=require('playwright'),http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../web');
const server=http.createServer((req,res)=>{let p=path.join(root,decodeURIComponent(req.url.split('?')[0]));if(req.url==='/')p=path.join(root,'index.html');if(!p.startsWith(root)||!fs.existsSync(p)||!fs.statSync(p).isFile()){res.writeHead(404);res.end();return;}res.setHeader('Content-Type',p.endsWith('.js')?'application/javascript':p.endsWith('.css')?'text/css':'text/html; charset=utf-8');res.end(fs.readFileSync(p));});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;try{
 browser=await chromium.launch({...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),headless:true,args:['--no-sandbox','--disable-gpu','--use-gl=disabled','--disable-software-rasterizer','--single-process','--no-zygote']});
 const p=await browser.newPage({viewport:{width:1280,height:940}}),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto('http://127.0.0.1:'+server.address().port);await p.waitForTimeout(150);


 const bbox=s=>p.locator(s).boundingBox();
 assert.equal(await p.textContent('#simple-toggle'),'シンプル表示');
 const boundary=[];const at=(x,y)=>y*9+x;for(let x=5;x<=8;x++)boundary.push(at(x,2));for(let x=3;x<=5;x++)boundary.push(at(x,3));for(let y=3;y<=7;y++)boundary.push(at(3,y));boundary.push(at(2,7));for(let x=2;x<=8;x++)boundary.push(at(x,8));for(let y=2;y<=8;y++)boundary.push(at(8,y));
 const unique=[...new Set(boundary)],enc=v=>String.fromCharCode(97+v%9,97+Math.floor(v/9));
 const source='(;SZ[9]GN[網掛けテスト]AB[ie][fe][ge][ef][ff][hf][hg][eh]AW[hc][ed][fd][hd][he][gf][gg][gh][dh][ch]DD'+unique.map(v=>'['+enc(v)+']').join('')+'LB[gf:A])';
 await p.evaluate(s=>IndependentGo.loadSgf(s,'網掛け.sgf'),source);await p.evaluate(()=>{document.getElementById('edit').click();document.getElementById('tool').value='DD';document.getElementById('tool').onchange();});
 const clickPoint=async(point,button='right')=>{const xy=await p.evaluate(point=>{const api=IndependentGo,{geometry:g,size}=api.peekAnalysisSnapshot(),r=document.getElementById('board').getBoundingClientRect(),d=api.displayPoint(point);return{x:r.x+(g.start+(d%size)*g.gap)*r.width/g.extent,y:r.y+(g.start+Math.floor(d/size)*g.gap)*r.height/g.extent}},point);await p.mouse.click(xy.x,xy.y,{button});await p.waitForTimeout(60);};
 const state=()=>p.evaluate(()=>{const g=GoSgf.parse(IndependentGo.getSgf());return g.root.props;});
 const original=await state();await clickPoint(at(6,5));let props=await state();assert.equal(GoCount(props.DD),unique.length+18);assert.deepEqual(props.AB,original.AB);assert.deepEqual(props.AW,original.AW);assert.deepEqual(props.LB,original.LB);assert(!await p.locator('#board-context-menu').isVisible());assert(!await p.locator('#paste-dialog').isVisible());
 await p.locator('#undo').click();assert.deepEqual((await state()).DD,original.DD);await p.locator('#redo').click();assert.equal(GoCount((await state()).DD),unique.length+18);
 await p.locator('#undo').click();await p.locator('#rotate-right').click();await clickPoint(at(6,5));assert.equal(GoCount((await state()).DD),unique.length+18);await p.locator('#undo').click();
 await p.evaluate(()=>IndependentGo.mirrorBoard());await clickPoint(at(7,3));assert.equal(GoCount((await state()).DD),unique.length+18);await p.locator('#undo').click();
 await clickPoint(at(0,0));assert.deepEqual((await state()).DD,original.DD);assert((await p.textContent('#message')).includes('隙間なく'));
 await p.evaluate(()=>document.getElementById('view').click());await clickPoint(at(6,5));assert.deepEqual((await state()).DD,original.DD);
 await p.evaluate(()=>{document.getElementById('tool').value='play';document.getElementById('tool').onchange();});await clickPoint(at(0,0));assert(await p.locator('#board-context-menu').isVisible());await p.keyboard.press('Escape');
 await p.locator('#simple-toggle').click();await p.evaluate(()=>{document.getElementById('tool').value='DD';document.getElementById('tool').onchange();});await clickPoint(at(6,5));assert.equal(GoCount((await state()).DD),unique.length+18);await p.locator('#simple-return').click();await p.locator('#undo').click();await p.evaluate(()=>IndependentGo.resetOrientation());
 for(const [width,height]of [[1280,940],[1280,740],[390,844]]){await p.setViewportSize({width,height});await p.waitForTimeout(100);assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.equal(await p.locator('#delete-move').evaluate(e=>getComputedStyle(e).padding),'3px');}
 await p.setViewportSize({width:1280,height:940});await p.waitForTimeout(100);
 await p.evaluate(()=>{window.saveOptions=null;window.showSaveFilePicker=async options=>{window.saveOptions=options;return{createWritable:async()=>({write:async()=>{},close:async()=>{}})}};document.getElementById('save').click();});await p.waitForTimeout(100);assert.equal(await p.evaluate(()=>window.saveOptions.suggestedName),'網掛け');assert.deepEqual(await p.evaluate(()=>window.saveOptions.types[0].accept),{'application/x-go-sgf':['.sgf']});
 await p.evaluate(()=>document.getElementById('print').click());assert(await p.locator('#print-preview').isVisible());assert((await p.getAttribute('#print-preview-image','src')).startsWith('data:image/png'));await p.locator('#print-close').click();
 if(process.env.UI_SCREENSHOT)await p.screenshot({path:process.env.UI_SCREENSHOT});
 assert.deepEqual(errors,[]);console.log('update75: irregular/stone region fill, undo/redo, rotation, lock, simple mode, context menu, save options and print: OK');
 function GoCount(a){return a.length;}
 }finally{if(browser)await browser.close();server.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
