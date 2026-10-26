/* Shared keyboard commands and a single-board compact workspace. */
(()=>{'use strict';
 const $=id=>document.getElementById(id),q=s=>document.querySelector(s),api=IndependentGo;
 const body=document.body,main=q('main'),board=q('.board-panel'),block=q('.board-block'),inspector=q('.inspector');
 const bar=document.createElement('nav');bar.id='simple-menu';bar.hidden=true;bar.setAttribute('aria-label','シンプルモードのメニュー');main.prepend(bar);
 const info=document.createElement('div');info.id='simple-info';info.hidden=true;const slide=document.createElement('div');slide.id='simple-slider';slide.hidden=true;block.append(info,slide);
 const title=document.createElement('span');title.id='simple-title';bar.append(title);
 const toggle=document.createElement('button');toggle.id='simple-toggle';toggle.textContent='シンプル表示';toggle.title='碁盤を大きく表示するシンプルモードへ切り替えます';toggle.setAttribute('aria-pressed','false');q('.header-actions').append(toggle);
 const back=document.createElement('button');back.id='simple-return';back.textContent='通常表示';back.title='通常モードに戻ります';bar.append(back);
 const close=document.createElement('button');close.id='simple-panel-close';close.textContent='閉じる';close.title='詳細パネルを閉じて碁盤に戻ります';close.hidden=true;inspector.prepend(close);
 let simple=false,moves=[],menuTracking=false;const menus=[];
 function hideMenus(){menuTracking=false;for(const d of menus)d.open=false;context.hidden=true;}
 function move(el,parent){if(!el)return;const marker=document.createComment('simple-home');el.before(marker);moves.push([el,marker]);parent.append(el);}
 function panel(id){hideMenus();KifuWorkspace.activate(id);if(simple){body.classList.add('simple-panel-open');close.hidden=false;close.focus();}}
 function closePanel(){body.classList.remove('simple-panel-open');close.hidden=true;if(simple)bar.querySelector('summary')?.focus();}
 close.onclick=closePanel;
 function menu(label){const d=document.createElement('details');d.className='simple-menu-group';d.innerHTML='<summary></summary><div class="simple-menu-content"></div>';d.firstElementChild.textContent=label;bar.insertBefore(d,title);menus.push(d);const summary=d.firstElementChild;
 summary.addEventListener('click',e=>{e.preventDefault();const opening=!d.open;hideMenus();if(opening){menuTracking=true;d.open=true;sync();}});
 summary.addEventListener('mouseenter',()=>{if(menuTracking){for(const other of menus)other.open=other===d;sync();}});
 d.addEventListener('toggle',()=>{if(d.open){sync();for(const other of menus)if(other!==d)other.open=false;}});return d.lastElementChild;}
 const proxies=[];
 function action(parent,label,fn,target){const b=document.createElement('button');b.type='button';b.textContent=label;b.onclick=()=>{hideMenus();fn();};parent.append(b);if(target)proxies.push([b,target]);return b;}
 function command(parent,label,id){return action(parent,label,()=>$(id)?.click(),()=>$(id));}
 const file=menu('ファイル'),view=menu('表示'),edit=menu('編集'),analysis=menu('解析'),game=menu('対局'),other=menu('その他');
 command(file,'棋譜を開く (O)','open');action(file,'クリップボードから読み込む (Ctrl+V)',()=>$('paste-board').click());command(file,'画像から局面を取り込む','workspace-image-open');command(file,'棋譜全体を保存','save');command(file,'盤面を印刷','print');action(file,'その他の保存・GIF',()=>panel('storage'));action(file,'棋譜欄・文字コード',()=>panel('record'));
 command(view,'手数の表示／非表示 (M)','numbers');action(view,'座標の表示／非表示 (C)',toggleCoordinates);command(view,'直近手数の表示／非表示','recent');action(view,'コメント・対局情報',()=>openComment());action(view,'手順・変化手順',()=>panel('sequence'));
 const topSlot=document.createElement('div');topSlot.className='simple-top-slot';view.append(topSlot);
 const controlSlot=document.createElement('div');controlSlot.className='simple-control-slot';edit.append(controlSlot);const simpleEditActions=document.createElement('div');simpleEditActions.className='simple-edit-extras';edit.append(simpleEditActions);action(simpleEditActions,'碁石・記号・文字の配置',()=>panel('tools'));action(simpleEditActions,'碁盤をクリア (Ctrl+Home)',()=>q('.clear-board')?.click(),()=>q('.clear-board'));
 command(analysis,'解析の開始／停止 (Space)','analyze-live');action(analysis,'第一候補を着手 (F2)',()=>window.KifuAnalysisControl.playFirst());action(analysis,'候補手・全局解析・グラフ',()=>panel('analysis'));action(analysis,'エンジン',()=>panel('settings'));
 action(game,'対局の設定・開始',()=>panel('match'));command(game,'勝敗判定','score');action(other,'ショートカット一覧',()=>help.showModal());command(other,'このGoKifuStudioについて','about-open');
 const help=document.createElement('dialog');help.id='shortcut-dialog';help.innerHTML='<div class=shortcut-heading><h2>キーボード操作（通常・シンプル共通）</h2><button>閉じる</button></div><table><tbody></tbody></table>';document.body.append(help);help.querySelector('button').onclick=()=>help.close();
 const keys=[['Space','解析の開始・停止'],['Home','初手へ移動（着手前の局面）'],['End','選択中の手順の最終手へ移動'],['Ctrl+Home','碁盤をクリア（確認あり）'],['M','手数の表示・非表示'],['C','座標の表示・非表示'],['O','棋譜を開く'],['↓','1手進む'],['↑','1手戻る'],['ホイールを手前へ','1手進む'],['ホイールを奥へ','1手戻る'],['Shift+↓／Shift+↑','10手進む・戻る'],['F2','第一候補を着手'],['Del','表示中の着手以降を削除'],['Ctrl+V','クリップボードの棋譜を読み込む']];
 for(const [key,text]of keys){const tr=document.createElement('tr');const a=document.createElement('th'),b=document.createElement('td');a.textContent=key;b.textContent=text;tr.append(a,b);help.querySelector('tbody').append(tr);}
 const normalHelp=document.createElement('button');normalHelp.id='shortcuts-open';normalHelp.textContent='キー操作';normalHelp.title='キーボード操作の一覧を表示します';normalHelp.onclick=()=>help.showModal();q('.footer-links').prepend(normalHelp);
 function openComment(){window.KifuSidebar.openNotes();}
 function toggleCoordinates(){const value=!api.getCoordinates();api.setCoordinates(value);document.querySelectorAll('[name="board-coordinates"]').forEach(el=>el.checked=(el.value==='on')===value);}
 for(const [id,key]of [['first','Home'],['last','End'],['numbers','M'],['workspace-open','O']])$(id).title=($(id).title||$(id).textContent)+' ('+key+')';q('.clear-board').title+=' (Ctrl+Home)';q('.coordinate-choice').title='座標の表示・非表示 (C)';
 document.addEventListener('keydown',e=>{if(e.defaultPrevented||e.isComposing||e.altKey||e.metaKey||e.shiftKey||window.KifuInteraction.blocksShortcuts(e.target)||document.querySelector('dialog[open]')||body.classList.contains('scoring-mode'))return;let target,fn;
  if(e.ctrlKey){if(e.key==='Home')target=q('.clear-board');else return;}
  else if(e.key==='Home')target=$('first');else if(e.key==='End')target=$('last');else if(e.key.toLowerCase()==='m')target=$('numbers');else if(e.key.toLowerCase()==='c')fn=toggleCoordinates;else if(e.key.toLowerCase()==='o')target=$('open');else return;
  e.preventDefault();e.stopImmediatePropagation();if(e.repeat)return;hideMenus();if(fn)fn();else if(target&&!target.disabled)target.click();
 },true);
 const context=document.createElement('div');context.id='board-context-menu';context.hidden=true;context.setAttribute('role','group');context.setAttribute('aria-label','碁盤の操作');document.body.append(context);
 for(const [label,id]of [['初手へ移動 (Home)','first'],['最終手へ移動 (End)','last'],['手数の表示／非表示 (M)','numbers'],['取り消し','undo'],['やり直し','redo'],['ここへ挿入','insert'],['削除 (Del)','delete-move'],['棋譜を開く (O)','open'],['クリップボードから読み込む','paste-board'],['棋譜全体を保存','save'],['勝敗判定','score']])command(context,label,id);
 command(context,'解析の開始／停止 (Space)','analyze-live');action(context,'座標の表示／非表示 (C)',toggleCoordinates);action(context,'碁石・記号・文字の配置',()=>panel('tools'));action(context,'碁盤をクリア (Ctrl+Home)',()=>q('.clear-board').click(),()=>q('.clear-board'));action(context,'ショートカット一覧',()=>help.showModal());
 $('board').addEventListener('contextmenu',e=>{e.preventDefault();e.stopImmediatePropagation();hideMenus();if(api.fillHatchedAreaAt(event))return;sync();context.hidden=false;context.style.left=Math.max(4,Math.min(e.clientX,innerWidth-context.offsetWidth-4))+'px';context.style.top=Math.max(4,Math.min(e.clientY,innerHeight-context.offsetHeight-4))+'px';context.querySelector('button:not(:disabled)')?.focus();},true);
 context.addEventListener('keydown',e=>{const bs=[...context.querySelectorAll('button:not(:disabled)')];const i=bs.indexOf(document.activeElement);if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();e.stopPropagation();bs[(i+(e.key==='ArrowDown'?1:bs.length-1))%bs.length]?.focus();}});
 document.addEventListener('pointerdown',e=>{if(!bar.contains(e.target)&&!context.contains(e.target))hideMenus();});document.addEventListener('keydown',e=>{if(e.key==='Escape'){hideMenus();if(simple)closePanel();}});
 document.addEventListener('click',e=>{if(!e.target.closest('#simple-menu>details>summary')){menuTracking=false;if(!e.target.closest('.simple-menu-content'))hideMenus();}});
 inspector.addEventListener('click',e=>{if(simple&&e.target.closest('[data-tool],.close-tools'))closePanel();});
 function sync(){title.textContent=q('.game-title').textContent;title.title=title.textContent;for(const [b,get]of proxies){const t=get();b.disabled=!t||t.disabled;}
  for(const id of ['black-captures','white-captures']){const el=$(id),num=el.textContent.replace(/アゲハマ\s*/,'');const text=num;if(el.textContent!==text)el.textContent=text;el.setAttribute('aria-label',(id==='black-captures'?'黒':'白')+'のアゲハマ '+num);}
 }

 let nativeQueue=Promise.resolve(),lastNativeWidth=null,nativeTimer;
 function desiredWidth(){return Math.max(360,Math.floor(innerHeight-bar.getBoundingClientRect().height-info.getBoundingClientRect().height-slide.getBoundingClientRect().height-14)+12);}
 function resizeNative(value,force=false){
  const invoke=window.__TAURI_INTERNALS__?.invoke;if(!invoke)return;
  const width=value?desiredWidth():0;
  if(!force&&lastNativeWidth===width)return;
  lastNativeWidth=width;clearTimeout(nativeTimer);
  const run=()=>{nativeQueue=nativeQueue.catch(()=>{}).then(()=>invoke('desktop_simple_window',{simple:value,width})).catch(error=>{console.error('Window resize:',error);});};
  if(force)run();else nativeTimer=setTimeout(run,100);
 }
 function setMode(value){if(simple===value)return;hideMenus();closePanel();if(value)window.KifuSidebar?.enterSimple();simple=value;body.classList.toggle('simple-mode',value);bar.hidden=info.hidden=slide.hidden=!value;toggle.setAttribute('aria-pressed',String(value));
  if(value){$('edit').click();move(q('.topline'),topSlot);move(q('.side-protection'),topSlot);move(q('.controls'),controlSlot);for(const selector of ['#black-name','#black-captures','.stones','#white-captures','#white-name','#komi','#move'])move(q(selector),info);move($('slider'),slide);}
  else{for(const [el,marker]of moves.reverse()){marker.replaceWith(el);}moves=[];window.KifuSidebar?.leaveSimple();q('.canvas-wrap').style.removeProperty('--fit-board-size');}
  try{localStorage.setItem('gokifu-simple',value?'1':'0');}catch{}sync();resizeNative(value,true);window.dispatchEvent(new Event('resize'));window.dispatchEvent(new Event('workspace-layout'));fit();
 }
 function fit(){if(!simple)return;const wrap=q('.canvas-wrap');const available=Math.max(80,Math.min(innerWidth-12,innerHeight-bar.getBoundingClientRect().height-info.getBoundingClientRect().height-slide.getBoundingClientRect().height-14));const size=Math.floor(available);wrap.style.setProperty('--fit-board-size',size+'px');info.style.width=Math.max(size,Math.min(680,innerWidth-12))+'px';slide.style.width=size+'px';main.style.setProperty('--simple-board-edge',size+'px');resizeNative(true);}
 toggle.onclick=()=>setMode(true);back.onclick=()=>setMode(false);
 window.addEventListener('resize',fit);window.addEventListener('kifu-position-change',()=>{sync();fit();});window.addEventListener('workspace-layout',()=>{if(simple)fit();});
 new ResizeObserver(fit).observe(bar);document.fonts?.ready.then(fit);let restore=false;try{restore=localStorage.getItem('gokifu-simple')==='1';}catch{}if(restore)setMode(true);
 window.KifuSimple={setMode,openPanel:panel};
 if(window.__TAURI_INTERNALS__?.invoke)requestAnimationFrame(()=>requestAnimationFrame(()=>nativeQueue.finally(()=>window.__TAURI_INTERNALS__.invoke('desktop_ready',{simple})).catch(console.error)));
})();
