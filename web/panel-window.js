/* Independent inspector view. All state and engine operations remain in the main window. */
(()=>{'use strict';
const native=()=>window.__TAURI_INTERNALS__?.invoke;
const titles={analysis:'候補手・全局解析・グラフ',match:'対局',sequence:'手順・ツール',tools:'手順・ツール',record:'棋譜欄・文字コード',storage:'保存・印刷',settings:'エンジン',graph:'形勢バー・グラフ',notes:'コメント・対局情報',shortcuts:'キーボード操作',about:'このGo棋譜Studioについて',licenses:'著作権・ライセンス'};
let session=null,serial=0,modal=null;const ids=new WeakMap(),targets=new Map();
function token(el){if(!ids.has(el))ids.set(el,'p'+(++serial));const id=ids.get(el);targets.set(id,el);return id;}
function copy(el){
 const c=el.cloneNode(true),original=[el,...el.querySelectorAll('*')],clones=[c,...c.querySelectorAll('*')];
 original.forEach((a,i)=>{const b=clones[i];b.setAttribute('data-panel-target',token(a));
  if(a.matches('input,textarea,select')){if(a.type!=='file'){b.setAttribute('data-panel-value',a.value);if(a.tagName==='TEXTAREA')b.textContent=a.value;else b.setAttribute('value',a.value);}if(a.checked)b.setAttribute('checked','');else b.removeAttribute('checked');}
 });
 window.KifuI18n?.restoreClone(el,c);
 c.querySelectorAll('script').forEach(n=>n.remove());return c;
}
function send(type,data){if(!session)return;const payload={id:session.id,type,data};if(native())native()('auxiliary',{action:'send',kind:'panel',payload}).catch(()=>{});else session.channel?.postMessage(payload);}
function render(){
 if(!session||!session.ready)return;
 const dialog=document.querySelector('dialog[open]');if(dialog!==modal){modal=dialog;if(modal){if(native())native()('auxiliary',{action:'owner-focus',kind:'panel',payload:{}}).catch(()=>{});else window.focus();}}
 for(const [key,el] of targets)if(!el.isConnected)targets.delete(key);
 const host=document.createElement('div');host.className='inspector panel-mirror';
 if(['about','licenses'].includes(session.tab)){const frame=document.createElement('iframe');frame.src=session.tab==='about'?'README.html':'licenses.html';frame.title=titles[session.tab];frame.style.cssText='width:100%;height:calc(100vh - 75px);border:0';host.append(frame);}
 else if(session.tab==='notes'){host.append(copy(KifuSidebar.notesContent()));}
 else if(session.tab==='shortcuts'){host.append(copy(document.querySelector('#shortcut-dialog table')));}
 else if(session.tab==='graph'){host.append(copy(document.getElementById('side-evaluation')));}
 else{
  const inspector=document.querySelector('.inspector');host.dataset.layout=inspector.dataset.layout;
  for(const el of inspector.children){
   if(el.matches('#simple-panel-close,#normal-panel-close,.workspace-mode,.workspace-tabs,.inspector-navigation'))continue;
   if(el.hidden)continue;
   if(session.tab==='analysis'&&el.id==='pane-analysis')host.append(copy(document.getElementById('side-evaluation')));
   host.append(copy(el));
  }

 }
 // Keep file pickers, confirmations and other native actions in the owner window.
 const html=host.outerHTML;if(html!==session.html){session.html=html;send('state',{html,title:titles[session.tab],styles:[...document.querySelectorAll('link[rel=stylesheet]')].map(e=>e.href)});}
}
async function event(m){
 if(!session||m.id!==session.id)return;
 if(m.type==='ready'){session.ready=true;clearTimeout(session.connectionTimer);session.html=null;render();return;}
 if(m.type==='closed'){clearInterval(session.timer);clearTimeout(session.connectionTimer);session.channel?.close();session=null;return;}
 if(m.type==='dismiss-notice'){const notice=document.getElementById('engine-profile-message');if(notice)notice.textContent='';return;}
 if(m.type==='viewport'){window.KifuSideEvaluation?.setViewportWidth(m.data?.width);return;}
 if(m.type!=='control')return;
 const d=m.data||{},el=targets.get(d.target);if(!el||!el.isConnected||el.disabled||el.closest('[inert]'))return;
 if(d.type==='click'){
  if(el.id==='side-eval-graph')el.onclick?.({panelFraction:d.x});
  else if(el.tagName==='SUMMARY'){el.parentElement.open=!el.parentElement.open;}
  else el.click();
 }else if(['input','change'].includes(d.type)&&el.matches('input,textarea,select')&&el.type!=='file'){
  if(el.type==='checkbox'||el.type==='radio')el.checked=!!d.checked;else el.value=String(d.value??'');
  el.dispatchEvent(new Event(d.type,{bubbles:true}));
 }else if(['pointerenter','pointerleave'].includes(d.type)){el.dispatchEvent(new PointerEvent(d.type,{pointerType:'mouse'}));}
 else if(d.type==='reorder'){const from=targets.get(d.from);if(from?.isConnected){const transfer=new DataTransfer();from.dispatchEvent(new DragEvent('dragstart',{bubbles:true,dataTransfer:transfer}));el.dispatchEvent(new DragEvent('drop',{bubbles:true,dataTransfer:transfer}));from.dispatchEvent(new DragEvent('dragend',{bubbles:true,dataTransfer:transfer}));}}
 setTimeout(()=>{render();if(document.querySelector('dialog[open]')){if(native())native()('auxiliary',{action:'owner-focus',kind:'panel',payload:{}}).catch(()=>{});else window.focus();}},0);
}
window.addEventListener('kifu-aux',e=>{if(e.detail.kind==='panel')event(e.detail);});
window.KifuPanelWindow={async open(tab){
 if(!titles[tab])return;
 if(['analysis','match','sequence','tools','record','storage','settings'].includes(tab))KifuWorkspace.activate(tab);
 if(session){session.tab=tab;session.html=null;render();if(native())await native()('auxiliary',{action:'focus',kind:'panel',payload:{}});else session.popup?.focus();return;}
 session={id:crypto.randomUUID(),tab,ready:false};const current=session;
 try{
  if(native())await native()('auxiliary',{action:'open',kind:'panel',payload:{id:current.id,width:680,height:840}});
  else{current.channel=new BroadcastChannel('kifu-panel-'+current.id);current.channel.onmessage=e=>event(e.data);current.popup=window.open('panel.html?id='+current.id,'kifu-panel','popup,width=680,height=840,resizable=yes,scrollbars=yes');if(!current.popup)throw Error('ポップアップを許可してください。');}
  current.timer=setInterval(render,250);
  current.connectionTimer=setTimeout(async()=>{if(session===current&&!current.ready){await KifuDialogs.confirm('独立窓との接続を確認できませんでした。webとsrc-tauriを更新93で揃えてビルドし直し、画面左下が「更新93」になっていることを確認してください。',{accept:'閉じる'});}},8000);
 }catch(e){session=null;await KifuDialogs.confirm(e.message||String(e),{accept:'閉じる'});}
}};
window.addEventListener('pagehide',()=>{if(!session)return;clearInterval(session.timer);clearTimeout(session.connectionTimer);if(native())native()('auxiliary',{action:'close',kind:'panel',payload:{}}).catch(()=>{});else{session.popup?.close();session.channel?.close();}});
})();
