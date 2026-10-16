/* Workspace composition. Editing layout enables board editing. */
(()=>{'use strict';
const $=id=>document.getElementById(id),q=s=>document.querySelector(s),api=IndependentGo;
const inspector=q('.inspector'),settings=$('pane-settings'),analysis=$('pane-analysis');
settings.innerHTML='<h2>エンジン・接続の設定</h2>';
settings.append(q('.engine-actions'),$('engine-settings'),$('engine-notice'),$('engine-error'),q('.engine-log'));
const dock=document.createElement('section');dock.className='engine-dock';dock.setAttribute('aria-label','解析エンジンの状態と操作');
const primary=q('.analysis-primary'),conditions=q('.analysis-conditions'),engineName=$('engine-active');primary.querySelector('span').remove();primary.append(conditions);engineName.append($('engine-state'));dock.append(engineName,primary);
const navigation=document.createElement('div');navigation.className='inspector-navigation';inspector.prepend(navigation);navigation.append(q('.workspace-mode'),q('.workspace-tabs'));navigation.after(dock);$('engine-connect').title='選択したエンジンを起動し、解析の準備をします';
q('.analysis-heading').remove();
const files=document.createElement('details');files.className='engine-running-details';files.innerHTML='<summary>実行中のファイルを確認</summary><pre id="engine-running-files">エンジンは停止しています。</pre>';q('.engine-actions').after(files);
const hintSettings=document.createElement('p');hintSettings.className='analysis-note';hintSettings.textContent='起動中でも選択・入力できます。変更を反映するには「適用して再起動」を押してください。同梱のCPU版はエンジンリストの「KataGo Eigen（CPU・標準）」です。';files.after(hintSettings);

// One lifecycle badge; show startup/error details beside the connection controls only.
dock.append($('engine-notice'));$('engine-notice-title').hidden=true;$('engine-nearby-name').hidden=true;
// Full-game controls are secondary and follow the graph.
analysis.append($('analysis-help'));
const batch=document.createElement('section');batch.id='analysis-batch';const old=$('analysis-batch');
for(const child of [...old.children])if(child.tagName!=='SUMMARY')batch.append(child);old.replaceWith(batch);
const title=document.createElement('h3');title.textContent='全局解析';batch.prepend(title);q('.analysis-graph-heading').before(batch);
$('candidate-settings').append(q('.analysis-legend'),$('analysis-played'));$('analysis-played').classList.add('actual-move-info');
const candidates=q('.candidate-block'),candidateList=document.createElement('details');candidateList.id='candidate-list';candidateList.open=true;
const candidateSummary=document.createElement('summary');candidateSummary.textContent='候補手一覧';candidateList.append(candidateSummary);candidates.before(candidateList);candidateList.append(candidates);
const progress=document.createElement('section');progress.id='batch-progress';progress.hidden=true;progress.setAttribute('aria-label','全局解析の進捗');
const progressLabel=document.createElement('p');progressLabel.id='batch-progress-label';progressLabel.setAttribute('role','status');$('analysis-progress').setAttribute('aria-labelledby','batch-progress-label');progress.append(progressLabel,$('analysis-progress'));
$('analysis-graph').after(progress);progress.after($('analysis-status'));
const rank=document.createElement('section');rank.id='analysis-worst';rank.hidden=true;
rank.innerHTML='<h3>ワーストランキング</h3><p id="worst-note" class="analysis-note"></p>';
for(const [color,name]of [['B','● 黒のワーストランキング'],['W','○ 白のワーストランキング']]){const section=document.createElement('section');section.className='worst-side';section.innerHTML='<h4>'+name+'</h4><div class="candidate-scroll"><table class="candidate-table"><thead><tr><th>順位</th><th>着手</th><th>目数低下</th><th>勝率低下</th></tr></thead><tbody id="worst-rows-'+color+'"></tbody></table></div>';rank.append(section);}
$('analysis-status').after(rank);

const rotation=document.createElement('div');rotation.className='board-view-tools';rotation.innerHTML='<span>盤面の向き</span><button id="rotate-left" title="表示を左へ90度回転します。棋譜は変更しません">↶ 左回転</button><button id="rotate-right" title="表示を右へ90度回転します。棋譜は変更しません">↷ 右回転</button><button id="rotate-reset" title="元の表示方向に戻します">元に戻す</button><output id="rotation-state">0°</output>';
rotation.querySelector('span').textContent='回転';q('.position-settings').insertBefore(rotation,q('.jump'));let angle=0;
function turn(n){angle=(angle+n+4)%4;api.rotateBoard(n);$('rotation-state').textContent=angle*90+'°';}
$('rotate-left').textContent='↶';$('rotate-left').setAttribute('aria-label','左へ90度回転');$('rotate-right').textContent='↷';$('rotate-right').setAttribute('aria-label','右へ90度回転');$('rotate-reset').textContent='元の向き';
$('rotate-left').onclick=()=>turn(-1);$('rotate-right').onclick=()=>turn(1);$('rotate-reset').onclick=()=>turn(-angle);
// Fixed-size vector glyphs avoid font-dependent symbol sizes.
const shapes={AB:'<circle cx="12" cy="12" r="8" fill="#172f29"/>',AW:'<circle cx="12" cy="12" r="8" fill="white"/>',TR:'<path d="M12 4L20 20H4Z"/>',SQ:'<rect x="4" y="4" width="16" height="16"/>',CR:'<circle cx="12" cy="12" r="8"/>',MA:'<path d="M4 4L20 20M20 4L4 20"/>'};
for(const [key,shape]of Object.entries(shapes)){const label=q('[data-tool="'+key+'"]>span');label.textContent=label.textContent.replace(/[●○△□×]/g,'').trim()+' ';const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('aria-hidden','true');svg.classList.add('tool-glyph');svg.innerHTML='<g fill="none" stroke="#183c34" stroke-width="1.8" stroke-linejoin="round">'+shape+'</g>';label.append(svg);}
const paste=document.createElement('button');paste.id='paste-board';paste.textContent='クリップボードから';paste.title='コピーしたSGF棋譜を読み込みます';$('load-options').prepend(paste);
const dlg=document.createElement('dialog');dlg.id='paste-dialog';dlg.innerHTML='<h2>棋譜を貼り付け</h2><p>SGF棋譜を貼り付けて「読込み」を押してください。</p><textarea id="paste-text" aria-label="貼り付けるSGF棋譜" placeholder="(;GM[1]…)"></textarea><div><button id="paste-load">読込み</button><button id="paste-close">閉じる</button></div>';document.body.append(dlg);
paste.onclick=async()=>{try{const text=await navigator.clipboard.readText();if(text.trim()){api.pasteRecord(text);return;}}catch{}dlg.showModal();$('paste-text').focus();};
$('paste-load').onclick=()=>{const text=$('paste-text').value;dlg.close();if(!api.pasteRecord(text))dlg.showModal();};$('paste-close').onclick=()=>dlg.close();
const open=$('workspace-open'),hint=document.createElement('div');hint.id='open-record-hint';hint.className='open-record-hint';hint.hidden=true;hint.setAttribute('role','tooltip');hint.textContent='クリック：棋譜ファイルを選択\nドラッグ：棋譜ファイルを盤面へ\n貼り付け：盤面にフォーカスしてCtrl+V、または盤面を右クリック';q('.header-actions').append(hint);open.setAttribute('aria-describedby',hint.id);open.removeAttribute('title');
const hideHint=()=>hint.hidden=true;open.addEventListener('mouseenter',()=>hint.hidden=false);open.addEventListener('mouseleave',hideHint);open.addEventListener('focus',()=>hint.hidden=false);open.addEventListener('blur',hideHint);open.addEventListener('click',hideHint);window.addEventListener('blur',hideHint);document.addEventListener('keydown',e=>{if(e.key==='Escape')hideHint();});

// Focus the board without placing a move before pasting (right-click or keyboard Tab).
$('board').addEventListener('contextmenu',event=>{event.preventDefault();$('board').focus();paste.click();});
q('.help ul').insertAdjacentHTML('beforeend','<li>棋譜ファイルを盤面にドラッグして読み込めます。SGFテキストは盤面にフォーカスしてCtrl+V、または「棋譜欄」の「クリップボードから」で読み込めます。</li><li>盤面の回転は表示方向だけを変更します。保存するSGFの座標は変わりません。画像・GIF・印刷には表示方向が反映されます。</li>');

// Compact controls retain the existing elements and their event handlers.
const controls=q('.controls'),displayBox=document.createElement('details');displayBox.id='board-display-options';displayBox.innerHTML='<summary>盤面表示</summary><div class="compact-options"></div>';controls.append(displayBox);displayBox.lastElementChild.append($('numbers'),q('.recent-label'),rotation);
const editBox=document.createElement('details');editBox.id='board-edit-options';editBox.innerHTML='<summary>編集操作</summary><div class="compact-options"></div>';controls.append(editBox);editBox.lastElementChild.append($('turn'),$('pass'),$('delete-move'),q('.edit-buttons'));
q('.topline > label').after($('handicap').closest('label'));$('handicap').closest('label').after($('score')); 
editBox.open=false;controls.insertBefore(q('.edit-buttons'),editBox);q('.edit-buttons').append($('undo'),$('redo')); 
const grid=q('.studio-grid'),divider=document.createElement('div');divider.id='board-divider';divider.tabIndex=0;divider.setAttribute('role','separator');divider.setAttribute('aria-orientation','vertical');divider.setAttribute('aria-label','碁盤の幅');divider.title='左右にドラッグして碁盤の幅を変更します。矢印キーでも調整できます';grid.insertBefore(divider,q('.inspector'));
const fit=document.createElement('button');fit.id='board-fit';fit.textContent='画面に合わせる';fit.title='碁盤と右側メニューの幅を標準に戻します';displayBox.lastElementChild.append(fit);
let ratio=.59,autoFit=true;try{const saved=Number(localStorage.getItem('kifu-board-ratio'));if(saved){ratio=saved;autoFit=false;}}catch{}
function resizeBoard(value){ratio=Math.max(.35,Math.min(.76,value));const w=grid.clientWidth,boardWidth=Math.max(380,Math.min(w-352,autoFit?Math.min(w*.59,Math.max(380,innerHeight-355)):w*ratio));grid.style.setProperty('--board-width',boardWidth+'px');divider.setAttribute('aria-valuemin','35');divider.setAttribute('aria-valuemax','76');divider.setAttribute('aria-valuenow',String(Math.round(ratio*100)));}
function saveWidth(){try{localStorage.setItem('kifu-board-ratio',String(ratio));}catch{}}
divider.onpointerdown=e=>{if(e.button!==0)return;divider.setPointerCapture(e.pointerId);autoFit=false;ratio=parseFloat(grid.style.getPropertyValue('--board-width'))/grid.clientWidth;divider.classList.add('dragging');e.preventDefault();};divider.onpointermove=e=>{if(divider.hasPointerCapture(e.pointerId))resizeBoard((e.clientX-grid.getBoundingClientRect().left)/grid.clientWidth);};divider.onpointerup=e=>{if(divider.hasPointerCapture(e.pointerId))divider.releasePointerCapture(e.pointerId);divider.classList.remove('dragging');saveWidth();};divider.onpointercancel=()=>divider.classList.remove('dragging');divider.onkeydown=e=>{if(!['ArrowLeft','ArrowRight','Home'].includes(e.key))return;e.preventDefault();ratio=parseFloat(grid.style.getPropertyValue('--board-width'))/grid.clientWidth;autoFit=e.key==='Home';resizeBoard(e.key==='Home'?.59:ratio+(e.key==='ArrowRight'?.02:-.02));saveWidth();};fit.onclick=()=>{autoFit=true;resizeBoard(.59);try{localStorage.removeItem('kifu-board-ratio');}catch{}};new ResizeObserver(()=>resizeBoard(ratio)).observe(grid);resizeBoard(ratio);
q('.help ul').insertAdjacentHTML('beforeend','<li>パソコンでは碁盤と右側メニューの境界をドラッグして表示幅を調整できます。「盤面表示」の「画面に合わせる」で標準に戻ります。</li><li>金枠と「実・順位」は実戦の次の手を示します。青色は最有力候補です。「終了」はエンジンを終了し、「解析を停止」はエンジンを残して解析だけ止めます。</li>');

q('.workspace-mode').hidden=true;q('.modes').hidden=true;q('.mode-indicator').hidden=true;
const lock=document.createElement('label');lock.className='board-lock';lock.innerHTML='<input id="board-lock" type="checkbox"> 棋譜をロック';q('.topline').append(lock);lock.title='ロック中は棋譜を変更せず、手順の移動と解析ができます';
function syncLock(){const input=$('board-lock');input.checked=!document.body.classList.contains('editing-mode');input.disabled=$('view').disabled;}
$('board-lock').onchange=()=>{$($('board-lock').checked?'view':'edit').click();syncLock();};window.addEventListener('kifu-position-change',syncLock);syncLock();
$('board-edit-options').lastElementChild.append($('insert'),$('cancel-insert'));
const metric=document.createElement('label');metric.className='worst-metric';metric.innerHTML='順位の基準 <select id="worst-metric"><option value="winrate">勝率</option><option value="score">目数差</option></select>';$('analysis-worst').querySelector('h3').after(metric);$('worst-metric').onchange=()=>window.dispatchEvent(new Event('kifu-ranking-change'));
const enginePicker=document.createElement('div');enginePicker.id='engine-picker';enginePicker.hidden=true;enginePicker.setAttribute('role','group');enginePicker.setAttribute('aria-label','エンジンを選択');engineName.after(enginePicker);
const name=$('engine-active-name');name.tabIndex=0;name.setAttribute('role','button');name.setAttribute('aria-expanded','false');name.title='登録済みのエンジンから選択します';
function closePicker(){enginePicker.hidden=true;name.setAttribute('aria-expanded','false');}
function togglePicker(){if(!enginePicker.hidden){closePicker();return;}enginePicker.replaceChildren();for(const option of $('engine-profile').options){if(!option.value)continue;const b=document.createElement('button');b.textContent=option.textContent;b.disabled=$('engine-connect').disabled;b.onclick=()=>{closePicker();$('engine-profile').value=option.value;$('engine-profile').onchange();$('engine-connect').click();};enginePicker.append(b);}enginePicker.hidden=false;name.setAttribute('aria-expanded','true');}
name.onclick=togglePicker;name.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();togglePicker();}};document.addEventListener('pointerdown',e=>{if(!enginePicker.contains(e.target)&&!name.contains(e.target))closePicker();});document.addEventListener('keydown',e=>{if(e.key==='Escape')closePicker();});
q('.help ul').insertAdjacentHTML('beforeend','<li>「棋譜をロック」中は着手や削除ができません。読み込んだ棋譜はロックされ、新しい碁盤・置碁では解除されます。タブ切替はロックや解析の状態を変えません。</li><li>エンジン名を押すと登録済みのエンジンを選べます。選択すると現在の解析を停止してエンジンを切り替えます。</li>');
})();
