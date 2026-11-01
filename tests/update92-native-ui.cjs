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
 browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/tmp/chromium92',args:['--no-sandbox','--disable-gpu','--disable-software-rasterizer','--use-gl=disabled','--single-process','--no-zygote']});
 const context=await browser.newContext({viewport:{width:1280,height:940}}),windows=new Map(),errors=[];
 context.setDefaultTimeout(12000);context.on('page',p=>p.on('pageerror',e=>errors.push(e.message)));let main;
 const address='http://127.0.0.1:'+server.address().port;
 await context.exposeBinding('nativeInvoke',async({page},command,args)=>{
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
 await main.evaluate(()=>{KifuDialogs.confirm=async()=>true;KifuAnalysisControl.setFieldsCollapsed(false);for(const [id,v]of Object.entries({'engine-exe':'mock.exe','engine-model':'mock.bin.gz','engine-name':'mock'}))document.getElementById(id).value=v;});
 await main.evaluate(()=>IndependentGo.loadSgf('(;SZ[19];B[aa])','record.sgf'));
 await main.locator('#simple-toggle').click();
 assert(await main.locator('#simple-estimate').isVisible());
 assert(await main.locator('#simple-estimate').isEnabled());
 await main.locator('#simple-menu>details>summary').filter({hasText:/^解析$/}).click();
 await main.getByRole('button',{name:'候補手・全局解析・グラフ',exact:true}).click();
 await main.waitForTimeout(300);const panel=windows.get('panel');assert(panel);
 await panel.waitForSelector('#analyze-live');assert(await panel.locator('#side-evaluation').isVisible());
 console.log('native independent panel ready via real mouse click');
 // Click a neighboring menu after its hover has opened it.
 await main.bringToFront();await main.locator('#simple-menu>details>summary').filter({hasText:/^表示$/}).click();
 await main.locator('#simple-menu>details>summary').filter({hasText:/^解析$/}).hover();
 await main.locator('#simple-menu>details>summary').filter({hasText:/^解析$/}).click();
 await main.getByRole('button',{name:'エンジン',exact:true}).click();
 await panel.waitForSelector('#engine-list-disclosure');
 await panel.locator('#engine-list-disclosure>summary').click();
 await panel.locator('#engine-name').waitFor({state:'visible'});
 const order=await panel.evaluate(()=>{const y=id=>document.getElementById(id).getBoundingClientRect().top;return [y('engine-profile-new'),y('engine-name'),y('engine-exe')];});
 assert(order[0]<order[1]&&order[1]<order[2],JSON.stringify(order));
 assert.equal(await panel.getByText('エンジン・接続の設定',{exact:true}).count(),0);
 await main.evaluate(()=>{document.getElementById('engine-profile-message').textContent='登録を読み込みました';});
 await panel.waitForFunction(()=>document.getElementById('engine-profile-message').textContent==='登録を読み込みました');
 await panel.locator('#floating-title').click();
 await main.waitForFunction(()=>!document.getElementById('engine-profile-message').textContent);
 console.log('engine field order and dismissible notice OK');
 // Storage tab never invokes save, both modes.
 await main.evaluate(()=>{window.saveCalls=0;GoExport.save=async()=>{saveCalls++;return false;};KifuSimple.setMode(false);});
 await main.locator('#tab-storage').click();assert.equal(await main.evaluate(()=>saveCalls),0);
 assert.equal(await main.getByText('棋譜と盤面の保存',{exact:true}).count(),0);
 assert.equal(await main.locator('#save').evaluate(e=>getComputedStyle(e).fontWeight),'700');
 await main.locator('#save').click();assert.equal(await main.evaluate(()=>saveCalls),1);
 // Ranking display limit uses actual renderer for both full analysis and match rankings.
 await main.evaluate(async()=>{
  IndependentGo.matchSaved(IndependentGo.peekAnalysisSnapshot());
  const moves=Array.from({length:30},(_,i)=>';'+(i%2?'W':'B')+'['+String.fromCharCode(97+i%19)+String.fromCharCode(97+Math.floor(i/19))+']').join('');
  await IndependentGo.loadSgf('(;SZ[19]'+moves+')','rank.sgf');
  const snap=IndependentGo.peekAnalysisSnapshot();
  window.rankingResults=Array.from({length:31},(_,index)=>({index,move:index,result:{rootInfo:{winrate:index%2?.4:.6,scoreLead:index%2?-2:2,visits:50},moveInfos:[]}}));
  window.rankArchive={format:'kifu-katago-analysis',version:1,perspective:'BLACK',snapshot:snap,rules:'japanese',analysisRun:{scope:'all',seconds:.1,started:Date.now()},results:rankingResults};
  for(const item of rankingResults)window.dispatchEvent(new CustomEvent('kifu-match-evaluation',{detail:{snapshot:snap,color:item.index%2?'W':'B',...item}}));
 });
 await main.locator('#analysis-file').setInputFiles({name:'rank.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(await main.evaluate(()=>rankArchive)))});
 await main.evaluate(()=>{KifuWorkspace.activate('analysis');document.getElementById('batch-disclosure').open=true;});
 for(const side of ['B','W']){
  await main.waitForFunction(side=>document.getElementById('worst-rows-'+side).rows.length>10,side);
  assert.equal(await main.locator('#worst-rows-'+side+' tr:not([hidden])').count(),10);
  const wrapper=main.locator('#worst-rows-'+side).locator('..').locator('..');
  await wrapper.locator('.ranking-more').click();
  assert((await main.locator('#worst-rows-'+side+' tr:not([hidden])').count())>10);
 }
 await main.evaluate(()=>{const snapshot=IndependentGo.peekAnalysisSnapshot();for(const item of rankingResults)window.dispatchEvent(new CustomEvent('kifu-match-evaluation',{detail:{snapshot,...item}}));KifuWorkspace.activate('match');document.getElementById('match-ranking').open=true;});
 for(const side of await main.locator('.match-ranking-side').all())assert.equal(await side.locator('tbody tr:not([hidden])').count(),10);
 assert.equal(await main.locator('#match-resign-threshold').inputValue(),'3.0');
 console.log('save behavior and both ranking lists OK');
 // Fresh board to avoid a record replacement question, then human match controlled entirely in simple mode.
 await main.evaluate(()=>{IndependentGo.matchSaved(IndependentGo.peekAnalysisSnapshot());document.getElementById('new').click();});
 await main.locator('#simple-toggle').click();
 await main.locator('#simple-menu>details>summary').filter({hasText:/^対局$/}).click();
 await main.getByRole('button',{name:'対局の設定・開始',exact:true}).click();
 await panel.waitForSelector('#match-start');await panel.locator('#match-white').selectOption('human');await panel.locator('#match-start').click();
 await main.waitForFunction(()=>KifuMatch.phase==='playing');
 assert(await main.locator('#simple-match-pause').isVisible());
 await main.locator('#simple-match-pause').click();await main.waitForFunction(()=>KifuMatch.phase==='paused');
 await main.locator('#simple-menu>details>summary').filter({hasText:/^対局$/}).click();
 await main.getByRole('button',{name:'対局を再開',exact:true}).click();await main.waitForFunction(()=>KifuMatch.phase==='playing');
 await main.locator('#simple-menu>details>summary').filter({hasText:/^解析$/}).click();
 await main.getByRole('button',{name:'形勢バー・グラフ',exact:true}).click();await panel.waitForSelector('#graph-visible');
 await main.locator('#simple-estimate').click();await main.waitForFunction(()=>KifuMatch.phase==='paused');
 await main.waitForTimeout(300);const estimate=windows.get('estimate');assert(estimate);await estimate.waitForFunction(()=>document.getElementById('status').textContent.includes('推定完了'));
 console.log('simple match pause/resume/menu/estimate without returning to normal OK');
 assert.deepEqual(errors,[]);console.log('update92 native-route UI checks passed (native OS simulated)');
 }finally{await browser?.close();server.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
