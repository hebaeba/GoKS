(()=>{'use strict';
const id=new URLSearchParams(location.search).get('id'),invoke=window.__TAURI_INTERNALS__?.invoke;
let channel=null,last=null,dragFrom=null;
document.body.innerHTML='<header id="floating-header"><strong id="floating-title">詳細</strong><button id="floating-close">閉じる</button></header><div id="floating-content"></div>';
const host=document.getElementById('floating-content');
const override=document.createElement('style');override.textContent='html,body{margin:0!important;padding:0!important;height:auto!important;min-height:100%!important;overflow:auto!important;background:#f6faf8!important;color:#183b35;font:14px/1.4 system-ui}#floating-header{position:sticky;top:0;display:flex!important;justify-content:space-between;align-items:center;gap:8px;padding:6px;background:#e5eee8;z-index:200}#floating-title{font-size:16px}#floating-content{padding:8px}#floating-content>.inspector{position:static!important;display:block!important;width:100%!important;min-width:0!important;height:auto!important;max-height:none!important;overflow:visible!important;padding:0!important;border:0!important}#floating-content .inspector-pane{overflow:visible!important}#floating-content [hidden]{display:none!important}#floating-content #side-eval-graph{height:360px}#floating-close{font:14px/18px system-ui;padding:3px;height:26px;background:white;border:1px solid #a8bdb4;border-radius:4px}';
document.head.append(override);
function send(type,data){const m={id,type,data};if(invoke)return invoke('auxiliary',{action:'send',kind:'panel',payload:m});channel.postMessage(m);}
function apply(){
 if(!last||host.contains(document.activeElement)&&document.activeElement.matches('textarea,select,input:not([type=checkbox]):not([type=radio]):not([type=range])'))return;
 const top=scrollY;host.innerHTML=last.html;
 host.querySelectorAll('[data-panel-value]').forEach(e=>{if(e.type!=='file')e.value=e.dataset.panelValue;});
 host.querySelectorAll('iframe').forEach(f=>f.onload=()=>{try{f.contentDocument.addEventListener('click',e=>{const a=e.target.closest('a');if(a&&new URL(a.href).pathname.endsWith('/index.html')){e.preventDefault();document.getElementById('floating-close').click();}});}catch{}});
 scrollTo(scrollX,top);
}
function receive(m){if(m.id!==id||m.type!=='state')return;if(last?.title!==m.data.title)document.activeElement?.blur();last=m.data;document.title=last.title;document.getElementById('floating-title').textContent=last.title;
 for(const href of last.styles||[])if(![...document.querySelectorAll('link')].some(l=>l.href===href)){const l=document.createElement('link');l.rel='stylesheet';l.href=href;document.head.insertBefore(l,override);}
 apply();
}
function control(e,type){
 const el=e.target.closest('[data-panel-target]');if(!el)return;
 send('control',{target:el.dataset.panelTarget,type,value:el.value,checked:el.checked});
}
document.addEventListener('pointerdown',()=>send('dismiss-notice'));
 host.addEventListener('click',e=>{
 const svg=e.target.closest('#side-eval-graph');
 if(svg){const r=svg.getBoundingClientRect();send('control',{target:svg.dataset.panelTarget,type:'click',x:(e.clientX-r.left)/r.width});return;}
 const el=e.target.closest('button,summary,a,[role=button],input[type=file]');if(!el)return;e.preventDefault();send('control',{target:el.dataset.panelTarget,type:'click'});
});
for(const type of ['input','change'])host.addEventListener(type,e=>control(e,type));
host.addEventListener('focusout',()=>setTimeout(apply,0));
host.addEventListener('pointerover',e=>{const b=e.target.closest('.candidate-table button');if(b)send('control',{target:b.dataset.panelTarget,type:'pointerenter'});});
host.addEventListener('pointerout',e=>{const b=e.target.closest('.candidate-table button');if(b)send('control',{target:b.dataset.panelTarget,type:'pointerleave'});});
host.addEventListener('dragstart',e=>{dragFrom=e.target.closest('[draggable=true]')?.dataset.panelTarget;});
host.addEventListener('dragover',e=>{if(dragFrom)e.preventDefault();});
host.addEventListener('drop',e=>{const target=e.target.closest('[draggable=true]');if(dragFrom&&target){e.preventDefault();send('control',{type:'reorder',from:dragFrom,target:target.dataset.panelTarget});dragFrom=null;}});
document.getElementById('floating-close').onclick=()=>invoke?invoke('auxiliary',{action:'close',kind:'panel',payload:{}}):window.close();
if(invoke)window.addEventListener('kifu-aux',e=>{if(e.detail.kind==='panel')receive(e.detail);});else{channel=new BroadcastChannel('kifu-panel-'+id);channel.onmessage=e=>receive(e.data);}
let previousWidth=0;new ResizeObserver(()=>{const width=host.clientWidth;if(width!==previousWidth){previousWidth=width;send('viewport',{width});}}).observe(host);
 send('ready');window.addEventListener('pagehide',()=>{if(channel){send('closed');channel.close();}});
})();
