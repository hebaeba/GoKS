/* Workspace composition. Editing layout enables board editing. */
(()=>{'use strict';
const $=id=>document.getElementById(id),q=s=>document.querySelector(s),api=IndependentGo;
const inspector=q('.inspector'),settings=$('pane-settings'),analysis=$('pane-analysis');
settings.innerHTML='<h2>エンジン・接続の設定</h2>';
settings.append($('engine-settings'),q('.engine-actions'),$('engine-notice'),$('engine-error'),q('.engine-log'));
const dock=document.createElement('section');dock.className='engine-dock';dock.setAttribute('aria-label','解析エンジンの状態と操作');
dock.append($('engine-active'),q('.engine-actions'),q('.analysis-primary'),q('.analysis-conditions'));
const status=document.createElement('div');status.className='engine-compact-status';status.append($('engine-state'));
const config=document.createElement('button');config.id='engine-settings-open';config.textContent='エンジン設定';config.onclick=()=>KifuWorkspace.activate('settings');status.append(config);dock.prepend(status);
const navigation=document.createElement('div');navigation.className='inspector-navigation';inspector.prepend(navigation);navigation.append(q('.workspace-mode'),q('.workspace-tabs'));navigation.after(dock);$('engine-connect').title='選択したエンジンを起動し、解析の準備をします';
q('.analysis-heading').remove();
// Only detailed startup messages stay beside configuration. The common dock stays visible.
const compact=document.createElement('p');compact.id='engine-compact-message';compact.setAttribute('role','status');dock.append(compact);
const sync=()=>{const state=$('engine-notice').dataset.state;compact.textContent=$('engine-notice-title').textContent+(['starting','tuning','error'].includes(state)?'：'+$('engine-notice-message').textContent:'');};new MutationObserver(sync).observe($('engine-notice'),{subtree:true,childList:true,characterData:true});sync();
// Full-game controls are secondary and follow the graph.
analysis.append($('analysis-batch'));
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
})();
