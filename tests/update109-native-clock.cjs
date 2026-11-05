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
  const {action,kind,payload}=args;
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
 await main.locator('#tab-match').click();await main.locator('#match-black-preset').selectOption('fischer');await main.locator('#match-black-main').fill('1');await main.locator('#match-white-preset').selectOption('2');await main.locator('#match-white-visits-preset').selectOption('500');
 await main.locator('#match-start').click();await main.waitForFunction(()=>KifuMatch.phase==='playing');let clock;for(let n=0;n<50&&!clock;n++){clock=windows.get('clock');await main.waitForTimeout(20);}assert(clock);await clock.waitForSelector('#digits-B');
 await main.evaluate(()=>clockOffset+=5000);await main.waitForTimeout(150);await main.evaluate(()=>{void KifuMatch.humanMove(0);});await main.waitForFunction(()=>document.getElementById('match-status').textContent.includes('思考中'));await main.waitForTimeout(150);const before=await clock.locator('#digits-B').textContent();assert.match(await clock.locator('#detail-B').textContent(),/フィッシャー.*5/);
 await main.evaluate(()=>clockOffset+=300000);await main.waitForTimeout(200);assert.equal(await clock.locator('#digits-B').textContent(),before);assert.equal(await main.evaluate(()=>KifuMatch.phase),'playing');assert.equal(await clock.locator('#digits-W').textContent(),'AI');
 assert(trace.some(x=>/kata-set-param maxTime 2/.test(x[1])));assert(trace.some(x=>/kata-set-param maxVisits 500/.test(x[1])));
 await main.evaluate(()=>KifuI18n.set('en'));await clock.waitForFunction(()=>document.getElementById('clock-title').textContent==='Game Clock');await clock.locator('#clock-toggle').click();await main.waitForFunction(()=>KifuMatch.phase==='paused');
 await clock.locator('#clock-sound').uncheck();assert.equal(await clock.locator('#clock-sound').isChecked(),false);
 await main.evaluate(()=>KifuSimple.setMode(true));await clock.locator('#clock-toggle').click();await main.waitForFunction(()=>KifuMatch.phase==='playing');await clock.waitForFunction(()=>document.getElementById('clock-phase').textContent==='Playing');await clock.locator('#clock-toggle').click();await main.waitForFunction(()=>KifuMatch.phase==='paused');
 await clock.locator('#clock-title').dispatchEvent('pointerdown',{button:0});assert(trace.some(x=>x[0]==='native-panel-drag'));
 await clock.locator('#clock-close').click();await main.waitForTimeout(100);await main.evaluate(()=>document.getElementById('match-clock-open').click());await main.waitForTimeout(250);clock=windows.get('clock');await clock.waitForFunction(()=>document.getElementById('clock-phase').textContent==='Paused');assert.equal(await clock.locator('#clock-sound').isChecked(),false);assert.deepEqual(errors,[]);
 console.log('PASS: Fischer native clock route, child pause/resume/mute/drag/close/reopen, live English, Simple View, human clock frozen during AI turn, AI maxTime/maxVisits unchanged');
 }finally{await browser?.close();server.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
