'use strict';
(()=>{
 const $=id=>document.getElementById(id), q=s=>document.querySelector(s);
 const main=q('main'), workspace=q('.workspace'), board=q('.board-panel'), panel=q('.edit-panel');
 document.title='棋譜編集ツール';
 const header=q('header');header.className='app-header';
 header.querySelectorAll('.eyebrow, header > p').forEach(e=>e.remove());
 const brand=document.createElement('div');brand.className='brand';brand.innerHTML='<span class="brand-mark" aria-hidden="true">●<i>○</i></span><span>棋譜編集ツール<small>棋譜を並べる・考える・残す</small></span>';
 header.prepend(brand);const title=q('h1');title.className='game-title';
 const toolbar=document.createElement('div');toolbar.className='header-actions';toolbar.innerHTML='<button id="workspace-open" title="棋譜ファイルを開きます">棋譜を開く</button><button id="workspace-save" title="棋譜の保存・印刷を表示します">保存・印刷</button>';header.append(toolbar);
 workspace.className='workspace studio-grid';panel.classList.add('inspector');workspace.append(panel);
 const tabs=document.createElement('nav');tabs.className='workspace-tabs';tabs.setAttribute('aria-label','編集パネル');tabs.setAttribute('role','tablist');panel.prepend(tabs);
 let focusLayout='analysis';
 const modeBar=document.createElement('div');modeBar.className='workspace-mode';modeBar.innerHTML='<button id="layout-analysis" aria-pressed="true" title="候補手とグラフを中心に表示します">解析中心</button><button id="layout-edit" aria-pressed="false" title="手順と編集ツールを表示し、碁盤を編集モードにします">編集中心</button>';panel.prepend(modeBar);
 const panes={};for(const [id,text] of [['analysis','解析'],['match','対局'],['sequence','手順'],['tools','ツール'],['record','棋譜'],['storage','保存'],['settings','設定']]){
  const button=document.createElement('button');button.id='tab-'+id;button.textContent=text;button.type='button';button.setAttribute('role','tab');button.setAttribute('aria-controls','pane-'+id);button.onclick=()=>activate(id);tabs.append(button);
  const pane=document.createElement('section');pane.id='pane-'+id;pane.className='inspector-pane';pane.setAttribute('role','tabpanel');pane.setAttribute('aria-labelledby',button.id);panel.append(pane);panes[id]=pane;
 }
 panes.sequence.append($('tree-block'));const empty=document.createElement('div');empty.className='sequence-empty';empty.innerHTML='<span aria-hidden="true">○ ─ ● ─ ○</span><h2>ここに手順が並びます</h2><p>棋譜を開くか、編集モードで石を置いてください。分岐した手順もここで選べます。</p>';
 panes.sequence.append(empty);const syncEmpty=()=>empty.hidden=!$('tree-block').hidden;new MutationObserver(syncEmpty).observe($('tree-block'),{attributes:true,attributeFilter:['hidden']});syncEmpty();
 const tools=$('tools');panes.tools.append(tools);tools.querySelector('summary').hidden=true;tools.open=true;tools.addEventListener('click',event=>{if(event.target.closest('[data-tool]')){tools.open=true;if(matchMedia('(max-width:899px)').matches)q('.canvas-wrap').scrollIntoView({behavior:'smooth',block:'start'});}});new MutationObserver(()=>{if(!panes.tools.hidden&&!tools.open)tools.open=true;}).observe(tools,{attributes:true,attributeFilter:['open']});const toolHeading=document.createElement('h2');toolHeading.textContent='碁石・記号・文字の配置';panes.tools.prepend(toolHeading);
 tools.querySelector('.close-tools').textContent='配置を終了';tools.querySelector('.close-tools').addEventListener('click',()=>{tools.open=true;activate('sequence');});
 const files=q('.files-panel');panes.record.append(files);panes.storage.append($('save-options'),$('recovery'));$('save-menu').open=true;$('save-menu').remove();$('save-options').hidden=false;
 const recordHeading=document.createElement('h2');recordHeading.textContent='棋譜の読み込み・書き込み';files.prepend(recordHeading);
 const storageHeading=document.createElement('h2');storageHeading.textContent='棋譜と盤面の保存';panes.storage.prepend(storageHeading);
 const help=q('.help');const footer=q('footer');main.append(help,footer);footer.insertAdjacentHTML('afterbegin','<span class="release-label">単独版 · 更新65</span>');
 q('.edit-buttons').append($('score'));
 const activeMode=document.createElement('span');activeMode.className='mode-indicator';q('.topline').prepend(activeMode);const updateMode=()=>activeMode.textContent='';new MutationObserver(updateMode).observe(document.body,{attributes:true,attributeFilter:['class']});updateMode();
 function activate(id){
  if(id==='analysis')focusLayout='analysis';else if(id==='tools'||id==='sequence')focusLayout='edit';
  const combined=id==='tools'||id==='sequence';
  
  for(const [key,pane]of Object.entries(panes)){pane.hidden=combined?!['tools','sequence'].includes(key):key!==id;const tab=$('tab-'+key);tab.setAttribute('aria-selected',String(key===id));tab.tabIndex=key===id?0:-1;}
  $('layout-analysis').setAttribute('aria-pressed',String(focusLayout==='analysis'));$('layout-edit').setAttribute('aria-pressed',String(focusLayout==='edit'));panel.dataset.layout=focusLayout;
  if(combined)tools.open=true;if(id==='storage')$('save-options').hidden=false;
  window.dispatchEvent(new Event('workspace-layout'));window.dispatchEvent(new Event('resize'));
 }
 $('layout-analysis').onclick=()=>activate('analysis');$('layout-edit').onclick=()=>activate('sequence');

 tabs.addEventListener('keydown',event=>{const list=[...tabs.children].filter(b=>!b.hidden),i=list.indexOf(document.activeElement);if(i<0)return;let n;if(event.key==='ArrowRight')n=(i+1)%list.length;else if(event.key==='ArrowLeft')n=(i+list.length-1)%list.length;else if(event.key==='Home')n=0;else if(event.key==='End')n=list.length-1;else return;event.preventDefault();list[n].click();list[n].focus();});
 $('workspace-open').onclick=()=>$('open').click();
 const saveTrigger=$('workspace-save'),savePopup=document.createElement('div');
 savePopup.id='workspace-save-popup';savePopup.className='save-popup';savePopup.hidden=true;
 savePopup.setAttribute('role','group');savePopup.setAttribute('aria-label','保存・印刷');
 savePopup.innerHTML='<button type="button" id="quick-save"><strong>棋譜を保存…</strong><small>変化・コメント・対局情報を含みます</small></button><button type="button" id="quick-print">盤面を印刷…</button><button type="button" id="quick-more">その他の保存…</button>';
 toolbar.append(savePopup);saveTrigger.setAttribute('aria-expanded','false');saveTrigger.setAttribute('aria-controls',savePopup.id);saveTrigger.title='棋譜を保存・盤面を印刷・その他の保存を選びます';
 function syncSaveActions(){$('quick-save').disabled=$('save').disabled;$('quick-print').disabled=$('print').disabled;}
 function closeSave(focus=false){savePopup.hidden=true;saveTrigger.setAttribute('aria-expanded','false');if(focus)saveTrigger.focus();}
 function openSave(){syncSaveActions();savePopup.hidden=false;saveTrigger.setAttribute('aria-expanded','true');}
 saveTrigger.onclick=()=>savePopup.hidden?openSave():closeSave();
 saveTrigger.addEventListener('keydown',e=>{if(e.key==='ArrowDown'){e.preventDefault();openSave();savePopup.querySelector('button:not(:disabled)')?.focus();}});
 savePopup.addEventListener('keydown',e=>{const buttons=[...savePopup.querySelectorAll('button:not(:disabled)')],i=buttons.indexOf(document.activeElement);if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();buttons[(i+(e.key==='ArrowDown'?1:-1)+buttons.length)%buttons.length]?.focus();}});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!savePopup.hidden){e.preventDefault();closeSave(true);}});
 document.addEventListener('pointerdown',e=>{if(!toolbar.contains(e.target))closeSave();});
 toolbar.addEventListener('focusout',e=>{if(!toolbar.contains(e.relatedTarget))closeSave();});
 $('quick-save').onclick=()=>{closeSave(true);$('save').click();};
 $('quick-print').onclick=()=>{closeSave(true);$('print').click();};
 $('quick-more').onclick=()=>{closeSave();activate('storage');$('tab-storage').focus();if(matchMedia('(max-width:899px)').matches)panel.scrollIntoView({behavior:'smooth',block:'start'});};
 new MutationObserver(syncSaveActions).observe($('save'),{attributes:true,attributeFilter:['disabled']});
 new MutationObserver(syncSaveActions).observe($('print'),{attributes:true,attributeFilter:['disabled']});
 // Keep the full-save handler reachable from the header without a duplicate details menu.
 $('save').hidden=true;$('print').hidden=false;
 const records=$('save-options').querySelector('.record-save-row'),images=$('save-options').querySelector('.image-save-row');
 for(const [target,text] of [[records,'棋譜の保存'],[images,'画像の保存']]){const h=document.createElement('h3');h.textContent=text;target.before(h);}
 const recoveryHeading=document.createElement('h3');recoveryHeading.textContent='一時保存';$('recovery').before(recoveryHeading);


 panel.prepend(modeBar);$('tab-tools').hidden=true;$('tab-sequence').textContent='手順・ツール';$('tab-record').textContent='棋譜欄';window.KifuWorkspace={activate};activate('analysis');
})();

window.addEventListener('DOMContentLoaded',()=>{
 const menu=document.getElementById('load-menu'),encoding=document.querySelector('.encoding-menu');
 if(menu&&encoding){document.querySelector('#pane-record .files-panel h2').after(encoding);menu.hidden=true;}
});
