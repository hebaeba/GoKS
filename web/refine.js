/* Update 29: content-sized controls and always-visible board operations. */
(()=>{'use strict';const $=id=>document.getElementById(id),q=s=>document.querySelector(s);
// Compact help bubbles become conventional hover descriptions.
for(const d of document.querySelectorAll('.compact-info')){const text=d.querySelector('.compact-info-content')?.textContent.trim();if(text){const parent=d.parentElement;parent.title=[parent.title,text].filter(Boolean).join('\n');}d.hidden=true;}
$('board-fit').textContent='標準幅に戻す';$('board-fit').title='ドラッグで変更した幅を、現在のウィンドウに合わせた標準幅へ戻します。棋譜や路数は変わりません。';
for(const id of ['board-display-options','board-edit-options']){const d=$(id);d.open=true;d.querySelector('summary').hidden=true;d.classList.add('always-open');}
$('board-edit-options').lastElementChild.append($('board-fit'));
const history=document.createElement('div');history.className='history-pair';history.setAttribute('role','group');history.setAttribute('aria-label','編集履歴');$('undo').before(history);history.append($('undo'),$('redo'));$('board-edit-options').lastElementChild.prepend(history);
$('undo').title='直前の編集を取り消します';$('redo').title='取り消した編集をやり直します';
$('jump-go').textContent='指定手数へ移動';$('jump-go').title='入力した手数の局面へ移動します';const jump=q('.jump');for(const n of [...jump.childNodes])if(n.nodeType===3)n.remove();jump.prepend($('jump-go'));$('jump').setAttribute('aria-label','移動先の手数（３桁）');$('jump').style.width='5ch';
for(const [id,label]of [['first','|◀'],['back10','◀◀'],['back','◀'],['next','▶'],['next10','▶▶'],['last','▶|']]){$(id).textContent=label;}
// Remove the focus outline caused by Space on this single toggle; Tab focus remains visible.
let pointerFocus=false;$('analyze-live').addEventListener('pointerdown',()=>pointerFocus=true);document.addEventListener('keydown',e=>{if(e.key==='Tab')pointerFocus=false;if(e.code==='Space'&&pointerFocus&&document.activeElement===$('analyze-live'))$('analyze-live').blur();},true);
// Restore history controls beside a mismatch warning without modifying its dynamic message.
const warning=$('analysis-stale'),recovery=document.createElement('div');recovery.id='analysis-history';recovery.className='history-pair';warning.after(recovery);for(const [source,label]of [['undo','取り消し'],['redo','やり直し']]){const b=document.createElement('button');b.textContent=label;b.id='analysis-'+source;b.onclick=()=>$(source).click();recovery.append(b);}
function syncHistory(){recovery.hidden=warning.hidden;for(const id of ['undo','redo'])$('analysis-'+id).disabled=$(id).disabled;}
new MutationObserver(syncHistory).observe(warning,{attributes:true,attributeFilter:['hidden']});for(const id of ['undo','redo'])new MutationObserver(syncHistory).observe($(id),{attributes:true,attributeFilter:['disabled']});syncHistory();
const list=$('candidate-list'),settings=$('candidate-settings');list.before(settings);const heading=q('.candidate-block > h3');if(heading){settings.title=[settings.title,heading.textContent].filter(Boolean).join('\n');heading.hidden=true;}settings.querySelector('summary').textContent='候補手の表示設定';
const ranking=$('analysis-worst').querySelector('.compact-heading');ranking.insertBefore($('analysis-save'),q('.worst-metric'));$('analysis-save').textContent='保存';$('analysis-save').title='棋譜と解析結果をまとめて保存します';
// Keep saving reachable before a full-game ranking exists.
const archive=document.createElement('button');archive.id='analysis-save-current';archive.textContent='解析を保存';archive.onclick=()=>$('analysis-save').click();q('.analysis-files').prepend(archive);function syncArchive(){archive.disabled=$('analysis-save').disabled;archive.hidden=!$('analysis-worst').hidden;}new MutationObserver(syncArchive).observe($('analysis-save'),{attributes:true});new MutationObserver(syncArchive).observe($('analysis-worst'),{attributes:true});syncArchive();
const detail=$('compact-analysis-details');detail.open=true;detail.querySelector('summary').hidden=true;
// Save tab: save the complete record directly and leave specialized options available.
const tab=$('tab-storage'),old=tab.onclick;tab.onclick=()=>{old();$('save').click();};tab.title='棋譜全体を名前を付けて保存し、その他の保存項目を表示します';$('save').hidden=false;const saves=q('.record-save-row');saves.prepend($('save'));$('save').textContent='棋譜全体を保存';
$('gif-options').querySelector('summary').click();$('gif-options').open=true;$('gif-options').querySelector('summary').onclick=e=>e.preventDefault();
for(const h of document.querySelectorAll('#pane-storage > h3'))if(h.textContent==='一時保存')h.hidden=true;
// Tool descriptions are retained on their related controls.
for(const p of document.querySelectorAll('#tools p')){if(p.querySelector('input,button,textarea,select')||p.id)continue;const text=p.textContent.trim();if(text){$('tools').title=[$('tools').title,text].filter(Boolean).join('\n');p.hidden=true;}}
const toolHeading=q('#pane-tools > h2'),close=q('.close-tools');if(toolHeading&&close){const row=document.createElement('div');row.className='tools-heading';toolHeading.before(row);row.append(toolHeading,close);}
// Match a select to the widest option; no fixed empty space or stretching.
function sizeSelect(el){const span=document.createElement('span'),style=getComputedStyle(el);span.style.cssText='position:fixed;visibility:hidden;white-space:pre;font:'+style.font;document.body.append(span);let width=0;for(const o of el.options){span.textContent=o.textContent;width=Math.max(width,span.getBoundingClientRect().width);}span.remove();el.style.setProperty('width',Math.ceil(width+36)+'px','important');el.style.setProperty('min-width','0','important');el.style.setProperty('max-width','100%','important');}
for(const id of ['analysis-seconds','analysis-metric','analysis-pv-length','worst-metric'])sizeSelect($(id));

// Width reset belongs to the draggable separator, not the editing controls.
$('board-divider').append($('board-fit'));$('board-fit').textContent='';$('board-fit').setAttribute('aria-label','標準幅に戻す');$('board-fit').classList.add('divider-reset');$('board-fit').addEventListener('click',e=>e.stopPropagation());
$('tab-settings').textContent='エンジン設定';

// Board title and direct operation rows.
const boardTitle=q('.game-title');q('.board-block').prepend(boardTitle);q('.brand').hidden=true;q('.app-header').classList.add('board-title-moved');
const boardHead=document.createElement('div');boardHead.className='board-heading';boardTitle.before(boardHead);boardHead.append(boardTitle,q('.header-actions'));q('.app-header').hidden=true;
const coords=document.createElement('div');coords.className='coordinate-choice';coords.setAttribute('role','group');coords.setAttribute('aria-label','座標の表示');coords.innerHTML='<span>座標</span><label><input type=radio name=board-coordinates value=on>あり</label><label><input type=radio name=board-coordinates value=off>なし</label>';q('.topline').append(coords);for(const input of coords.querySelectorAll('input')){input.checked=(input.value==='on')===IndependentGo.getCoordinates();input.onchange=()=>IndependentGo.setCoordinates(input.value==='on');}
const displayRow=$('board-display-options').lastElementChild,editRow=$('board-edit-options').lastElementChild;
const moves=document.createElement('div');moves.className='move-edit-group';moves.append($('pass'),$('delete-move'),$('insert'),$('cancel-insert'));displayRow.append(moves);editRow.append(q('.board-view-tools'));
q('.analysis-primary').append(q('.region-analysis-toggle'));
})();

;(()=>{const d=document.createElement('dialog');d.id='guide-dialog';d.innerHTML='<div class="guide-top"><strong id="guide-title"></strong><button id="guide-close">碁盤に戻る</button></div><iframe id="guide-frame" title="説明書"></iframe>';document.body.append(d);const frame=d.querySelector('iframe');const close=()=>d.close();d.querySelector('button').onclick=close;function openGuide(title,url){d.querySelector('strong').textContent=title;frame.src=url;d.showModal();}document.querySelectorAll('footer a').forEach(a=>{a.removeAttribute('target');a.onclick=e=>{e.preventDefault();openGuide(a.textContent,a.href);};});const about=document.getElementById('about-open');if(about){const help=about.closest('.help');help.remove();const footer=document.querySelector('footer'),links=document.createElement('span');links.className='footer-links';footer.append(links);links.append(about,...footer.querySelectorAll('a'));about.className='about-open';about.onclick=()=>openGuide('このKifu-Editorについて','README.html?v=45');}frame.onload=()=>{try{frame.contentDocument.addEventListener('click',e=>{const a=e.target.closest('a');if(a&&new URL(a.href).pathname.endsWith('/index.html')){e.preventDefault();close();}});}catch{}};})();
