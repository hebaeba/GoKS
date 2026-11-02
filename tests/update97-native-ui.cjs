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
 const context=await browser.newContext({viewport:{width:1280,height:940}}),windows=new Map(),errors=[];
 context.setDefaultTimeout(12000);context.setDefaultNavigationTimeout(12000);context.on('page',p=>p.on('pageerror',e=>errors.push(e.message)));let main;
 const address='http://127.0.0.1:'+server.address().port;
 await context.exposeBinding('nativeInvoke',async({page},command,args)=>{
  if(command==='auxiliary'&&args.action==='drag'){trace.push(['native-panel-drag']);return {};}
  if(command==='engine_call')return raw(args.action,args.payload);
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

 await main.evaluate(()=>{new MutationObserver(()=>document.querySelector('#record-replace-dialog [data-accept]')?.click()).observe(document.body,{childList:true});window.__drawLabels=[];const old=CanvasRenderingContext2D.prototype.fillText;CanvasRenderingContext2D.prototype.fillText=function(t,x,y,...args){if(this.fillStyle==='#06ad01')window.__drawLabels.push({t,font:Number(this.font.match(/([\d.]+)px/)[1])*this.canvas.clientWidth/this.canvas.width});return old.call(this,t,x,y,...args);};window.KifuDialogs.confirm=async()=>true;});
 const sample1='(;SZ[19];B[aa])',sample2='(;SZ[19]AP[old]AP[new]'+ '(;B[]'.repeat(300)+')'.repeat(301);
 for(const sgf of [sample1,sample2])assert(await main.evaluate(t=>IndependentGo.loadSgf(t,'sample.sgf'),sgf));
 assert(await main.evaluate(()=>IndependentGo.loadSgf('(;SZ[19](;B[dd])(;B[pp]))','branches.sgf',0,{edited:true})));
 await main.locator('#tool').selectOption('TR',{force:true});
 await main.evaluate(()=>window.__drawLabels=[]);
 console.log('loaded SGFs and selected mark');const canvas=main.locator('#board');const box=await canvas.boundingBox();await canvas.click({position:{x:box.width*.5,y:box.height*.5}});
 await main.waitForTimeout(100);
 assert((await main.evaluate(()=>window.__drawLabels)).some(x=>x.t==='A'));

 await canvas.evaluate(e=>{e.style.setProperty('width','400px','important');e.style.setProperty('height','400px','important');});await main.waitForTimeout(200);const before=await main.evaluate(()=>window.__drawLabels.at(-1).font);
 await canvas.evaluate(e=>{e.style.setProperty('width','600px','important');e.style.setProperty('height','600px','important');});await main.waitForTimeout(250);
 const after=await main.evaluate(()=>window.__drawLabels.at(-1).font);assert(after>before,'variation text scales with the board');
 // Replace with the same variation and a mark at A's intersection.
 assert(await main.evaluate(()=>IndependentGo.loadSgf('(;SZ[19]TR[dd](;B[dd])(;B[pp]))','marked.sgf',0,{edited:true})));
 assert((await main.evaluate(()=>window.__drawLabels.slice(-2))).some(x=>x.t==='A'));
 await canvas.evaluate(e=>{e.style.removeProperty('width');e.style.removeProperty('height');});await main.waitForTimeout(250);
 await main.evaluate(()=>{document.querySelector('#tab-match').click();});
 await main.evaluate(async()=>{await IndependentGo.loadSgf('(;SZ[19])','empty.sgf');});
 console.log('opening free handicap');await main.locator('#match-kind').selectOption('free',{force:true});
 await main.waitForFunction(()=>GoSgf.parse(IndependentGo.peekAnalysisSnapshot().sgf).root.props.XIGFREEHANDICAP);
 await canvas.click({position:{x:box.width*.3,y:box.height*.3}});await canvas.click({position:{x:box.width*.7,y:box.height*.7}});
 console.log(await main.evaluate(()=>IndependentGo.peekAnalysisSnapshot().sgf));await main.waitForFunction(()=>GoSgf.parse(IndependentGo.peekAnalysisSnapshot().sgf).root.props.HA[0]==='2',null,{timeout:5000});
 assert.equal(await main.locator('#match-kind').inputValue(),'free');
 await main.locator('#match-black').selectOption('human',{force:true});await main.locator('#match-white').selectOption('human',{force:true});
 await main.locator('#match-start').evaluate(e=>e.click());
 await main.waitForFunction(()=>KifuMatch.locked);
 const free=await main.evaluate(()=>IndependentGo.peekAnalysisSnapshot());
 assert(free.sgf.includes('HA[2]'));assert(free.sgf.includes('PL[W]'));assert(free.sgf.includes('KM[0.5]'));
 await main.locator('#match-end').evaluate(e=>e.click());await main.waitForFunction(()=>!KifuMatch.locked);

 await main.evaluate(()=>{KifuAnalysisControl.setFieldsCollapsed(false);for(const [id,v]of Object.entries({'engine-exe':'mock.exe','engine-model':'mock.bin.gz','engine-name':'mock'}))document.getElementById(id).value=v;});
 for(const black of ['human','current']){
   await main.locator('#match-black').selectOption(black,{force:true});await main.locator('#match-white').selectOption('current',{force:true});
   const start=trace.length;await main.locator('#match-start').evaluate(e=>e.click());
   await main.waitForFunction(()=>KifuMatch.phase==='playing',null,{timeout:12000});
   assert(trace.slice(start).some(x=>String(x[1]).includes('set_free_handicap F14 O6')));
   await main.locator('#match-end').evaluate(e=>e.click());await main.waitForFunction(()=>!KifuMatch.locked);
 }
 console.log('Update97 import/variation/free handicap checks passed');
 assert.deepEqual(errors,[]);
 }finally{await browser?.close();server.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
