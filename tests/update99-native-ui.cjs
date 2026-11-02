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
 const original=await main.evaluate(()=>IndependentGo.peekAnalysisSnapshot().sgf);
 await main.locator('[data-language-choice=en]').click();
 await main.waitForFunction(()=>document.documentElement.lang==='en');
 assert.equal(await main.locator('#simple-toggle').textContent(),'Simple View');
 assert.equal(await main.locator('#analysis-rules').inputValue(),'japanese');
 assert.equal(await main.evaluate(()=>IndependentGo.peekAnalysisSnapshot().sgf),original);
 await main.locator('#analysis-rules').selectOption('chinese');
 await main.locator('[data-language-choice=ja]').click();
 await main.waitForFunction(()=>document.getElementById('board-rule').textContent.includes('中国'));
 await main.locator('#analysis-rules').selectOption('japanese');
 await main.locator('[data-language-choice=en]').click();
 for(const [width,height] of [[1280,940],[1280,740],[1600,940]]){
  await main.setViewportSize({width,height});await main.waitForTimeout(250);
  assert(await main.locator('[data-language-choice=en]').isVisible());
  assert(await main.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 }
 await main.screenshot({path:'/tmp/update94-english.png',fullPage:true});
 await main.reload();await main.waitForFunction(()=>document.documentElement.lang==='en');
 await main.locator('[data-language-choice=ja]').click();
 console.log('live language switch, rule values, persistence and three viewport widths OK');
 
 await main.evaluate(()=>{KifuDialogs.confirm=async()=>true;KifuAnalysisControl.setFieldsCollapsed(false);for(const [id,v]of Object.entries({'engine-exe':'mock.exe','engine-model':'mock.bin.gz','engine-name':'mock'}))document.getElementById(id).value=v;});
 await main.evaluate(()=>IndependentGo.loadSgf('(;SZ[19];B[aa])','record.sgf'));
 await main.locator('#simple-toggle').click();
 assert.equal(await main.locator('#simple-estimate').count(),0);
 await main.locator('#simple-menu>details>summary').filter({hasText:/^解析$/}).click();
 await main.getByRole('button',{name:'候補手・全局解析・グラフ',exact:true}).click();
 await main.waitForTimeout(300);const panel=windows.get('panel');assert(panel);
 await panel.waitForSelector('#analyze-live');assert(await panel.locator('#side-evaluation').isVisible());
 assert.equal(await main.locator('.inspector').isVisible(),false);
 await main.evaluate(()=>document.body.classList.add('simple-panel-open'));
 assert.equal(await main.locator('.inspector').isVisible(),false);
 await panel.locator('#floating-title').hover();await panel.mouse.down();await panel.mouse.up();
 assert(trace.some(e=>e[0]==='native-panel-drag'));
 assert(await panel.locator('#side-eval-graph').isVisible());
 await main.evaluate(()=>KifuI18n.set('en'));
 await panel.waitForFunction(()=>document.documentElement.lang==='en');
 await panel.waitForFunction(()=>document.getElementById('analyze-live').textContent==='Start Analysis');
 await panel.screenshot({path:'/tmp/update94-panel-english.png'});
 await main.evaluate(()=>KifuI18n.set('ja'));
 await panel.waitForFunction(()=>document.getElementById('analyze-live').textContent==='解析を開始');
 console.log('independent window language synchronization, native drag and graph OK');
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
 await main.evaluate(()=>document.getElementById('estimate-open').click());await main.waitForFunction(()=>KifuMatch.phase==='paused');
 await main.waitForTimeout(300);const estimate=windows.get('estimate');assert(estimate);await estimate.waitForFunction(()=>document.getElementById('status').textContent.includes('推定完了'));
 console.log('simple match pause/resume/menu/estimate without returning to normal OK');
 await main.evaluate(()=>KifuI18n.set('en'));await estimate.waitForFunction(()=>document.documentElement.lang==='en');
 await main.evaluate(()=>document.getElementById('workspace-image-open').click());await main.waitForTimeout(300);
 const image=windows.get('image');assert(image);await image.waitForSelector('#image-board-title');await image.waitForFunction(()=>document.documentElement.lang==='en');assert.equal(await image.locator('#image-board-title').textContent(),'Import Position from Image');
 assert(!/[ぁ-龯]/.test(await image.locator('body').innerText()),await image.locator('body').innerText());await image.close();
 await main.evaluate(async()=>{document.getElementById('match-end').click();});await main.waitForFunction(()=>KifuMatch.phase==='finished');
 await main.evaluate(async()=>{IndependentGo.matchSaved(IndependentGo.peekAnalysisSnapshot());await IndependentGo.loadSgf('(;SZ[19];B[aa])','score.sgf');document.getElementById('score').click();});
 await main.waitForTimeout(400);const score=windows.get('score');assert(score);await score.waitForSelector('#formulas');await score.waitForTimeout(200);
 assert(!/[ぁ-龯]/.test(await score.locator('body').innerText()),await score.locator('body').innerText());
 await score.close();
 await main.evaluate(()=>{KifuSimple.setMode(false);KifuWorkspace.activate('analysis');const s=IndependentGo.peekAnalysisSnapshot();window.candidateArchive={format:'kifu-katago-analysis',version:1,perspective:'BLACK',snapshot:s,rules:'japanese',results:[{index:s.index,move:1,result:{rootInfo:{winrate:.6,scoreLead:2,visits:100},moveInfos:Array.from({length:14},(_,i)=>({move:'BCDEFGHJKLMNOPQ'.charAt(i)+'2',winrate:.6,scoreLead:2,visits:100-i,pv:[],order:i}))}}]};});
 await main.locator('#analysis-file').setInputFiles({name:'candidates.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(await main.evaluate(()=>candidateArchive)))});
 await main.evaluate(()=>document.getElementById('candidate-list').open=true);
 await main.waitForFunction(()=>document.querySelectorAll('#analysis-candidates tr').length===14);
 assert.equal(await main.locator('#analysis-candidates tr:not([hidden])').count(),10);
 const more=main.locator('button[aria-controls="analysis-candidates"]');await more.click();assert.equal(await main.locator('#analysis-candidates tr:not([hidden])').count(),14);await more.click();assert.equal(await main.locator('#analysis-candidates tr:not([hidden])').count(),10);
 await main.evaluate(()=>document.getElementById('print').click());await main.waitForSelector('#print-preview[open]');assert(!/[ぁ-龯]/.test(await main.locator('#print-preview').innerText()));await main.locator('#print-close').click();
 console.log('English score/print windows and candidate 10-row fold OK');

 // Full-game pause preserves completed positions and restarts only the unfinished query.
 await main.evaluate(async()=>{await IndependentGo.loadSgf('(;SZ[19];B[aa];W[bb];B[cc];W[dd];B[ee];W[ff];B[gg];W[hh])','batch.sgf');KifuWorkspace.activate('analysis');document.getElementById('batch-disclosure').open=true;document.getElementById('analysis-seconds').value='0.5';});
 await main.locator('#analyze-all').click();
 await main.waitForFunction(()=>document.getElementById('analysis-progress').value>=2);
 await main.locator('#analysis-batch-pause').click();
 await main.waitForFunction(()=>document.getElementById('analysis-batch-pause').textContent==='Resume');
 const beforePause=await main.locator('#analysis-progress').evaluate(e=>e.value),sent=trace.filter(e=>e[1]?.startsWith('')&&e[1].includes('kata-analyze ')).length;
 await main.waitForTimeout(900);
 assert.equal(await main.locator('#analysis-progress').evaluate(e=>e.value),beforePause);
 assert.equal(trace.filter(e=>e[1]?.includes('kata-analyze ')).length,sent);
 await main.locator('#analysis-batch-pause').click();
 await main.waitForFunction(()=>document.getElementById('batch-progress').dataset.state==='complete');
 assert.equal(await main.locator('#analysis-progress').evaluate(e=>e.value),9);
 assert(!/[ぁ-龯]/.test(await main.locator('#analysis-status').textContent()));
 assert.equal(await main.locator('#analysis-batch-pause').isVisible(),false);
 // Full ranking headers must not overlap at the supported compact widths.
 for(const width of [1280,1600]){await main.setViewportSize({width,height:940});await main.waitForTimeout(150);
  assert(await main.locator('#analysis-worst').evaluate(e=>[...e.querySelectorAll('th')].every(th=>{const r=document.createRange();r.selectNodeContents(th);const b=r.getBoundingClientRect(),c=th.getBoundingClientRect();return b.left>=c.left-1&&b.right<=c.right+1;})));
 }
 // The same control works through the separate simple-view window.
 await main.evaluate(()=>{KifuSimple.setMode(true);KifuPanelWindow.open('analysis');});
 await panel.waitForSelector('#analysis-batch-pause',{state:'attached'});
 await panel.evaluate(()=>document.getElementById('batch-disclosure').open=true);
 await panel.locator('#analyze-all').click();await main.waitForFunction(()=>document.getElementById('analysis-progress').value>=1);
 await panel.locator('#analysis-batch-pause').click();await panel.waitForFunction(()=>document.getElementById('analysis-batch-pause').textContent==='Resume');
 await panel.locator('#analysis-batch-pause').click();await main.waitForFunction(()=>document.getElementById('batch-progress').dataset.state==='complete');
 // New records must invalidate a paused job, never append its late results.
 await panel.locator('#analyze-all').click();await main.waitForFunction(()=>!document.getElementById('analysis-batch-pause').hidden);
 await panel.locator('#analysis-batch-pause').click();
 await main.evaluate(()=>IndependentGo.loadSgf('(;SZ[9];B[dd])','replacement.sgf'));
 await main.waitForFunction(()=>document.getElementById('analysis-batch-pause').hidden);
 assert.equal(await main.locator('#analysis-progress').evaluate(e=>e.value),0);
 await main.evaluate(()=>{KifuSimple.setMode(false);KifuWorkspace.activate('storage');document.getElementById('gif-options').open=true;document.getElementById('gif-start').value='0';document.getElementById('gif-end').value='1';});
 await main.locator('#gif-create').click();await main.waitForFunction(()=>document.getElementById('gif-status').textContent.includes('Ready to save'));
 assert(!/[ぁ-龯]/.test(await main.locator('#gif-status').textContent()));
 await main.evaluate(()=>KifuI18n.set('ja'));await main.waitForFunction(()=>document.getElementById('gif-status').textContent.includes('保存できます'));
 await main.evaluate(()=>KifuI18n.set('en'));await main.waitForFunction(()=>document.getElementById('gif-status').textContent.includes('Ready to save'));
 console.log('batch pause/resume, progress preservation, separate window, invalidation and English ranking widths OK');

 noResults=true;
 await main.evaluate(()=>{KifuWorkspace.activate('analysis');document.getElementById('analysis-seconds').value='0.1';document.getElementById('batch-disclosure').open=true;document.getElementById('analyze-all').click();});
 await main.evaluate(()=>document.getElementById('batch-disclosure').open=false);
 await main.waitForFunction(()=>document.getElementById('analysis-status').textContent.startsWith('Analysis error:'));
 assert(await main.locator('#analysis-status').isVisible());
 assert(!/[ぁ-龯]/.test(await main.locator('#analysis-status').textContent()));
 await main.evaluate(()=>KifuI18n.set('ja'));assert((await main.locator('#analysis-status').textContent()).includes('解析結果を取得できませんでした'));
 console.log('Missing-result warning is visible even when Full Game Analysis was collapsed, in both languages');
 // Audit every retained DOM text/attribute, including hidden controls, after a full language round trip.
 for(const page of [main,...windows.values()]){if(page.isClosed())continue;
  await page.evaluate(()=>KifuI18n.set('ja'));await page.waitForTimeout(100);
  await page.evaluate(()=>{window.auditNodes=[];window.auditAttrs=[];const w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let n;while(n=w.nextNode()){if(n.parentElement.closest('script,style'))continue;window.auditNodes.push([n,n.data]);}for(const e of document.querySelectorAll('[title],[placeholder],[aria-label],[alt]'))for(const k of ['title','placeholder','aria-label','alt'])if(e.hasAttribute(k))window.auditAttrs.push([e,k,e.getAttribute(k)]);});
  await page.evaluate(()=>KifuI18n.set('en'));await page.waitForTimeout(100);
  const leaks=await page.evaluate(()=>{const w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT),out=[];let n;while(n=w.nextNode()){const e=n.parentElement;if(e.closest('script,style,[data-no-i18n],textarea,code,.game-title,#simple-title,#comment,#metadata dd,#engine-profile,#engine-order,#match-black,#match-white'))continue;if(/[ぁ-龯]/.test(n.data))out.push([e.id||e.tagName,n.data]);}for(const e of document.querySelectorAll('[title],[placeholder],[aria-label],[alt]')){if(e.closest('[data-no-i18n],.game-title,#simple-title'))continue;for(const a of ['title','placeholder','aria-label','alt']){const v=e.getAttribute(a);if(/[ぁ-龯]/.test(v||''))out.push([e.id||e.tagName,a,v]);}}return out;});assert.deepEqual(leaks,[],page.url());
  await page.evaluate(()=>KifuI18n.set('ja'));await page.waitForTimeout(100);
  const changed=await page.evaluate(()=>[...auditNodes.filter(([n,s])=>n.isConnected&&n.data!==s).map(([n,s])=>[n.parentElement.id,s,n.data]),...auditAttrs.filter(([e,k,v])=>e.isConnected&&e.getAttribute(k)!==v).map(([e,k,v])=>[e.id,k,v,e.getAttribute(k)])]);assert.deepEqual(changed,[],page.url());
 }
 console.log('All retained UI strings/attributes returned to Japanese; English UI contains no Japanese leaks');
 assert.deepEqual(errors,[]);console.log('update99 native-route UI checks passed (native OS simulated)');

 }finally{await browser?.close();server.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
