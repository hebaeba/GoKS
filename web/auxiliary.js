/* Native utility windows. No editor or engine is started in a child window. */
(()=>{'use strict';
const invoke=()=>window.__TAURI_INTERNALS__?.invoke;
const params=new URLSearchParams(location.search),kind=params.get('kind'),id=params.get('id');
const errorText=e=>e?.message||String(e||'補助窓の操作に失敗しました');
function native(action,kind,payload={}){if(!invoke())return Promise.reject(Error('この機能はWindowsアプリで利用できます。'));return invoke()('auxiliary',{action,kind,payload});}
if(kind==='panel'){const script=document.createElement('script');script.src='panel-view.js?v=96';document.head.append(script);return;}
if(kind==='estimate'){
 document.title='推定値';const script=document.createElement('script');script.src='estimate-view.js?v=96';document.head.append(script);return;
}
if(kind==='image'||kind==='score'){
 document.body.classList.add('aux-'+kind);document.title=kind==='image'?'画像から局面を取り込む':'地合い計算';
 let request=0;const pending=new Map();
 const send=(type,data)=>native('send',kind,{id,type,data});
 const close=()=>native('close',kind);
 const problem=e=>{const el=document.getElementById('image-status')||document.getElementById('problem')||document.getElementById('aux-loading');if(el)el.textContent=errorText(e);};
 window.addEventListener('kifu-aux',e=>{const m=e.detail;if(m.kind!==kind||m.id!==id)return;
  if(m.type==='reply'){const p=pending.get(m.data.request);if(p){pending.delete(m.data.request);clearTimeout(p.timer);m.data.error?p.reject(Error(m.data.error)):p.resolve(m.data.ok);}return;}
  if(kind==='score'&&m.type==='init'){
   const host=document.createElement('div');host.innerHTML=m.data.html;host.querySelectorAll('script').forEach(n=>n.remove());document.body.replaceChildren(...host.childNodes);
   for(const key of ['komi','capturedB','capturedW','adjust'])document.getElementById(key).oninput=event=>send('control',{key,value:event.target.value}).catch(problem);
   document.getElementById('seki-mode').onchange=event=>send('control',{key:'seki-mode',checked:event.target.checked}).catch(problem);
   for(const key of ['rule','reset'])document.getElementById(key).onclick=()=>send('control',{key}).catch(problem);
   document.getElementById('close').onclick=()=>close().catch(problem);
  }
  if(kind==='score'&&(m.type==='init'||m.type==='state')){
   for(const [key,value]of Object.entries(m.data.text||{})){const el=document.getElementById(key);if(el)el.textContent=value;}
   for(const [key,value]of Object.entries(m.data.values||{})){const el=document.getElementById(key);if(el&&el!==document.activeElement){if(key==='seki-mode')el.checked=value;else el.value=value;}}
  }
 });
 window.KifuAuxChild={kind,close};
 if(kind==='image'){
  window.IndependentGo={loadSgf(sgf,name){const n=++request;return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{pending.delete(n);reject(Error('本体からの応答がありません。本体の確認画面をご確認ください。'));},300000);pending.set(n,{resolve,reject,timer});send('image-import',{request:n,sgf,name}).catch(e=>{clearTimeout(timer);pending.delete(n);reject(Error(errorText(e)));});});}};
  const script=document.createElement('script');script.src='image-board.js?v=82';script.onload=()=>{document.getElementById('aux-loading')?.remove();document.getElementById('workspace-image-open').click();};script.onerror=()=>problem(Error('画像取り込み機能を読み込めませんでした。'));document.head.append(script);
 }else send('ready').catch(problem);
 window.addEventListener('keydown',e=>{if(e.key==='Escape'&&!document.querySelector('#app-confirm-dialog')){e.preventDefault();close().catch(problem);}});
 return;
}
const sessions=new Map();
function uid(){return crypto.randomUUID();}
function send(s,type,data){return native('send',s.kind,{id:s.id,type,data});}
function notify(e){const target=document.getElementById('status')||document.querySelector('[role=status]');if(target)target.textContent=errorText(e);}
function dimensions(kind){return {width:kind==='image'?Math.min(1100,Math.max(600,screen.availWidth-80)):480,height:Math.min(kind==='image'?900:800,Math.max(400,screen.availHeight-100))};}
window.addEventListener('kifu-aux',async e=>{const m=e.detail,s=sessions.get(m.kind);if(!s||s.id!==m.id)return;
 if(m.type==='closed'){sessions.delete(m.kind);s.closed=true;s.onclose?.();return;}
 if(m.kind==='estimate'){if(m.type==='ready'){s.ready=true;s.render();}return;}
 if(m.kind==='score'){
  if(m.type==='ready'){s.ready=true;s.render();return;}
  if(m.type==='control'){
   const {key,value,checked}=m.data||{},el=s.document.getElementById(key);if(!el)return;
   if(['komi','capturedB','capturedW','adjust'].includes(key)){el.value=String(value??'');el.dispatchEvent(new Event('input'));}
   else if(key==='seki-mode'){el.checked=!!checked;el.dispatchEvent(new Event('change'));}
   else if(['rule','reset'].includes(key))el.click();
   s.render();
  }return;
 }
 if(m.type==='image-import'){
  const {request,sgf,name}=m.data||{};if(s.importing)return;s.importing=true;
  try{
   if(typeof sgf!=='string'||sgf.length>2*1024*1024)throw Error('画像からの棋譜データが不正です。');
   if(document.body.classList.contains('scoring-mode'))throw Error('地合い計算を閉じてから取り込んでください。');
   const ok=await IndependentGo.loadSgf(sgf,String(name||'画像から取り込んだ局面.sgf'),0,{edited:true});
   if(ok){document.getElementById('edit').click();document.getElementById('rotate-reset').click();}
   await send(s,'reply',{request,ok});if(!ok)await native('focus','image');
  }catch(error){if(!s.closed){await send(s,'reply',{request,error:errorText(error)}).catch(()=>{});await native('focus','image').catch(()=>{});}}
  finally{s.importing=false;}
 }
});
window.KifuAuxiliary={available:()=>!!invoke(),
 async openEstimate(data){let s=sessions.get('estimate');if(s){s.data=data;s.render();return native('focus','estimate');}
  s={id:uid(),kind:'estimate',data,ready:false,closed:false};s.render=()=>{if(s.ready&&!s.closed)send(s,'state',s.data).catch(notify);};sessions.set('estimate',s);
  try{await native('open','estimate',{id:s.id,width:760,height:840});}catch(e){sessions.delete('estimate');throw Error(errorText(e));}
 },updateEstimate(data){const s=sessions.get('estimate');if(s){s.data=data;s.render();}},
 async openImage(){const existing=sessions.get('image');if(existing)return native('focus','image');const s={id:uid(),kind:'image'};sessions.set('image',s);try{await native('open','image',{id:s.id,...dimensions('image')});}catch(e){sessions.delete('image');throw Error(errorText(e));}},
 async scoreWindow(onclose){
  const s={id:uid(),kind:'score',document:document.implementation.createHTMLDocument('地合い計算'),closed:false,ready:false,initialized:false,onclose};
  s.render=()=>{if(!s.ready||s.closed||!s.document.getElementById('result'))return;const text={},values={};
   for(const key of ['heading','rule','formulas','result','operation-message','problem'])text[key]=s.document.getElementById(key)?.textContent||'';
   for(const key of ['komi','capturedB','capturedW','adjust','seki-mode']){const el=s.document.getElementById(key);values[key]=key==='seki-mode'?el.checked:el.value;}
   const data={text,values};const type=s.initialized?'state':'init';if(!s.initialized)data.html=s.document.body.innerHTML;s.initialized=true;
   s.queue=(s.queue||Promise.resolve()).then(()=>s.closed?null:send(s,type,data)).catch(notify);
  };
  s.close=()=>{if(s.closed)return;s.closed=true;sessions.delete('score');native('close','score').catch(notify);};
  s.focus=()=>native('focus','score').catch(notify);s.addEventListener=()=>{};
  sessions.set('score',s);try{await native('open','score',{id:s.id,...dimensions('score')});return s;}catch(e){sessions.delete('score');throw Error(errorText(e));}
 }
};
window.addEventListener('pagehide',()=>{for(const s of sessions.values())native('close',s.kind).catch(()=>{});});
})();
