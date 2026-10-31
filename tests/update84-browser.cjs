const assert=require('node:assert/strict'),{chromium}=require('playwright'),http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../web');const server=http.createServer((req,res)=>{let p=path.join(root,decodeURIComponent(req.url.split('?')[0]));if(req.url==='/')p=path.join(root,'index.html');if(!p.startsWith(root)||!fs.existsSync(p)||!fs.statSync(p).isFile()){res.writeHead(404);res.end();return;}res.setHeader('Content-Type',p.endsWith('.js')?'application/javascript':p.endsWith('.css')?'text/css':'text/html; charset=utf-8');res.end(fs.readFileSync(p));});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;try{
 browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,headless:true,args:['--no-sandbox','--disable-gpu','--use-gl=disabled','--disable-software-rasterizer','--single-process','--no-zygote']});

 const p=await browser.newPage({viewport:{width:1600,height:940}}),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto('http://127.0.0.1:'+server.address().port);
 for(const viewport of [{width:1280,height:940},{width:1280,height:740},{width:1600,height:940}]){
 await p.setViewportSize(viewport);
 for(const size of ['9','13','19','4']){await p.selectOption('#size',size);await p.waitForFunction(size=>IndependentGo.peekAnalysisSnapshot().sgf.includes('SZ['+size+']'),size);assert.equal(await p.inputValue('#size'),size);}
 await p.locator('#auto-play').click();const warning=await p.locator('#message').boundingBox();assert(Math.abs(warning.y-(await p.locator('.canvas-wrap').boundingBox()).y)<2);assert.match(await p.locator('#message').textContent(),/末尾/);
 const auto=await p.locator('.autoplay').boundingBox(),row=await p.locator('.side-navigation .side-row').boundingBox();assert(Math.abs(auto.x+auto.width-row.x-row.width)<3);
 }
 await p.evaluate(()=>IndependentGo.loadSgf('(;GM[1]FF[4]SZ[9];B[aa])','test.sgf',100,{edited:true}));
 await p.selectOption('#size','13');await p.getByRole('button',{name:'キャンセル',exact:true}).click();await p.waitForFunction(()=>document.querySelector('#size').value==='9');
 await p.selectOption('#size','13');await p.getByRole('button',{name:'置き換える',exact:true}).click();await p.waitForFunction(()=>IndependentGo.peekAnalysisSnapshot().sgf.includes('SZ[13]'));
 assert.deepEqual(errors,[]);console.log('update84: board size selection, top warning and right aligned autoplay passed at all three desktop sizes');
 }finally{if(browser)await browser.close();server.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
