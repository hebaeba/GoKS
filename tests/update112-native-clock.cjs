const {chromium}=require('playwright'),fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert/strict');
let noResults=false;
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
 if(cmd.startsWith('kata-analyze ')){s.stream=id;s.events.push({type:'gtp',line:'='+id});if(!noResults)s.events.push({type:'gtp',line:'rootInfo visits 20 winrate 0.6 scoreLead 3 ownership '+Array(361).fill('.8').join(' ')});}
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
 const context=await browser.newContext({viewport:{width:1280,height:940}}),windows=new Map(),errors=[];
 context.setDefaultTimeout(12000);context.on('page',p=>p.on('pageerror',e=>errors.push(e.message)));let main;
 const address='http://127.0.0.1:'+server.address().port;
 await context.exposeBinding('nativeInvoke',async({page},command,args)=>{
  if(command==='auxiliary'&&args.action==='drag'){trace.push(['native-panel-drag']);return {};}
  if(command==='engine_call')return raw(args.action,args.payload);
  if(command==='desktop_fonts')return ['Arial','Segoe UI','Yu Gothic'];
  if(command!=='auxiliary')return {};
  const {action,kind,payload}=args;trace.push(['aux',action,kind]);
  if(action==='open'){
   let child=windows.get(kind);
   if(!child||child.isClosed()){child=await context.newPage();windows.set(kind,child);child.on('close',()=>main.evaluate(m=>window.dispatchEvent(new CustomEvent('kifu-aux',{detail:m})),{kind,id:payload.id,type:'closed'}).catch(()=>{}));}
   await child.goto(address+'/auxiliary.html?kind='+kind+'&id='+payload.id);return{opened:true};
  }
  if(action==='send'){const target=page===main?windows.get(kind):main;if(target&&!target.isClosed())await target.evaluate(m=>window.dispatchEvent(new CustomEvent('kifu-aux',{detail:m})),{kind,...payload});return{};}
  if(action==='close'){await windows.get(kind)?.close();return{};}
  if(action==='focus'){await windows.get(kind)?.bringToFront();return{};}
  if(action==='owner-focus'){await main.bringToFront();return{};}
  return{};
 });
 await context.addInitScript(()=>{window.__TAURI_INTERNALS__={invoke:(...args)=>window.nativeInvoke(...args)};});
 main=await context.newPage();await main.goto(address);
 await main.waitForSelector('[data-language-choice=en]');

 await main.evaluate(()=>{const real=Date.now;window.clockOffset=0;Date.now=()=>real()+clockOffset;KifuAnalysisControl.setFieldsCollapsed(false);for(const [id,v]of Object.entries({'engine-exe':'mock.exe','engine-model':'mock.bin.gz','engine-name':'KataGo Test'}))document.getElementById(id).value=v;});

 await main.locator('#tab-match').click();
 await main.locator('#match-white').selectOption('human');
 await main.locator('#match-start').click();
 await main.waitForFunction(()=>KifuMatch.phase==='playing');
 for(let n=0;n<50&&!windows.get('clock');n++)await main.waitForTimeout(20);
 const clock=windows.get('clock');assert(clock);await clock.waitForSelector('#digits-B');
 const url=clock.url(),startDigits=await clock.locator('#digits-B').textContent();
 for(let move=0;move<6;move++){
  await main.bringToFront();
  await main.evaluate(()=>clockOffset+=2000);
  await main.evaluate(p=>KifuMatch.humanMove(p),move);
  await main.waitForFunction(n=>IndependentGo.getMove()===n,move+1);
  await main.waitForTimeout(150);
  assert.equal(clock.isClosed(),false);
  assert.equal(windows.get('clock'),clock);assert.equal(clock.url(),url);
  assert.equal(await clock.locator('#clock-phase').textContent(),'対局中');
 }
 assert.notEqual(await clock.locator('#digits-B').textContent(),startDigits);
 assert.equal(trace.filter(x=>x[0]==='aux'&&x[1]==='open'&&x[2]==='clock').length,1);
 assert.equal(trace.filter(x=>x[0]==='aux'&&['close','focus'].includes(x[1])&&x[2]==='clock').length,0);
 await clock.locator('#clock-toggle').click();await main.waitForFunction(()=>KifuMatch.phase==='paused');
 await main.evaluate(()=>KifuSimple.setMode(true));assert.equal(clock.isClosed(),false);
 await clock.locator('#clock-toggle').click();await main.waitForFunction(()=>KifuMatch.phase==='playing');
 await clock.locator('#clock-close').click();await main.waitForTimeout(100);
 assert.equal(await main.evaluate(()=>KifuMatch.phase),'playing');
 await main.evaluate(()=>document.getElementById('match-clock-open').click());
 await main.waitForTimeout(250);const reopened=windows.get('clock');
 assert.notEqual(reopened,clock);await reopened.waitForSelector('#digits-B');
 await main.evaluate(()=>KifuI18n.set('en'));
 await reopened.waitForFunction(()=>document.getElementById('clock-title').textContent==='Game Clock');
 assert.deepEqual(errors,[]);
 console.log('PASS: six moves and main-window activation keep the same clock/session; no move-triggered close/reopen/focus; pause/resume, Simple View, explicit close/reopen and live English');
 }finally{await browser?.close();server.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
