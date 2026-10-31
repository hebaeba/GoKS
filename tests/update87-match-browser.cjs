async function qlessNativeTest(page){return page.evaluate(async()=>{window.__TAURI_INTERNALS__={invoke:async()=>{throw '設定ファイルがありません';}};try{await KifuAnalysisControl.rawCall('start',{});return [false,''];}catch(e){return [e instanceof Error,e.message];}finally{delete window.__TAURI_INTERNALS__;}});}
const assert=require('node:assert/strict'),{chromium}=require('playwright'),http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../web');const server=http.createServer((req,res)=>{let p=path.join(root,decodeURIComponent(req.url.split('?')[0]));if(req.url==='/')p=path.join(root,'index.html');if(!p.startsWith(root)||!fs.existsSync(p)||!fs.statSync(p).isFile()){res.writeHead(404);res.end();return;}res.setHeader('Content-Type',p.endsWith('.js')?'application/javascript':p.endsWith('.css')?'text/css':'text/html; charset=utf-8');res.end(fs.readFileSync(p));});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;try{
 browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,headless:true,args:['--no-sandbox','--disable-gpu','--use-gl=disabled','--disable-software-rasterizer','--single-process','--no-zygote']});
 console.log('browser launched');const p=await browser.newPage({viewport:{width:1600,height:940}}),errors=[];p.setDefaultTimeout(8000);p.on('pageerror',e=>{errors.push(e.message);console.log('PAGEERROR',e.message)});console.log('page created');await p.goto('http://127.0.0.1:'+server.address().port);console.log('loaded');if(fs.existsSync('/workspace/scratch/b72cb62d57dc/work/NotoSansCJKjp-Regular.otf')){await p.addStyleTag({content:'@font-face{font-family:TestJP;src:url(data:font/otf;base64,'+fs.readFileSync('/workspace/scratch/b72cb62d57dc/work/NotoSansCJKjp-Regular.otf').toString('base64')+')}*{font-family:TestJP,sans-serif!important}'});await p.evaluate(()=>document.fonts.ready);}await p.locator('#tab-match').click();
 await p.locator('#match-white').selectOption('human');await p.locator('#match-black-name').fill('黒の人');await p.locator('#match-white-name').fill('白の人');
 console.log('HH start');await p.locator('#match-start').click();await p.waitForFunction(()=>KifuMatch.phase==='playing');assert.equal(await p.locator('#match-takeback').isEnabled(),false);
 await p.evaluate(()=>KifuMatch.humanMove(0));await p.evaluate(()=>KifuMatch.humanMove(1));assert.equal(await p.evaluate(()=>IndependentGo.getMove()),2);
 await p.evaluate(()=>KifuMatch.humanMove(0));assert.equal(await p.evaluate(()=>IndependentGo.getMove()),2);assert.match(await p.locator('#match-status').textContent(),/石のある/);
 console.log('takeback',await p.locator('#match-status').textContent());await p.locator('#match-takeback').click();await p.waitForFunction(()=>KifuMatch.phase==='playing'&&IndependentGo.getMove()===1);await p.evaluate(()=>KifuMatch.humanMove(2));
 assert.match(await p.evaluate(()=>IndependentGo.getSgf()),/B\[aa\];W\[ca\]/);assert.doesNotMatch(await p.evaluate(()=>IndependentGo.getSgf()),/W\[ba\]/);
 await p.locator('#match-settings>summary').click();
 for(const [width,height]of [[1280,940],[1280,740],[1600,940]]){await p.setViewportSize({width,height});assert.equal(await p.locator('#match-takeback').evaluate(e=>e.getBoundingClientRect().height),26);assert.equal(await p.locator('#match-rules').evaluate(e=>e.getBoundingClientRect().height),26);}
 await p.locator('#match-pass').click();await p.locator('#match-pass').click();await p.waitForFunction(()=>KifuMatch.phase==='finished');assert.equal(await p.locator('#match-score').textContent(),'地合い計算');assert.match(await p.locator('#match-sgf').inputValue(),/PB\[黒の人\]/);
 assert.deepEqual(await qlessNativeTest(p),[true,'設定ファイルがありません']);
 // An actual GTP Bridge with a mock transport exercises stop/reject and stale replies during takeback.
 await p.evaluate(async()=>{KifuDialogs.confirm=async()=>true;IndependentGo.matchSaved(IndependentGo.peekAnalysisSnapshot());await IndependentGo.loadSgf('(;SZ[19]KM[6.5])','test.sgf',0);window.sessions={};window.trace=[];window.hold=false;window.releaseLate=null;window.engineStarts=0;

 KifuAnalysisControl.profiles=()=>[{id:'test',name:'Test AI',exe:'test.exe',model:'test.gz',config:'test.cfg'}];
 KifuAnalysisControl.rawCall=async(action,payload)=>{const id=payload.session||'main';if(action==='start'){engineStarts++;sessions[id]={events:[],running:true};return{};}const s=sessions[id];if(action==='stop'){if(s)s.running=false;return{};}if(action==='poll'){return{events:s?.events.splice(0)||[],logs:[]};}if(action==='send'){for(const line of payload.commands){trace.push(line);const [,n,cmd]=/^(\d+) (.*)$/.exec(line);let result='';if(cmd==='name')result='KataGo mock';else if(cmd==='list_commands')result='kata-genmove_analyze kata-set-param kata-set-rules set_position set_free_handicap';else if(cmd.startsWith('kata-genmove_analyze'))result='rootInfo winrate 0.5 scoreLead 0 visits 10\nplay E4';const reply=()=>{s.events.push(...('='+n+' '+result+'\n').split('\n').map(line=>({type:'gtp',line})));};if(cmd.startsWith('kata-genmove_analyze')&&hold)releaseLate=reply;else reply();}return{};}throw Error(action);};
 window.dispatchEvent(new Event('kifu-engine-profiles'));});
 console.log('AI start');await p.locator('#match-white').selectOption('test');await p.locator('#match-start').click();await p.waitForFunction(()=>KifuMatch.phase==='playing'&&!document.getElementById('match-pass').disabled);
 await p.evaluate(()=>KifuMatch.humanMove(0));await p.waitForFunction(()=>IndependentGo.getMove()===2&&!document.getElementById('match-pass').disabled);
 console.log('takeback',await p.locator('#match-status').textContent());await p.locator('#match-takeback').click();await p.waitForFunction(()=>KifuMatch.phase==='playing'&&IndependentGo.getMove()===0&&!document.getElementById('match-pass').disabled);
 assert.doesNotMatch(await p.evaluate(()=>IndependentGo.getSgf()),/;[BW]\[/);
 await p.evaluate(()=>{hold=true;KifuMatch.humanMove(1);});await p.waitForFunction(()=>!!releaseLate);assert.equal(await p.evaluate(()=>IndependentGo.getMove()),1);
 console.log('takeback',await p.locator('#match-status').textContent());await p.locator('#match-takeback').click();await p.waitForFunction(()=>KifuMatch.phase==='playing'&&IndependentGo.getMove()===0&&!document.getElementById('match-pass').disabled);await p.evaluate(()=>releaseLate());await p.waitForTimeout(150);assert.equal(await p.evaluate(()=>IndependentGo.getMove()),0);
 const q=await browser.newPage({viewport:{width:1280,height:940}});q.on('pageerror',e=>errors.push(e.message));await q.goto('http://127.0.0.1:'+server.address().port);await q.locator('#tab-match').click();await q.locator('#match-white').selectOption('human');await q.locator('#match-start').click();await q.waitForFunction(()=>KifuMatch.phase==='playing');
 for(const point of [1,20,19,null,21,null,39])await q.evaluate(point=>KifuMatch.humanMove(point),point);
 assert.equal(await q.locator('#black-captures').textContent(),'1');await q.locator('#match-takeback').click();await q.waitForFunction(()=>KifuMatch.phase==='playing'&&IndependentGo.getMove()===6);assert.equal(await q.locator('#black-captures').textContent(),'0');assert.equal(await q.evaluate(()=>KifuAnalysis.positionAt(IndependentGo.peekAnalysisSnapshot()).state.board[20]),2);


 console.log('retry test');
 // Starting failure must be readable and must not leave the start latch stuck.
 await p.locator('#match-pause').click();console.log('paused',await p.evaluate(()=>KifuMatch.phase));
 await p.evaluate(async()=>{IndependentGo.matchSaved(IndependentGo.peekAnalysisSnapshot());await IndependentGo.loadSgf('(;SZ[19]KM[6.5])','retry.sgf',0);window.goodCall=KifuAnalysisControl.rawCall;window.failOnce=true;KifuAnalysisControl.rawCall=async(a,v)=>{if(a==='start'&&failOnce){failOnce=false;throw 'モデルファイルがありません：test.gz';}return goodCall(a,v);};});
 console.log('failure start');await p.locator('#match-start').click();await p.waitForFunction(()=>KifuMatch.phase==='paused');console.log('failure observed');
 assert.match(await p.locator('#match-status').textContent(),/モデルファイルがありません/);
 await p.locator('#match-start').click();await p.waitForFunction(()=>KifuMatch.phase==='playing');
 await p.locator('#match-pause').click();
 console.log('AI-AI test');
 // Both AI sessions advance, and handicap is communicated as setup rather than moves.
 await p.evaluate(async()=>{IndependentGo.matchSaved(IndependentGo.peekAnalysisSnapshot());await IndependentGo.loadSgf('(;SZ[19]KM[6.5])','ai.sgf',0);hold=false;KifuAnalysisControl.rawCall=async(a,v)=>{if(a==='send'){const id=v.session,s=sessions[id];for(const line of v.commands){if(!line.includes('kata-genmove_analyze')){await goodCall(a,{...v,commands:[line]});continue;}trace.push(line);const n=line.split(' ')[0];s.moves=(s.moves||0)+1;const move=s.moves===1?(id==='black'?'D4':'Q16'):'pass';s.events.push(...('='+n+' rootInfo winrate 0.5 scoreLead 0 visits 10\nplay '+move+'\n').split('\n').map(line=>({type:'gtp',line})));}return{};}return goodCall(a,v);};});
 await p.locator('#match-black').selectOption('test');await p.locator('#match-white').selectOption('test');
 await p.locator('#match-start').click();await p.waitForFunction(()=>KifuMatch.phase==='finished');assert.equal(await p.evaluate(()=>IndependentGo.getMove()),4);
 await p.evaluate(async()=>{IndependentGo.matchSaved(IndependentGo.peekAnalysisSnapshot());await IndependentGo.loadSgf('(;SZ[19]KM[6.5])','handicap.sgf',0);trace=[];hold=false;KifuAnalysisControl.rawCall=goodCall;});
 await p.locator('#match-black').selectOption('human');await p.locator('#match-kind').selectOption('handicap');await p.locator('#match-handicap').selectOption('2');
 await p.locator('#match-start').click();await p.waitForFunction(()=>KifuMatch.phase==='playing'&&IndependentGo.getMove()===1);
 assert.ok(await p.evaluate(()=>trace.some(x=>x.includes('set_free_handicap'))));
 assert.match(await p.evaluate(()=>IndependentGo.getSgf()),/HA\[2\]/);await p.locator('#match-pause').click();
 console.log('UI test');
 // Analysis controls belong only to the analysis menu; rule text stays beside komi.
 await p.evaluate(async()=>{IndependentGo.matchSaved(IndependentGo.peekAnalysisSnapshot());await IndependentGo.loadSgf('(;SZ[19]KM[99.5]RU[Chinese])','rule.sgf',0);});
 for(const [width,height]of [[1280,940],[1280,740],[1600,940]]){await p.setViewportSize({width,height});
  for(const tab of ['analysis','match','record','storage','settings']){await p.locator('#tab-'+tab).click();assert.equal(await p.locator('.analysis-primary').isVisible(),tab==='analysis');}
  assert.equal(await p.locator('#board-rule').textContent(),'中国ルール');
  assert.ok(await p.locator('#komi-input').evaluate(e=>e.getBoundingClientRect().width<75));
 }
 await p.locator('#tab-analysis').click();await p.locator('#analysis-rules').selectOption('japanese');assert.equal(await p.locator('#board-rule').textContent(),'日本ルール');

 await p.evaluate(async()=>{IndependentGo.matchSaved(IndependentGo.peekAnalysisSnapshot());await IndependentGo.loadSgf('(;SZ[19]KM[6.5]RU[Japanese];B[aa];W[bb];B[cc];W[dd])','ranking.sgf');});
 const archive=await p.evaluate(()=>({format:'kifu-katago-analysis',version:1,perspective:'BLACK',snapshot:IndependentGo.peekAnalysisSnapshot(),rules:'japanese',analysisRun:{scope:'all',seconds:0.1,started:Date.now()},results:[.6,.4,.7,.3,.8].map((winrate,index)=>({index,result:{rootInfo:{winrate,scoreLead:winrate*20-10,visits:500},moveInfos:[]}}))}));
 await p.locator('#analysis-file').setInputFiles({name:'ranking.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(archive))});
 await p.waitForFunction(()=>document.getElementById('worst-rows-B').children.length===2);await p.locator('#batch-disclosure').evaluate(e=>e.open=true);
 assert.deepEqual(await p.locator('#worst-rows-B tr').first().locator('td').allTextContents(),['1.','3','8.0','40.0']);
 for(const [width,height]of [[1280,940],[1280,740],[1600,940]]){await p.setViewportSize({width,height});
  const sides=await p.locator('#analysis-worst .worst-side').evaluateAll(es=>es.map(e=>({x:e.getBoundingClientRect().x,y:e.getBoundingClientRect().y,width:e.getBoundingClientRect().width})));assert.equal(sides[0].y,sides[1].y);assert.ok(sides[1].x>sides[0].x+sides[0].width);
  const pair=await p.evaluate(()=>{const a=document.getElementById('board-rule').getBoundingClientRect(),b=document.getElementById('komi-input').getBoundingClientRect();return[a.x+a.width,b.x,a.y,b.y];});assert.ok(pair[0]<pair[1]);assert.ok(Math.abs(pair[2]-pair[3])<10);
 }
 await p.screenshot({path:'/tmp/update87-layout.png'});
 assert.deepEqual(errors,[]);console.log('update87: human/human, local legality, SGF, takeback/reply/thinking cancellation, late response rejection and desktop field metrics OK');
 }finally{if(browser)await browser.close();server.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
