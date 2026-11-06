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


 const C=require('../web/appearance-core.js'),key='gokifu-appearance-v1';
 const baseline=C.clean({...C.defaults(),ja:{size:'large',font:'Arial'},en:{size:'small',font:'Arial'},theme:'night',...C.themes.night,stone:'flat',boardText:1.2,lineWidth:4,lineStyle:'dash',sound:'low',volume:70,navigation:true});
 for(const [index,size]of [{width:1280,height:940},{width:1280,height:740},{width:1600,height:940}].entries())for(const lang of ['ja','en']){
  await main.setViewportSize(size);await main.evaluate(({lang,index})=>{KifuI18n.set(lang);KifuSimple.setMode(index===1);},{lang,index});
  for(const [tab,ja,en]of [['text','文字','Text'],['board','碁盤・背景','Board / Background'],['graph','グラフ','Graph'],['audio','石音','Sound']]){
   await main.evaluate(({key,baseline})=>{localStorage.setItem(key,JSON.stringify(baseline));KifuAppearance.apply(baseline);},{key,baseline});
   await main.evaluate(()=>KifuAppearance.open());const a=windows.get('appearance');await a.waitForSelector('[data-appearance-editor]');
   await a.getByRole('button',{name:lang==='ja'?ja:en,exact:true}).click();
   const reset=()=>a.getByRole('button',{name:lang==='ja'?'標準に戻す':'Reset defaults',exact:true}).click();
   await reset();await main.waitForTimeout(80);
   assert.deepEqual(await main.evaluate(()=>KifuAppearance.settings),C.resetSection(baseline,tab,lang));
   await a.getByRole('button',{name:lang==='ja'?'元に戻す':'Revert',exact:true}).click();await main.waitForTimeout(80);
   assert.deepEqual(await main.evaluate(()=>KifuAppearance.settings),baseline);
   await reset();await a.getByRole('button',{name:lang==='ja'?'適用':'Apply',exact:true}).click();
   await a.waitForFunction(()=>document.getElementById('appearance-error').dataset.success==='true');
   assert.deepEqual(await main.evaluate(key=>JSON.parse(localStorage.getItem(key)),key),C.resetSection(baseline,tab,lang));
   assert.equal(a.isClosed(),false);
   await a.getByRole('button',{name:lang==='ja'?'閉じる':'Close',exact:true}).click();await main.waitForTimeout(80);
  }
 }
 const about=await context.newPage();
 for(const [file,title]of [['README.html','対局時計'],['README-en.html','Game clock']]){
  await about.goto(address+'/'+file);await about.getByRole('heading',{name:title,exact:true}).waitFor();
 }
 assert.deepEqual(errors,[]);
 console.log('PASS: every tab reset preserves other saved settings; preview/revert/apply/close; Japanese/English; normal/simple; three viewport sizes; both About pages include clock');
 }finally{await browser?.close();server.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
