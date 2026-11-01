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
 browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/tmp/chromium90',args:['--no-sandbox','--disable-gpu','--disable-software-rasterizer','--use-gl=disabled','--single-process','--no-zygote']});
 const context=await browser.newContext({viewport:{width:1280,height:940}}),p=await context.newPage(),errors=[];context.on('page',q=>q.on('pageerror',e=>errors.push(e.message)));p.on('pageerror',e=>errors.push(e.message));p.setDefaultTimeout(10000);
 await p.goto('http://127.0.0.1:'+server.address().port);
 await p.evaluate(()=>{KifuDialogs.confirm=async()=>true;KifuAnalysisControl.setFieldsCollapsed(false);for(const [id,value]of Object.entries({'engine-exe':'mock.exe','engine-model':'model.bin.gz','engine-name':'解析専用AI'}))document.getElementById(id).value=value;});
 assert.equal(await p.locator('#estimate-open').isEnabled(),false);
 await p.evaluate(()=>IndependentGo.loadSgf('(;SZ[19];B[aa];W[bb])','test.sgf'));
 assert.equal(await p.locator('#estimate-open').isEnabled(),true);
 const opened=p.waitForEvent('popup');await p.locator('#estimate-open').click();const estimate=await opened;
 await estimate.waitForFunction(()=>document.getElementById('status').textContent.includes('推定完了'));assert.match(await estimate.locator('#status').textContent(),/解析専用AI/);
 assert(trace.some(([s,c])=>s==='main'&&c.includes('ownership true')));assert(!trace.some(([s])=>s==='black'||s==='white'));
 console.log('loaded record estimate with analysis engine OK');
 // Independent simple-mode inspector, graph and license entry.
 await p.evaluate(()=>KifuSimple.setMode(true));
 const win=p.waitForEvent('popup');await p.evaluate(()=>KifuSimple.openPanel('analysis'));const panel=await win;
 await panel.waitForSelector('#analyze-live');assert.equal(await panel.locator('#side-evaluation').isVisible(),true);
 await p.evaluate(()=>KifuSimple.openPanel('settings'));await panel.waitForSelector('#engine-profile-edit',{state:'attached'});
 await panel.locator('#engine-profiles-box').count().catch(()=>0); // Fields retain original controls.
 await p.evaluate(()=>KifuSimple.openPanel('graph'));await panel.waitForSelector('#graph-visible');await panel.locator('#graph-visible').uncheck();await p.waitForFunction(()=>!document.getElementById('graph-visible').checked);
 await panel.locator('#graph-visible').check();await p.waitForFunction(()=>document.getElementById('graph-visible').checked);
 await p.evaluate(()=>KifuSimple.openPanel('licenses'));await panel.waitForSelector('iframe');assert.match(await panel.locator('iframe').getAttribute('src'),/licenses/);
 console.log('independent panels and graph control OK');
 // Empty board and loaded-record score gating are shared by menu proxies.
 await p.evaluate(()=>document.getElementById('new').click());await p.waitForFunction(()=>!KifuEstimate.canScore());
 await p.locator('#simple-menu>details>summary').filter({hasText:'対局'}).evaluate(e=>e.click());
 assert.equal(await p.locator('#simple-menu>details[open] button').filter({hasText:'地合い計算'}).isEnabled(),false);
 await p.evaluate(()=>IndependentGo.loadSgf('(;SZ[19])','empty.sgf'));
 await p.waitForFunction(()=>KifuEstimate.canScore());
 assert.equal(await p.locator('#simple-menu>details[open] button').filter({hasText:'地合い計算'}).isEnabled(),true);
 // Human/human pauses and keeps board unchanged; both clocks/thinking stopped.
 await p.evaluate(()=>KifuSimple.openPanel('match'));await panel.waitForSelector('#match-start');
 await panel.locator('#match-white').selectOption('human');await p.waitForFunction(()=>document.getElementById('match-white').value==='human');
 await panel.locator('#match-start').click();await p.waitForFunction(()=>KifuMatch.phase==='playing');
 await p.locator('#simple-menu>details>summary').filter({hasText:'解析'}).evaluate(e=>e.click());assert.equal(await p.locator('#simple-menu>details[open]').count(),1);
 await p.locator('#simple-menu>details[open] button').filter({hasText:/^推定値$/}).click();await p.waitForFunction(()=>KifuMatch.phase==='paused');
 await estimate.waitForFunction(()=>document.getElementById('status').textContent.includes('推定完了'));assert.equal(await p.evaluate(()=>IndependentGo.getMove()),0);
 await panel.locator('#match-resume').click();await p.waitForFunction(()=>KifuMatch.phase==='playing');
 await panel.locator('#match-end').click();await p.waitForFunction(()=>KifuMatch.phase==='finished');
 console.log('human/human pause estimate resume OK');
 // AI/AI must stop both sessions before the main engine estimates.
 await p.evaluate(()=>{document.getElementById('match-black').value='current';document.getElementById('match-white').value='current';document.getElementById('match-start').click();});
 await p.waitForFunction(()=>KifuMatch.phase==='playing');const before=trace.length;
 await p.locator('#simple-menu>details>summary').filter({hasText:'解析'}).evaluate(e=>e.click());
 await p.locator('#simple-menu>details[open] button').filter({hasText:/^推定値$/}).click();
 await p.waitForFunction(()=>KifuMatch.phase==='paused');await estimate.waitForFunction(()=>document.getElementById('status').textContent.includes('推定完了'));
 const later=trace.slice(before),start=later.findIndex(([s,c])=>s==='main'&&c.includes('kata-analyze'));
 assert(start>0);for(const key of ['black','white'])assert(later.slice(0,start).some(([s,c])=>s===key&&c==='stop'));
 assert.equal(sessions.black.running,false);assert.equal(sessions.white.running,false);
 console.log('AI/AI both stopped before analysis query OK');
 
 await p.evaluate(()=>document.getElementById('match-end').click());await p.waitForFunction(()=>KifuMatch.phase==='finished');
 await p.evaluate(()=>{document.getElementById('match-black').value='current';document.getElementById('match-white').value='human';document.getElementById('match-start').click();});
 await p.waitForFunction(()=>KifuMatch.phase==='playing');
 await p.evaluate(()=>document.getElementById('estimate-open').click());await p.waitForFunction(()=>KifuMatch.phase==='paused');
 await estimate.waitForFunction(()=>document.getElementById('status').textContent.includes('推定完了'));
 assert.equal(sessions.black.running,false);assert.equal(await p.evaluate(()=>IndependentGo.getMove()),0);
 console.log('AI/human pause OK');
 await p.evaluate(()=>document.getElementById('match-end').click());await p.waitForFunction(()=>KifuMatch.phase==='finished');
 console.log('finish score test');await p.evaluate(()=>{IndependentGo.matchSaved(IndependentGo.peekAnalysisSnapshot());return IndependentGo.loadSgf('(;SZ[19];B[aa];W[bb])','final.sgf');});console.log('score record loaded');
 await p.evaluate(()=>Object.defineProperty(window,'documentPictureInPicture',{value:undefined,configurable:true}));const scorePopup=p.waitForEvent('popup');await p.evaluate(()=>document.getElementById('score').click());console.log('score clicked');const score=await scorePopup;console.log('score popup opened');await score.waitForSelector('#close');
 const heading=await score.locator('.score-window-heading').boundingBox(),close=await score.locator('#close').boundingBox();
 assert(close.x>heading.x+heading.width/2);assert(close.y<heading.y+heading.height);await score.locator('#close').click();await p.waitForFunction(()=>!document.body.classList.contains('scoring-mode'));
 console.log('score closed');await p.evaluate(()=>KifuSimple.setMode(false));console.log('normal mode');await p.evaluate(()=>{KifuWorkspace.activate('match');document.getElementById('match-settings').open=true;});
 for(const [width,height]of [[1280,940],[1280,740],[1600,940]]){await p.setViewportSize({width,height});assert.equal(await p.locator('#match-rules').evaluate(e=>e.getBoundingClientRect().height),26);}
 assert.deepEqual(errors,[]);console.log('update91 browser checks passed');
 
 }finally{await browser?.close();server.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
