/* Shared controls: normal sidebar and simple-mode menu use the same DOM. */
(()=>{'use strict';
 const $=id=>document.getElementById(id),q=s=>document.querySelector(s),body=document.body;
 const board=q('.board-panel'),block=q('.board-block'),controls=q('.controls');
 body.classList.add('sidebar-layout');
 const sidebar=document.createElement('aside');sidebar.id='board-sidebar';sidebar.setAttribute('aria-label','碁盤の操作');board.prepend(sidebar);
 sidebar.append(q('.header-actions'),q('.topline'),controls);
 $('tab-settings').textContent='エンジン';
 function group(label,els){const section=document.createElement('section');section.className='side-group';section.setAttribute('aria-label',label);const heading=document.createElement('h2');heading.textContent=label;section.append(heading);const row=document.createElement('div');row.className='side-row';section.append(row);for(const el of els.filter(Boolean))row.append(el);controls.append(section);return section;}
 const nav=q('.navigation'),jump=q('.jump'),autoplay=q('.autoplay'),history=q('.history-pair'),rotation=q('.board-view-tools');
 group('手数移動',[nav,jump,autoplay]).classList.add('side-navigation');
 group('石の表示',[$('numbers'),q('.recent-label')]);
 const edit=group('編集',[history,$('insert'),$('cancel-insert'),$('delete-move'),$('pass'),$('turn')]);edit.classList.add('side-edit');
 $('turn').classList.remove('turn-after-recent');
 group('向き',[rotation]).classList.add('side-orientation');
 group('判定',[$('score')]);
 group('分岐',[$('branches')]).classList.add('side-branches');
 const protection=document.createElement('div');protection.className='side-protection';protection.append(q('.coordinate-choice'),q('.board-lock'));q('.topline').after(protection);
 // Empty compatibility wrappers stay in the DOM for older event handlers.
 for(const el of [...controls.children])if(!el.classList.contains('side-group'))el.hidden=true;
 const info=document.createElement('div');info.id='normal-info';info.className='board-info-row';
 const slide=document.createElement('div');slide.id='normal-slider';slide.className='board-slider-row';
 for(const selector of ['#black-name','#black-captures','.stones','#white-captures','#white-name','#komi','#move'])info.append(q(selector));slide.append($('slider'));block.append(info,slide);
 q('.players').hidden=true;q('.statusline').hidden=true;
 const head=q('.board-heading'),notes=document.createElement('button');notes.id='board-notes';notes.textContent='コメント・対局情報';notes.title='この局面のコメントと対局情報を表示します';notes.hidden=true;head.prepend(notes);head.append($('komi'));
 const dialog=document.createElement('dialog');dialog.id='board-notes-dialog';dialog.innerHTML='<div class="notes-heading"><strong>コメント・対局情報</strong><button type="button">閉じる</button></div><div class="notes-content"></div>';body.append(dialog);dialog.querySelector('button').onclick=()=>dialog.close();
 function fillNotes(){const dest=dialog.querySelector('.notes-content');dest.replaceChildren();const dl=$('metadata').cloneNode(true);dl.removeAttribute('id');if(dl.children.length)dest.append(dl);for(const el of $('comment').children)if(!el.classList.contains('root-info'))dest.append(el.cloneNode(true));}
 function openNotes(){fillNotes();if(!dialog.open)dialog.showModal();}
 notes.onclick=openNotes;
 function sync(){const hasInfo=$('metadata').children.length>0,hasComment=[...$('comment').children].some(e=>!e.classList.contains('root-info')&&e.textContent.trim());notes.hidden=!(hasInfo||hasComment);notes.textContent=hasInfo&&hasComment?'コメント・対局情報':hasInfo?'対局情報':'コメント';if(dialog.open)fillNotes();q('.side-branches').hidden=$('branches').hidden;
  for(const id of ['black-captures','white-captures']){const el=$(id),num=el.textContent.replace(/アゲハマ\s*/,'');el.textContent=num;el.title=(id==='black-captures'?'黒':'白')+'のアゲハマ '+num;}
 }
 const toggle=document.createElement('button');toggle.id='inspector-toggle';toggle.textContent='右側を隠す';toggle.title='右側を隠して碁盤を広く表示します';sidebar.firstElementChild.append(toggle);
 const inspector=q('.inspector'),close=document.createElement('button');close.id='normal-panel-close';close.textContent='閉じる';close.title='右側を隠します';inspector.prepend(close);
 let normalCollapsed=null;
 function setCollapsed(value){if(!body.classList.contains('simple-mode'))try{localStorage.setItem('gokifu-right-hidden',value?'1':'0');}catch{}body.classList.toggle('inspector-collapsed',value);toggle.textContent=value?'右側を表示':'右側を隠す';toggle.setAttribute('aria-expanded',String(!value));toggle.title=value?'右側を表示します':'右側を隠して碁盤を広く表示します';window.dispatchEvent(new Event('workspace-layout'));}
 toggle.onclick=()=>setCollapsed(!body.classList.contains('inspector-collapsed'));close.onclick=()=>setCollapsed(true);
 const activate=KifuWorkspace.activate;KifuWorkspace.activate=id=>{setCollapsed(false);activate(id);};
 // Header save "other" uses its original closure, so open the pane explicitly too.
 $('quick-more').addEventListener('click',()=>setCollapsed(false));
 const narrow=matchMedia('(max-width:1100px)');let collapsed=narrow.matches;try{const saved=localStorage.getItem('gokifu-right-hidden');if(saved!==null)collapsed=saved==='1';}catch{}setCollapsed(collapsed);
 // Resizing into simple mode must not overwrite the normal panel preference.
 // Narrow screens use the existing overlay CSS without changing the saved state.
 window.addEventListener('kifu-position-change',sync);sync();
 window.KifuSidebar={openNotes,enterSimple(){normalCollapsed=body.classList.contains('inspector-collapsed');},leaveSimple(){if(normalCollapsed!==null)setCollapsed(normalCollapsed);normalCollapsed=null;}};
})();
