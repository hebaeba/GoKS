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
 res.setHeader('Content-Type',p.endsWith('.svg')?'image/svg+xml':p.endsWith('.js')?'application/javascript':p.endsWith('.css')?'text/css':'text/html; charset=utf-8');
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
 await context.addInitScript(()=>{window.BroadcastChannel=undefined;window.__TAURI_INTERNALS__={invoke:(...args)=>window.nativeInvoke(...args)};});
 main=await context.newPage();await main.goto(address);
 await main.waitForSelector('[data-language-choice=en]');
 await main.evaluate(()=>KifuI18n.set('en'));
 // Update101: native IPC must work with BroadcastChannel unavailable.
 await main.evaluate(()=>KifuAppearance.open());
 const prefs=windows.get('appearance');await prefs.waitForSelector('#appearance-installed-font option[value="Yu Gothic"]',{state:'attached'});
 await prefs.locator('#appearance-installed-font').selectOption('Yu Gothic');
 await prefs.locator('select').first().selectOption('large');
 await prefs.getByRole('button',{name:'Apply',exact:true}).click();
 await prefs.waitForFunction(()=>document.querySelector('#appearance-error').textContent==='Settings saved.');
 assert(!prefs.isClosed());await main.evaluate(()=>KifuAppearance.open());assert.equal(await main.evaluate(()=>KifuAppearance.settings.en.font),'Yu Gothic');
 await prefs.locator('#appearance-font-name').fill('Arial');await prefs.locator('#appearance-font-name').press('Enter');
 await main.waitForFunction(()=>KifuAppearance.settings.en.font==='Arial');
 await prefs.getByRole('button',{name:'Revert',exact:true}).click();
 await main.waitForFunction(()=>KifuAppearance.settings.en.font==='Yu Gothic');assert(!prefs.isClosed());
 await prefs.getByRole('button',{name:'Board / Background',exact:true}).click();
 for(const kind of ['gradient','flat','image']){await prefs.locator('select').filter({has:prefs.locator('option[value=gradient]')}).selectOption(kind);assert.equal(await prefs.locator('.stone-preset').count(),6);await prefs.locator('.stone-preset').nth(2).click();await prefs.locator('.stone-preset').nth(4).click();}
 await prefs.getByRole('button',{name:'Apply',exact:true}).click();await prefs.waitForFunction(()=>document.querySelector('#appearance-error').textContent==='Settings saved.');
 await prefs.waitForTimeout(300);const rendered=await prefs.locator('.stone-preset canvas').evaluateAll(es=>es.map(c=>c.toDataURL()));assert.equal(new Set(rendered).size,6);assert.equal(await main.evaluate(()=>KifuAppearance.settings.blackPreset),'gloss');assert.equal(await main.evaluate(()=>KifuAppearance.settings.whitePreset),'soft');
 await prefs.screenshot({path:'/tmp/gks101-appearance.png'});await prefs.getByRole('button',{name:'Close',exact:true}).click();
 await main.evaluate(()=>{localStorage.removeItem('gokifu-appearance-v1');KifuAppearance.apply(KifuAppearanceCore.defaults());});
 assert(await main.locator('#board-sidebar #appearance-open').isVisible());assert(await main.locator('#board-sidebar #shortcuts-open').isVisible());assert(!await main.locator('#inspector-toggle').isVisible());
 await main.evaluate(()=>{localStorage.setItem('kifu-engine-profiles-v1',JSON.stringify(['one','two','three'].map(id=>({id,name:id,kind:'katago',exe:id+'.exe',model:'model.bin.gz',config:'test.cfg'}))));localStorage.setItem('gokifu-startup-engine-v1','two');});
 await main.reload();await main.waitForSelector('#engine-order input[value="two"]',{state:'attached'});await main.waitForFunction(()=>document.querySelector('#engine-active-name').textContent==='two');
 await main.evaluate(()=>{document.getElementById('tab-settings').click();});
 await main.locator('#engine-profiles-details').evaluate(e=>e.open=true).catch(()=>{});
 await main.locator('#engine-order [data-id="three"] button').evaluate(e=>e.click());
 assert.equal(await main.locator('#engine-order button').count(),3);
 await main.locator('#engine-order-up').evaluate(e=>e.click());
 assert.deepEqual(await main.locator('#engine-order .engine-order-row').evaluateAll(es=>es.map(e=>e.dataset.id)),['one','three','two']);
 await main.locator('#engine-order input[value="three"]').evaluate(e=>e.click());
 assert.equal(await main.evaluate(()=>localStorage.getItem('gokifu-startup-engine-v1')),'three');
 await main.reload();await main.waitForFunction(()=>document.querySelector('#engine-active-name').textContent==='three');
 await main.evaluate(()=>localStorage.setItem('gokifu-startup-engine-v1','deleted'));
 await main.reload();await main.waitForFunction(()=>document.querySelector('#engine-error').textContent.includes('startup engine was not found'));
 await main.locator('#simple-toggle').click();await main.locator('#simple-menu summary').filter({hasText:/^Edit$/}).click();
 const boxes=await main.evaluate(()=>['numbers','next'].map(id=>{const r=document.getElementById(id).getBoundingClientRect();return {top:r.top,bottom:r.bottom,left:r.left,right:r.right};}));assert(boxes[0].top>=boxes[1].bottom||boxes[0].bottom<=boxes[1].top||boxes[0].left>=boxes[1].right||boxes[0].right<=boxes[1].left,JSON.stringify(boxes));
 await main.screenshot({path:'/tmp/gks101-simple.png'});await main.locator('#simple-return').click();
 console.log('Update101: native preview/save/revert without BroadcastChannel, installed/manual fonts, 18 stone presets, shared engine ordering, startup persistence/missing warning and simple overlap PASS');
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
 assert.deepEqual(errors,[]);console.log('update101 native-route UI checks passed (native OS simulated)');

 }finally{await browser?.close();server.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
