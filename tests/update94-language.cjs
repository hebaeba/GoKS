const {chromium}=require('playwright'),fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert/strict');
const root=path.resolve(__dirname,'../web'),sessions={},trace=[];
function response(s,id,text=''){s.events.push({type:'gtp',line:'='+id+(text?' '+text:'')},{type:'gtp',line:''});}
function raw(action,payload={}){
 const key=payload.session||'main';let s=sessions[key];
 if(action==='defaults')return {};
 if(action==='start'){s=sessions[key]={running:true,events:[],stream:null};trace.push([key,'start']);return {meta:{kind:'katago'}};}
 if(action==='stop'){if(s)s.running=false;trace.push([key,'stop']);return{};}
 if(action==='poll')return {running:!!s?.running,events:s?.events.splice(0)||[],logs:[]};
 if(action==='send'){for(const line of payload.commands){trace.push([key,line]);const [id,...parts]=line.split(' '),cmd=parts.join(' ');
 if(s.stream){s.events.push({type:'gtp',line:''});s.stream=null;}
 if(cmd.startsWith('kata-analyze ')){s.stream=id;s.events.push({type:'gtp',line:'='+id},{type:'gtp',line:'rootInfo visits 20 winrate 0.6 scoreLead 3 ownership '+Array(361).fill('.8').join(' ')});}
 else if(cmd.startsWith('kata-genmove_analyze ')){s.stream=id;s.events.push({type:'gtp',line:'='+id});} // Hold AI thinking until explicitly stopped.
 else response(s,id,({protocol_version:'2',name:'KataGo mock',version:'test',list_commands:'kata-analyze kata-genmove_analyze kata-set-rules kata-set-param set_position set_free_handicap clear_cache stop'})[cmd]||'');
 }return{};}return{};
}
const server=http.createServer((req,res)=>{
 if(req.url==='/api/engine'){let body='';req.on('data',s=>body+=s);req.on('end',()=>{try{const {action,payload}=JSON.parse(body);res.setHeader('Content-Type','application/json');res.end(JSON.stringify({ok:true,result:raw(action,payload)}));}catch(e){res.end(JSON.stringify({ok:false,error:e.message}));}});return;}
 const p=path.join(root,req.url.split('?')[0]==='/'?'index.html':req.url.split('?')[0]);
 if(!fs.existsSync(p)){res.writeHead(404);res.end();return;}
 res.setHeader('Content-Type',p.endsWith('.js')?'application/javascript':p.endsWith('.css')?'text/css':'text/html; charset=utf-8');
 let content=fs.readFileSync(p);if(p.endsWith('index.html'))content=content.toString().replace('<head>','<head><meta name="kifu-local-token" content="test">');res.end(content);
});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;try{
 browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/tmp/chromium94',args:['--no-sandbox','--disable-gpu','--disable-software-rasterizer','--use-gl=disabled','--single-process','--no-zygote']});
 const p=await browser.newPage({viewport:{width:1280,height:740}}),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto('http://127.0.0.1:'+server.address().port);await p.waitForSelector('[data-language-choice=en]');
 await p.evaluate(async()=>{KifuDialogs.confirm=async()=>true;await IndependentGo.loadSgf('(;SZ[9]GN[新しい碁盤]PB[黒番]PW[白番]C[日本語のコメント];B[aa];W[bb])','日本語.sgf');});
 const before=await p.evaluate(()=>IndependentGo.peekAnalysisSnapshot().sgf);
 await p.locator('[data-language-choice=en]').click();
 for(const key of ['analysis','match','sequence','record','storage','settings']){
  await p.evaluate(key=>KifuWorkspace.activate(key),key);await p.waitForTimeout(150);
  const overflow=await p.evaluate(()=>[...document.querySelectorAll('select')].filter(e=>e.getClientRects().length&&e.getBoundingClientRect().right>innerWidth).map(e=>e.id));assert.deepEqual(overflow,[]);
  await p.screenshot({path:'/tmp/update94-'+key+'.png'});
 }
 assert.equal(await p.evaluate(()=>IndependentGo.peekAnalysisSnapshot().sgf),before);
 assert.equal(await p.locator('.game-title').textContent(),'新しい碁盤');
 assert.equal(await p.locator('#black-name').textContent(),'黒番');
 assert.equal(await p.locator('#white-name').textContent(),'白番');
 await p.locator('[data-language-choice=ja]').click();assert.equal(await p.evaluate(()=>IndependentGo.peekAnalysisSnapshot().sgf),before);
 await p.locator('[data-language-choice=en]').click();await p.locator('#simple-toggle').click();
 assert.equal(await p.locator('#simple-estimate').count(),0);
 await p.locator('#simple-menu>details>summary').filter({hasText:/^View$/}).click();await p.getByRole('button',{name:'日本語 / English',exact:true}).click();await p.waitForFunction(()=>document.documentElement.lang==='ja');
 assert.deepEqual(errors,[]);console.log('update94 English panels, user-data preservation and simple-language control OK');
 }finally{await browser?.close();server.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
