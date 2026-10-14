/* KataGo UI. Engine results only: no synthetic data in production. */
'use strict';
(()=>{
const $=id=>document.getElementById(id),A=KifuAnalysis,api=IndependentGo,pane=$('pane-analysis');
pane.innerHTML=`<div class="analysis-heading"><h2>KataGo解析</h2><span id="engine-state">未接続</span></div>
<div id="engine-active" role="status"><small>使用中のエンジン</small><strong id="engine-active-name">未接続</strong></div>
<section id="engine-notice" data-state="idle" role="status" aria-live="polite"><strong id="engine-nearby-name" hidden></strong><strong id="engine-notice-title">エンジン未接続</strong><p id="engine-notice-message">設定を選んで「起動・接続」を押してください。</p><small id="engine-elapsed" aria-live="off"></small></section>
<details id="engine-settings" open><summary>エンジンの設定</summary><p class="analysis-note">Windows上のKataGoとモデルを指定します。GPU版にも切り替えられます。</p>
<div class="engine-profiles"><label>エンジンリスト<select id="engine-profile"><option value="">新しく登録する</option></select></label>
<label>エンジンの名前<input id="engine-name" maxlength="100" placeholder="例：CPU・軽量モデル／TensorRT・検討用"></label>
<div class="analysis-buttons"><button id="engine-profile-new" title="入力欄を空にして、別の設定を登録します">新規</button><button id="engine-profile-edit" disabled title="選択したエンジンの名前・実行ファイル・モデル・cfgを編集します">編集</button><button id="engine-profile-save" title="名前と３項目をこのブラウザーに保存します">リストに追加</button><button id="engine-profile-delete" disabled title="選択した登録だけを削除します。ファイルは削除しません">削除</button></div>
<p id="engine-profile-message" class="analysis-note" role="status">登録内容はこの端末のブラウザーに保存します。選択後「起動・接続」で起動します。</p></div>
<label>実行ファイル（フルパス）<input id="engine-exe" placeholder="C:\\KataGo\\katago.exe" spellcheck="false"></label><button type="button" id="engine-pick-exe" class="engine-pick" title="端末内からファイルを選択します">参照…</button>
<label>モデル（.bin.gzなど）<input id="engine-model" placeholder="C:\\KataGo\\weights\\model.bin.gz" spellcheck="false"></label><button type="button" id="engine-pick-model" class="engine-pick" title="端末内からファイルを選択します">参照…</button>
<label>解析用.cfg（省略すると同梱のCPU向け設定）<input id="engine-config" placeholder="空欄で標準設定" spellcheck="false"></label><button type="button" id="engine-pick-config" class="engine-pick" title="端末内からファイルを選択します">参照…</button>
<div class="analysis-buttons"><button id="engine-connect">起動・接続</button><button id="engine-disconnect" disabled>エンジン終了</button></div>
<p id="engine-platform" class="analysis-note"></p></details>
<div class="analysis-conditions"><label>ルール<select id="analysis-rules"><option value="japanese">日本ルール</option><option value="chinese">中国ルール</option></select></label><label>読み筋の表示手数<select id="analysis-pv-length" title="候補手の読み筋を取得・表示する最大手数です。探索の深さを制限する設定ではありません。"><option value="5">5手</option><option value="10">10手</option><option value="15">15手</option><option value="20" selected>20手</option><option value="30">30手</option></select></label><span class="analysis-visits" title="現在表示している局面の解析結果に含まれる総訪問数です。候補手１つの訪問数ではありません。">訪問数 <output id="analysis-visits">—</output><small id="analysis-visits-state">未解析</small></span></div>
<p id="analysis-context" class="analysis-note"></p>
<div class="analysis-buttons analysis-primary"><button id="analyze-live" disabled aria-pressed="false" title="局面に追従して解析を続けます。スペースキーでも開始・停止できます。">解析を開始</button><span>スペースキーで開始／停止</span></div>
<p class="analysis-note">解析は時間制限なしで続け、着手・手戻り・変化の切り替えに追従します。文字入力中とダイアログ表示中は通常のキー操作を優先します。ボタンはEnterでも操作できます。</p>
<details id="analysis-batch"><summary>全局解析・時間設定</summary><p class="analysis-note">選択中の本譜または変化を順に解析して、全局グラフを作ります。時間設定は全局解析だけに適用します。</p><div class="analysis-batch-settings"><label>１局面の時間<select id="analysis-seconds"><option value="0.1">0.1秒（簡単）</option><option value="0.5">0.5秒</option><option value="1" selected>１秒</option><option value="3">３秒</option><option value="5">５秒</option><option value="custom">指定する</option></select></label><label id="analysis-custom-label" hidden><input id="analysis-custom" type="number" min="0.1" max="600" step="0.1" value="10" aria-label="全局解析の１局面の秒数">秒</label><button id="analyze-all" disabled title="選択中の手順を各局面の指定時間で解析します">全局解析を開始</button></div></details>
<progress id="analysis-progress" value="0" max="1" hidden></progress><p id="analysis-status" role="status">エンジン未接続でも、保存済み解析を読み込んで閲覧できます。</p>
<div id="engine-error" role="alert" hidden><strong>起動・接続エラー</strong><pre id="engine-error-text"></pre></div><p id="analysis-stale" class="analysis-warning" hidden></p>
<div id="analysis-summary" class="analysis-summary"><span><span id="analysis-winrate-label">黒勝率</span> <strong id="analysis-winrate">—</strong></span><span>目数差 <strong id="analysis-score">—</strong></span></div>
<div class="analysis-graph-heading"><h3>全局グラフ</h3><select id="analysis-metric" aria-label="グラフの種類"><option value="winrate">黒の勝率</option><option value="scoreLead">黒から見た目数差</option></select></div>
<p id="analysis-run-info" class="analysis-note" role="status"></p><svg id="analysis-graph" viewBox="0 0 480 190" role="img" aria-label="解析済み局面のグラフ"></svg>
<label class="analysis-seek">解析済み局面 <input id="analysis-seek" type="range" min="0" max="0" value="0" disabled><output id="analysis-seek-value">—</output></label>
<div class="analysis-legend">青：最有力候補 ／ 金枠：実戦の次の手 ／ 赤印：直前の着手</div><p id="analysis-played" class="analysis-note"></p><h3>候補手 <small id="candidate-perspective-note"></small></h3><details id="candidate-settings"><summary>候補手の表示設定</summary><div class="candidate-setting-fields"><label>盤上の表示数<select id="candidate-count"><option value="0">非表示</option><option value="5">５手</option><option value="10">10手</option><option value="20">20手</option><option value="50">50手</option><option value="100">100手</option><option value="-1">無限大（全候補）</option></select></label><label>表示項目<select id="candidate-detail"><option value="2">２列：勝率・目数差</option><option value="3">３列：勝率・訪問数・目数差</option></select></label><label>数値の視点<select id="candidate-perspective"><option value="black">黒から見た値</option><option value="turn">手番側から見た値</option></select></label></div><p class="analysis-note">順位はKataGoの推奨順。青は１位。ほかの色は１位との差（手番側の目数評価）で、0.5目以内は緑、２目以内は黄、２目を超えるとオレンジです。訪問数が少ない評価は変動しやすく、色は確定した善悪を表しません。設定はこの端末のブラウザーに保存します。</p></details><p id="candidate-count-note" class="analysis-note"></p><div class="candidate-scroll"><table class="candidate-table"><thead><tr><th>順位</th><th>着点</th><th id="candidate-winrate-heading">黒勝率</th><th>目数差</th><th>訪問数</th><th>実戦</th></tr></thead><tbody id="analysis-candidates"></tbody></table></div><p id="analysis-pv" class="analysis-note">候補手にマウスを重ねると読み筋、クリック／タップで編集・着手します。</p>
<div class="analysis-buttons analysis-files"><button id="analysis-save" disabled>解析を保存</button><button id="analysis-open">保存済み解析を開く</button><input id="analysis-file" type="file" accept=".json,application/json" hidden></div>
<p class="analysis-note">棋譜・選択中の変化・解析条件・結果をまとめて保存します。スマホでもエンジンなしで閲覧できます。</p>
<details class="engine-log"><summary>接続ログ</summary><pre id="engine-log"></pre></details>`;
// Keep candidate data adjacent to the board; graph follows it.
const candidateBlock=document.createElement('section');candidateBlock.className='candidate-block';
const first=pane.querySelector('.analysis-legend'),last=$('analysis-pv');let moving=first;
while(moving){const next=moving.nextElementSibling;candidateBlock.append(moving);if(moving===last)break;moving=next;}
pane.querySelector('.analysis-graph-heading').before(candidateBlock);
// Follow the input flow: saved profile, paths, name, registration, launch, status.
const registration=document.createElement('div');registration.className='engine-registration';
registration.append($('engine-name').parentElement,$('engine-profile-message'));
$('engine-pick-config').after(registration);
for(const kind of ['exe','model','config']){const input=$('engine-'+kind),label=input.parentElement,row=document.createElement('div');row.className='engine-path-row';label.htmlFor=input.id;label.after(row);row.append(input,$('engine-pick-'+kind));}
$('engine-settings').after($('engine-connect').parentElement);$('engine-connect').parentElement.classList.add('engine-actions');
$('engine-connect').parentElement.after($('engine-notice'));
const overlay=document.createElementNS('http://www.w3.org/2000/svg','svg');overlay.id='analysis-overlay';overlay.setAttribute('aria-hidden','true');document.querySelector('.canvas-wrap').append(overlay);
let running=false,ready=false,polling=false,session=null,results=new Map(),active=null,engineMeta=null,handshake=null,selectedCandidate=0,logs=[],timer=null,unsaved=false,pendingCalls=0,lastRu=null,previewLine=null;
let stopping=null,live=false,liveTarget='',followVersion=0,followTimer=null,followQueue=Promise.resolve();
let startupAt=0,startupPhase='idle',startupName='';
const displayKey='kifu-candidate-display-v1';
let display={count:5,detail:2,perspective:'black'};
try{const saved=JSON.parse(localStorage.getItem(displayKey)||'null');if(saved){if([0,5,10,20,50,100,-1].includes(saved.count))display.count=saved.count;if([2,3].includes(saved.detail))display.detail=saved.detail;if(['black','turn'].includes(saved.perspective))display.perspective=saved.perspective;}}catch{}
for(const name of ['count','detail','perspective']){const e=$('candidate-'+name);e.value=String(display[name]);e.onchange=()=>{display[name]=name==='perspective'?e.value:Number(e.value);try{localStorage.setItem(displayKey,JSON.stringify(display));}catch{}clearPreview();renderResult();};}

const native=()=>window.__TAURI_INTERNALS__?.invoke,token=document.querySelector('meta[name="kifu-local-token"]')?.content;
const available=!!native()||!!token||!!window.KifuRemote;
$('engine-platform').textContent=available?'エンジンのフォルダーにDLLを置いたまま、実行ファイルとモデルのパスを指定してください。':'この開き方ではKataGoを起動できません。Windowsでは「Windowsで解析を起動.cmd」を使ってください。Tauri版でも接続できます。';
$('engine-connect').disabled=!available;
try{const saved=JSON.parse(localStorage.getItem('kifu-engine-paths-v1')||'null');if(saved)for(const key of ['exe','model','config'])$('engine-'+key).value=String(saved[key]||'');}catch{}
const profileKey='kifu-engine-profiles-v1';
let profiles=[];
try{const data=JSON.parse(localStorage.getItem(profileKey)||'[]');if(Array.isArray(data))profiles=data.filter(p=>p&&typeof p.id==='string'&&typeof p.name==='string'&&['exe','model','config'].every(k=>typeof p[k]==='string'));}catch{}
function profileMessage(text){$('engine-profile-message').textContent=text;}
function paths(){return Object.fromEntries(['exe','model','config'].map(k=>[k,$('engine-'+k).value.trim().replace(/^"|"$/g,'')]));}
function renderProfiles(selected=''){$('engine-settings').classList.remove('profile-editing');$('engine-profile').replaceChildren(new Option('新しく登録する',''));for(const p of profiles)$('engine-profile').append(new Option(p.name,p.id));$('engine-profile').value=selected;$('engine-profile-save').textContent=selected?'登録を更新':'リストに追加';$('engine-profile-delete').disabled=!selected;}
function writeProfiles(next){try{localStorage.setItem(profileKey,JSON.stringify(next));profiles=next;return true;}catch{profileMessage('保存できませんでした。ブラウザーの保存容量や設定を確認してください。');return false;}}
function saveProfile(){const config=paths(),name=$('engine-name').value.trim();if(!name){profileMessage('エンジンの名前を入力してください。');$('engine-name').focus();return false;}if(!config.exe||!config.model){profileMessage('実行ファイルとモデルを指定してください。cfgは省略できます。');return false;}
const selected=$('engine-profile').value,duplicate=profiles.find(p=>p.name===name&&p.id!==selected);if(duplicate){profileMessage('同じ名前が登録されています。別の名前にするか、リストからその設定を選んで更新してください。');return false;}
const entry={id:selected||uid(),name,...config},next=selected?profiles.map(p=>p.id===selected?entry:p):[...profiles,entry];if(!writeProfiles(next))return false;renderProfiles(entry.id);profileMessage('「'+name+'」を保存しました。次回もリストから選べます。');controls();return true;}
$('engine-profile-save').onclick=saveProfile;
$('engine-profile-edit').onclick=()=>{if(running||pendingCalls>0||!$('engine-profile').value)return;$('engine-settings').open=true;$('engine-settings').classList.add('profile-editing');$('engine-profile-save').textContent='編集内容を保存';profileMessage('名前・実行ファイル・モデル・cfgを変更し、リスト直下の「編集内容を保存」を押してください。変更を取り消す場合はリストから同じ登録を選び直してください。');$('engine-name').focus();$('engine-name').scrollIntoView({block:'nearest'});};
$('engine-profile').onchange=()=>{const p=profiles.find(p=>p.id===$('engine-profile').value);$('engine-name').value=p?.name||'';for(const k of ['exe','model','config'])$('engine-'+k).value=p?.[k]||'';renderProfiles(p?.id||'');controls();profileMessage(p?'「'+p.name+'」を読み込みました。「起動・接続」で起動します。':'名前と設定を入力してください。');};
$('engine-profile-new').onclick=()=>{$('engine-profile').value='';$('engine-profile').onchange();$('engine-exe').focus();};
$('engine-profile-delete').onclick=()=>{const p=profiles.find(p=>p.id===$('engine-profile').value);if(!p||!confirm('「'+p.name+'」をエンジンリストから削除しますか？'))return;if(writeProfiles(profiles.filter(v=>v.id!==p.id))){renderProfiles();$('engine-name').value='';profileMessage('登録を削除しました。入力欄のパスと端末内のファイルは残しています。');controls();}};
renderProfiles();
const restored=profiles.find(p=>['exe','model','config'].every(k=>p[k]===paths()[k]));if(restored){renderProfiles(restored.id);$('engine-name').value=restored.name;}
function engineState(state,title,message){$('engine-active-name').textContent=['starting','tuning','ready'].includes(state)?startupName||'KataGo':'未接続';$('engine-active').dataset.state=state;$('engine-nearby-name').hidden=!['starting','tuning','ready'].includes(state);$('engine-nearby-name').textContent=startupName||'KataGo';startupPhase=state;$('engine-notice').dataset.state=state;$('engine-notice-title').textContent=title;$('engine-notice-message').textContent=message;$('engine-state').textContent=title;$('engine-state').dataset.state=state;$('engine-elapsed').textContent='';}
function startingStatus(){if(!['starting','tuning'].includes(startupPhase))return;const text='経過 '+Math.floor((Date.now()-startupAt)/1000)+'秒';if($('engine-elapsed').textContent!==text)$('engine-elapsed').textContent=text;}
function startupLog(text){if(!['starting','tuning'].includes(startupPhase))return;if(/(?:tuning|autotun|building.*(?:engine|plan)|(?:engine|plan).*building|compiling.*(?:kernel|model))/i.test(text)&&!/(?:skip|not |no |disabled|loaded|finished|completed)/i.test(text))engineState('tuning','ただいまチューニング中です','エンジンの最適化・初期化を行っています。しばらくお待ちください。初回は数分以上かかることがあります。');}
function note(text){$('analysis-status').textContent=text;}
function log(text){startupLog(String(text));logs.push(String(text));logs=logs.slice(-120);$('engine-log').textContent=logs.join('\n');}
function engineError(message){if(!ready)engineState('error','起動・接続エラー','下のエラー内容と接続ログを確認してください。');$('engine-error').hidden=false;$('engine-error-text').textContent=message+'\n\n'+logs.slice(-20).join('\n');document.querySelector('.engine-log').open=true;note(message);$('engine-error').scrollIntoView({block:'nearest'});}
for(const kind of ['exe','model','config'])$('engine-pick-'+kind).onclick=async()=>{pendingCalls++;controls();try{const picked=await call('pick',{kind});if(picked.path){$('engine-'+kind).value=picked.path;$('engine-error').hidden=true;}}catch(e){engineError(e.message);}finally{pendingCalls--;controls();}};
async function call(action,payload={}){if(window.KifuRemote)return window.KifuRemote.call(action,payload);if(native())return native()('engine_call',{action,payload});if(!token)throw Error('Windowsの解析用ランチャーまたはTauri版から起動してください。');const response=await fetch('/api/engine',{method:'POST',headers:{'Content-Type':'application/json','X-Kifu-Token':token},body:JSON.stringify({action,payload})});const data=await response.json();if(!data.ok)throw Error(data.error||'接続エラー');return data.result;}
function uid(){return 'kifu-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,10);}
function snap(){try{return api.peekAnalysisSnapshot();}catch{return null;}}
function matches(){const s=snap();return session&&s&&A.identity(s)===A.identity(session.snapshot)&&$('analysis-rules').value===session.rules;}
function controls(){
 const busy=!!active||live;
 $('analyze-live').disabled=!ready||pendingCalls>0;
 $('analyze-live').textContent=busy?'解析を停止':'解析を開始';$('analyze-live').setAttribute('aria-pressed',String(busy));
 $('analyze-live').title=busy?'実行中の解析を停止します。エンジンの接続は維持します':'時間制限なしで現在の局面を解析し、局面の移動に追従します';
 $('analyze-all').disabled=!ready||busy||pendingCalls>0;$('analyze-all').textContent=active&&!live?'全局解析中…':'全局解析を開始';
 $('analysis-pv-length').disabled=busy;$('engine-disconnect').disabled=!running;$('engine-connect').disabled=!available||running||pendingCalls>0;
 for(const key of ['exe','model','config']){$('engine-'+key).disabled=running||pendingCalls>0;$('engine-pick-'+key).disabled=!available||running||pendingCalls>0;}
 for(const id of ['engine-profile','engine-name','engine-profile-new','engine-profile-save'])$(id).disabled=running||pendingCalls>0;
 $('engine-profile-edit').disabled=running||pendingCalls>0||!$('engine-profile').value;$('engine-profile-delete').disabled=running||pendingCalls>0||!$('engine-profile').value;
 for(const id of ['analysis-rules','analysis-seconds','analysis-custom'])$(id).disabled=busy;
 $('analysis-save').disabled=!results.size;$('analysis-open').disabled=busy;
 updateVisits();
}
function updateVisits(){
 const s=snap(),item=matches()?results.get(s.index):null;
 const querying=!!active&&s&&active.plan[active.cursor]?.index===s.index&&A.identity(s)===A.identity(active.snapshot);
 const fresh=!querying||item?.queryId===active.id;
 $('analysis-visits').textContent=item&&fresh?Math.round(item.result.rootInfo.visits).toLocaleString('ja-JP'):querying?'0':'—';
 $('analysis-visits-state').textContent=querying?(item&&fresh?'解析中':'解析待ち'):item?'保存済み／停止中':'未解析';
}
function displayState(){const s=snap();if(!s)return;const ru=GoSgf.parse(s.sgf).root.props.RU?.[0]||'';const mapped=A.effectiveRules(ru);if(lastRu!==ru&&!active){lastRu=ru;if(mapped)$('analysis-rules').value=mapped;}$('analysis-context').textContent=s.size+'路 / コミ'+s.komi+' / 選択中の手順 '+api.getMove()+'手'+(mapped&&mapped!==$('analysis-rules').value?'（棋譜のルールと解析条件が異なります）':'')+'。全局解析は選択中の本譜または変化が対象です。';
$('analysis-stale').hidden=!session||matches();$('analysis-stale').textContent='棋譜・変化・解析ルールが保存結果と異なります。盤上の候補手を消しています。解析をやり直すか、保存ファイルを開いてください。';renderResult();renderGraph();}
function clearPreview(){previewLine=null;api.clearAnalysisPreview();overlay.classList.remove('preview-active');}
function hoverCandidate(m,s,i){
 if(pane.hidden)return;selectedCandidate=i;
 const pv=m.pv.length?m.pv:[m.move],result=A.preview(s,pv,pv.length);
 if(!api.previewAnalysis(result))return;
 previewLine={sgf:s.sgf,path:JSON.stringify(s.path),index:s.index};overlay.classList.add('preview-active');
 $('analysis-pv').textContent='読み筋 '+result.applied+'手（マウスを外すと戻ります）。クリックすると候補手の１手だけを着手します。'+(result.error?' 再現できる手まで表示しています。':'');
}
function leaveCandidate(){clearPreview();}
function playCandidate(m,s){clearPreview();try{api.playAnalysisMove(A.point(m.move,s.size),s);}catch(e){note(e.message);}displayState();}
function bindCandidate(element,m,s,i){
 element.addEventListener('pointerenter',e=>{if(e.pointerType!=='touch')hoverCandidate(m,s,i);});
 element.addEventListener('pointerleave',leaveCandidate);
 element.addEventListener('focus',()=>hoverCandidate(m,s,i));element.addEventListener('blur',leaveCandidate);
 element.onclick=e=>{e.stopPropagation();playCandidate(m,s);};
 if(element.tagName.toLowerCase()!=='button')element.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();playCandidate(m,s);}};
}
window.addEventListener('blur',clearPreview);
function svgElement(tag,attrs,text,parent=overlay){const e=document.createElementNS(overlay.namespaceURI,tag);for(const [k,v] of Object.entries(attrs))e.setAttribute(k,v);if(text!==undefined)e.textContent=text;parent.append(e);return e;}
function renderResult(){
 const s=snap(),item=matches()?results.get(s.index):null;
 updateVisits();
 if(previewLine&&(previewLine.sgf!==s?.sgf||previewLine.path!==JSON.stringify(s?.path)||previewLine.index!==s?.index||!item||pane.hidden))clearPreview();
 if(previewLine)return; // Keep pointer targets stable while the engine updates results.
 api.clearAnalysisPreview();
 $('analysis-candidates').replaceChildren();overlay.replaceChildren();$('analysis-winrate').textContent='—';$('analysis-score').textContent='—';$('analysis-played').textContent='';$('analysis-pv').textContent='候補手にマウスを重ねると読み筋を表示します。クリック／タップすると編集モードでその１手を着手します。';$('candidate-count-note').textContent='';if(!item)return;
 const r=item.result,position=A.positionAt(s),actual=position.next?.move;
 const viewWhite=display.perspective==='turn'&&position.state.turn===2,side=viewWhite?'白':'黒';const win=m=>((viewWhite?1-m.winrate:m.winrate)*100).toFixed(1);const lead=m=>((viewWhite?-1:1)*m.scoreLead);const leadText=m=>(lead(m)>=0?'+':'−')+Math.abs(lead(m)).toFixed(1);$('analysis-winrate-label').textContent=side+'勝率';$('candidate-winrate-heading').textContent=side+'勝率';$('candidate-perspective-note').textContent=side+'視点：勝率％／目数差（＋は'+side+'有利）';$('analysis-winrate').textContent=win(r.rootInfo)+'%';$('analysis-score').textContent=scoreText(r.rootInfo.scoreLead);
 const moves=r.moveInfos;if(selectedCandidate>=moves.length)selectedCandidate=0;
 const actualRank=r.moveInfos.findIndex(m=>m.move===actual);
 $('analysis-played').textContent=actual?'実戦の次の手：'+(position.next.color==='B'?'黒 ':'白 ')+(actual==='pass'?'パス':actual)+(actualRank<0?'（今回の候補結果にありません）':' ／ 推奨順位 '+(actualRank+1)+'位'):'この局面の後に記録された実戦手はありません。';
 moves.forEach((m,i)=>{const tr=document.createElement('tr'),button=document.createElement('button');button.textContent=m.move==='pass'?'パス':m.move;button.title='マウスオーバーで読み筋、クリックで編集・着手';bindCandidate(button,m,s,i);const cells=[String(i+1),button,win(m)+'%',leadText(m),String(m.visits),m.move===actual?'実戦':'' ];for(const val of cells){const td=document.createElement('td');typeof val==='string'?td.textContent=val:td.append(val);tr.append(td);}tr.classList.toggle('candidate-selected',i===selectedCandidate);tr.classList.toggle('candidate-actual',m.move===actual);$('analysis-candidates').append(tr);});
 const chosen=moves[selectedCandidate];if(chosen)$('analysis-pv').textContent='候補'+(selectedCandidate+1)+'：'+(chosen.pv.length?chosen.pv.map(v=>v==='pass'?'パス':v).join(' → '):'読み筋なし')+(r.isDuringSearch?'（探索中の結果）':'');
 const shown=moves.filter(m=>m.move!=='pass').slice(0,display.count<0?undefined:display.count);$('candidate-count-note').textContent='盤上 '+shown.length+'手 ／ 取得済み '+moves.length+'候補（一覧はすべて表示）'+(display.count===0?'。候補は非表示。実戦手の枠と直前の着手印は残します。':'。実戦手の枠は表示数に含みません。'+(display.count<0?'無限大は取得済みの全候補です。パスは一覧に表示します。':''));
 const {extent,start,gap}=s.geometry;overlay.setAttribute('viewBox',`0 0 ${extent} ${extent}`);
 const xy=p=>{p=api.displayPoint(p);return {x:start+(p%s.size)*gap,y:start+Math.floor(p/s.size)*gap};};
 if(actual&&actual!=='pass'){const p=A.point(actual,s.size),{x,y}=xy(p);svgElement('rect',{class:'actual-move-frame',x:x-gap*.48,y:y-gap*.48,width:gap*.96,height:gap*.96,rx:gap*.15,fill:'none',stroke:'#a65a00','stroke-width':gap*.065,'stroke-dasharray':actualRank<0?'3 2':'none'});}
 shown.forEach(m=>{const i=moves.indexOf(m);const p=A.point(m.move,s.size);if(p===null)return;const {x,y}=xy(p),g=svgElement('g',{class:'candidate-mark',role:'button',tabindex:0,'aria-label':'候補'+(i+1)+' '+m.move+' '+side+'勝率'+win(m)+'%' });
 svgElement('title',{},'候補'+(i+1)+' '+m.move+' / '+side+'勝率 '+win(m)+'% / '+side+'視点 '+leadText(m)+'目 / 訪問数 '+m.visits+'回。マウスオーバーで読み筋、クリックで編集・着手',g);
 svgElement('circle',{cx:x,cy:y,r:gap*.49,fill:A.candidateColor(m,moves[0],position.state.turn,i),stroke:i===0?'#045771':'#748839','stroke-width':1},undefined,g);
 const values=display.detail===3?[win(m),A.shortVisits(m.visits),leadText(m)]:[win(m),leadText(m)];const ys=display.detail===3?[-.28,.055,.35]:[-.20,.22];values.forEach((v,row)=>svgElement('text',{x,y:y+gap*ys[row],class:'candidate-value','text-anchor':'middle','dominant-baseline':'central','font-size':gap*(display.detail===3?(row===0?.36:.31):.39),'font-weight':800,fill:i===0?'#ffffff':'#071f18'},v,g));
 for(const text of g.querySelectorAll('.candidate-value'))if(text.getComputedTextLength()>gap*.80){text.setAttribute('textLength',gap*.80);text.setAttribute('lengthAdjust','spacingAndGlyphs');}
 const badgeWidth=gap*(i>=99?.50:i>=9?.38:.28);
 svgElement('rect',{class:'candidate-rank-badge',x:x+gap*.32,y:y-gap*.65,width:badgeWidth,height:gap*.30,rx:gap*.07,fill:'#fff',stroke:'#31554a','stroke-width':.5},undefined,g);
 svgElement('text',{class:'candidate-rank',x:x+gap*.32+badgeWidth/2,y:y-gap*.50,'text-anchor':'middle','dominant-baseline':'central','font-size':gap*.24,fill:'#154b43'},i+1,g);
 bindCandidate(g,m,s,i);
 });
 // app.js already renders the latest move number or mark; do not cover it with another ring.

}
$('analysis-seconds').onchange=()=>{$('analysis-custom-label').hidden=$('analysis-seconds').value!=='custom';controls();};
function progressText(){if(!active)return;if(active.infinite){note((live?'連続・無限解析中 ／ ':'無限解析中 ／ ')+active.plan[0].move+'手の局面 ／ 経過 '+Math.floor((Date.now()-active.started)/1000)+'秒。「解析を停止」またはスペースキーで停止します。');return;}const elapsed=(Date.now()-active.started)/1000,left=active.cursor?elapsed/active.cursor*(active.plan.length-active.cursor):active.seconds*active.plan.length;note('解析済み '+active.cursor+' / '+active.plan.length+'局面 ／ 経過 '+elapsed.toFixed(1)+'秒 ／ 残り約 '+Math.ceil(left)+'秒'+(active.plan[0].reset?'（配置変更前のコウ履歴・アゲハマは含みません）':''));}
function scoreText(n){return n===0?'互角':(n>0?'黒＋':'白＋')+Math.abs(n).toFixed(1);}
function renderGraph(){const run=session?.analysisRun;$('analysis-run-info').textContent=run?(run.scope==='all'?'全局':run.scope==='live'?'連続':'現在局面')+'解析 ／ '+(session.rules==='japanese'?'日本ルール':'中国ルール')+' ／ １局面 '+(run.infinite?'無限':run.seconds+'秒')+' ／ 開始 '+new Date(run.started).toLocaleTimeString('ja-JP')+' ／ '+results.size+'局面'+(active?'（更新中）':''):results.size?'保存済み解析（解析開始時刻の記録なし）':'';const svg=$('analysis-graph');svg.replaceChildren();const list=[...results.values()].sort((a,b)=>a.index-b.index),metric=$('analysis-metric').value;const elt=(tag,attrs,text)=>{const e=document.createElementNS(svg.namespaceURI,tag);for(const [k,v]of Object.entries(attrs))e.setAttribute(k,v);if(text!==undefined)e.textContent=text;svg.append(e);return e;};
const maxMove=Math.max(1,...list.map(p=>p.move),...(active?.plan||[]).map(p=>p.move)),extent=metric==='winrate'?1:Math.max(10,...list.map(p=>Math.abs(p.result.rootInfo.scoreLead))),low=metric==='winrate'?0:-extent,high=extent;
const x=m=>44+406*m/maxMove,y=v=>155-125*(v-low)/(high-low);for(const v of [low,(low+high)/2,high]){elt('line',{x1:44,x2:450,y1:y(v),y2:y(v),stroke:'#cedad5','stroke-dasharray':'3 3'});elt('text',{x:38,y:y(v)+4,'text-anchor':'end',fill:'#547067','font-size':11},metric==='winrate'?Math.round(v*100)+'%':v.toFixed(0));}const step=50*Math.max(1,Math.ceil(maxMove/400));
for(let move=0;move<=maxMove;move+=step){const px=x(move);elt('line',{x1:px,x2:px,y1:30,y2:155,stroke:'#e2e8e4','stroke-dasharray':'2 4'});elt('line',{x1:px,x2:px,y1:155,y2:160,stroke:'#71877b'});if(move===0||move===maxMove||x(maxMove)-px>=34)elt('text',{x:px,y:177,'text-anchor':move===0?'start':move===maxMove?'end':'middle',fill:'#547067','font-size':11},move+'手');}
if(maxMove%step!==0)elt('text',{x:450,y:177,fill:'#547067','font-size':11,'text-anchor':'end'},maxMove+'手');
// Gaps remain gaps: never connect unanalysed positions as if they had results.
let d='',last=null;for(const item of list){d+=(last&&item.move===last.move+1?' L':' M')+x(item.move)+' '+y(item.result.rootInfo[metric]);last=item;}elt('path',{d,fill:'none',stroke:'#28766c','stroke-width':2});const current=matches()?snap().index:-1;for(const item of list){const dot=elt('circle',{cx:x(item.move),cy:y(item.result.rootInfo[metric]),r:item.index===current?5:3,fill:item.index===current?'#bc473b':'#28766c',tabindex:'0',role:'button','aria-label':item.move+'手 黒勝率'+(item.result.rootInfo.winrate*100).toFixed(1)+'%'});dot.onclick=()=>go(item.index);dot.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();go(item.index);}};}
if(!list.length)elt('text',{x:245,y:87,'text-anchor':'middle',fill:'#61776d','font-size':13},'解析結果はここに表示されます');$('analysis-seek').disabled=!list.length||!matches();$('analysis-seek').max=Math.max(0,list.length-1);const chosen=list.findIndex(p=>p.index===current);$('analysis-seek').value=chosen>=0?chosen:0;$('analysis-seek-value').textContent=chosen>=0?list[chosen].move+'手':'—';}
async function go(index){if(!matches()){note('表示中の棋譜が異なります。保存した解析を読み直してください。');return;}try{await api.analysisAt(index,session.snapshot.sgf);}catch(e){note(e.message);}}
$('analysis-seek').oninput=()=>{const list=[...results.values()].sort((a,b)=>a.index-b.index);const item=list[Number($('analysis-seek').value)];if(item)go(item.index);};$('analysis-metric').onchange=renderGraph;
$('analysis-rules').onchange=displayState;
async function connect(){$('engine-error').hidden=true;logs=[];$('engine-log').textContent='';pendingCalls++;controls();try{const config=paths();if(!window.KifuRemote&&(!config.exe||!config.model))throw Error('実行ファイルとモデルのフルパスを指定してください。');try{localStorage.setItem('kifu-engine-paths-v1',JSON.stringify(config));}catch{}startupAt=Date.now();startupName=window.KifuRemote?'PCのエンジン':$('engine-name').value.trim()||config.exe.split(/[\\/]/).pop();engineState('starting','エンジンを起動しています','モデルを読み込み、準備しています。CUDA・TensorRT等の初回起動ではチューニングに数分以上かかる場合があります。しばらくお待ちください。');if($('engine-notice').getClientRects().length)$('engine-notice').scrollIntoView({block:'nearest',behavior:'auto'});const r=await call('start',config);running=true;ready=false;timer??=setInterval(poll,50);engineMeta=r.meta;if(window.KifuRemote)startupName=r.meta?.engine||'PCのエンジン';handshake={id:uid(),time:Date.now()};await call('send',{id:handshake.id,action:'query_version'});note('KataGoの起動を待っています。初回はモデル読込みに時間がかかります。');timer??=setInterval(poll,50);}catch(e){log(e.message);engineError(e.message);}finally{pendingCalls--;controls();}}
async function disconnect(){endLive();clearPreview();stopping=null;active=null;handshake=null;try{await call('stop');}catch(e){log(e.message);}running=ready=false;engineState('idle','エンジン停止','「起動・接続」で再び起動できます。');$('analysis-progress').hidden=true;controls();}
async function poll(){startingStatus();if(polling)return;polling=true;try{const r=await call('poll');for(const l of r.logs||[])log(l);for(const event of r.events||[]){if(event.type==='log'){log(event.message);continue;}if(event.type==='exit'){log(event.message);ready=false;engineError(event.message);endLive();active=null;continue;}if(event.type!=='result')continue;const data=event.data;
if(handshake&&data.id===handshake.id){if(data.error){log(data.error);engineError(data.error);handshake=null;continue;}if(data.version){engineMeta={...engineMeta,version:data.version};ready=true;handshake=null;engineState('ready','起動完了・解析できます',startupName+' ／ KataGo '+data.version+'。「解析を開始」またはスペースキーで連続解析を始められます。');if($('engine-notice').getClientRects().length)$('engine-notice').scrollIntoView({block:'nearest',behavior:'auto'});$('engine-error').hidden=true;note('KataGoは正常に起動し、解析要求を受け付ける状態です。');}continue;}
if(stopping&&data.id===stopping.id){if(data.rootInfo){const item=stopping.plan[stopping.cursor];results.set(item.index,{index:item.index,move:item.move,turn:item.turn,reset:item.reset,result:A.normalizedResult(data,session.snapshot.size),queryId:data.id,seconds:stopping.seconds,time:new Date().toISOString()});unsaved=true;renderResult();renderGraph();}if(data.isDuringSearch===false)stopping=null;continue;}if(!active||data.id!==active.id)continue;if(data.error){note('解析エラー：'+data.error);log(JSON.stringify(data));endLive();active=null;continue;}if(data.warning){log('注意：'+data.warning);note('KataGoの注意：'+data.warning);}if(data.rootInfo){const item=active.plan[active.cursor],result=A.normalizedResult(data,session.snapshot.size);results.set(item.index,{index:item.index,move:item.move,turn:item.turn,reset:item.reset,result,queryId:data.id,seconds:active.seconds,time:new Date().toISOString()});unsaved=true;renderResult();renderGraph();}
if(data.isDuringSearch===false&&data.rootInfo){active.cursor++;$('analysis-progress').value=active.cursor;if(active.cursor<active.plan.length){progressText();await sendNext();}else{note((live?'連続解析：次の着手・手順移動を待っています。 ':'解析完了：')+active.plan.length+'局面 ／ '+((Date.now()-active.started)/1000).toFixed(1)+'秒。結果を保存できます。');active=null;renderGraph();if(live)scheduleLive(true);}}
}
if(active)progressText();running=r.running;if(!running){ready=false;endLive();active=null;handshake=null;if(startupPhase!=='error')engineState('idle','エンジン停止','「起動・接続」で起動してください。');clearInterval(timer);timer=null;}if(handshake&&Date.now()-handshake.time>180000){note('モデル読込みが続いています。接続ログを確認してください。中止するには「エンジン終了」を押してください。');handshake.time=Date.now();}controls();}catch(e){log(e.message);ready=false;engineError('接続エラー：'+e.message);endLive();active=null;controls();}finally{polling=false;}}
async function sendNext(){if(!active)return;active.id=uid();await call('send',{id:active.id,...active.plan[active.cursor].request});}
async function analyze(all,following=false){if(!ready||active||pendingCalls>0)return;stopping=null;try{const snapshot=api.analysisSnapshot(),rules=$('analysis-rules').value,infinite=!all&&!window.KifuRemote,seconds=infinite?null:!all?60:Number($('analysis-seconds').value==='custom'?$('analysis-custom').value:$('analysis-seconds').value),pvLength=Number($('analysis-pv-length').value),plan=A.plan(snapshot,rules,{seconds,infinite,pvLength},all);const same=session&&A.identity(snapshot)===A.identity(session.snapshot)&&rules===session.rules&&JSON.stringify(engineMeta)===JSON.stringify(session.engine);if(!same){if(!following&&unsaved&&results.size&&!confirm('保存していない解析結果を、新しい解析で置き換えますか？'))return;results=following&&session&&rules===session.rules&&JSON.stringify(engineMeta)===JSON.stringify(session.engine)?A.rebaseResults(session.snapshot,snapshot,results):new Map();session={snapshot,rules,engine:engineMeta,created:new Date().toISOString()};unsaved=results.size>0;}if(all)results=new Map();session.analysisRun={scope:following?"live":all?"all":"current",seconds,infinite,pvLength,started:new Date().toISOString()};session.timing={mode:infinite?"infinite":"seconds",seconds,pvLength};clearPreview();active={snapshot,plan,index:snapshot.index,cursor:0,id:null,seconds,infinite,started:Date.now()};selectedCandidate=0;$('analysis-progress').hidden=infinite;$('analysis-progress').max=plan.length;$('analysis-progress').value=0;note(plan[0].reset?'配置図として解析します。配置変更以前のコウ履歴・アゲハマは解析に含まれません。':'解析を開始しました。');controls();displayState();await sendNext();}catch(e){active=null;endLive();note(e.message);controls();}}
async function cancel(){endLive();const pending=active;stopping=pending;active=null;if(pending?.id)try{await call('send',{id:uid(),action:'terminate',terminateId:pending.id});}catch(e){log(e.message);}$('analysis-progress').hidden=true;note('解析を中止しました。取得済みの結果は保存できます。');renderGraph();controls();}
function endLive(){live=false;liveTarget='';followVersion++;clearTimeout(followTimer);followTimer=null;}
function scheduleLive(force=false){
 if(!live||!ready)return;const s=snap();if(!s)return;
 const key=JSON.stringify([A.identity(s),s.index,$('analysis-rules').value]);if(!force&&key===liveTarget)return;
 liveTarget=key;const version=++followVersion;clearTimeout(followTimer);clearPreview();
 // Invalidate immediately, before the debounce, so late answers cannot paint the new position.
 const previous=active;active=null;stopping=null;
 followQueue=followQueue.catch(()=>{}).then(async()=>{if(previous?.id)await call('send',{id:uid(),action:'terminate',terminateId:previous.id});}).catch(e=>{endLive();note('解析停止エラー：'+e.message);controls();});
 followTimer=setTimeout(()=>{followQueue=followQueue.then(async()=>{if(!live||!ready||version!==followVersion)return;await analyze(false,true);}).catch(e=>{endLive();note(e.message);controls();});},120);
 controls();
}
function toggleLive(){if(live||active){cancel();return;}if(!ready||active||pendingCalls>0)return;live=true;note('連続解析を開始します。');scheduleLive(true);controls();}
let spaceReserved=false;
document.addEventListener('keydown',event=>{if(event.code!=='Space'&&event.key!==' ')return;if(event.defaultPrevented||event.isComposing||event.ctrlKey||event.metaKey||event.altKey||event.shiftKey)return;const target=event.target;if(target?.closest?.('input,textarea,select,[contenteditable="true"],dialog')||document.querySelector('dialog[open]'))return;event.preventDefault();event.stopPropagation();spaceReserved=true;if(event.repeat)return;if(!ready){note('先にエンジン設定から「起動・接続」を押してください。');return;}if(pendingCalls>0)return;if(live||active)cancel();else toggleLive();},true);
document.addEventListener('keyup',event=>{if((event.code==='Space'||event.key===' ')&&spaceReserved){event.preventDefault();event.stopPropagation();spaceReserved=false;}},true);
window.addEventListener('blur',()=>spaceReserved=false);
window.addEventListener('kifu-board-view',()=>{clearPreview();renderResult();});
$('analyze-live').onclick=toggleLive;
$('engine-connect').onclick=connect;$('engine-disconnect').onclick=disconnect;$('analyze-all').onclick=()=>analyze(true);
$('analysis-save').onclick=async()=>{try{if(!session||!results.size)return;const archive={format:'kifu-katago-analysis',version:1,perspective:'BLACK',...session,results:[...results.values()].sort((a,b)=>a.index-b.index),saved:new Date().toISOString()};await GoExport.save(new Blob([JSON.stringify(archive,null,2)],{type:'application/json'}),'棋譜解析.kifu-analysis.json');unsaved=false;note('解析を保存しました。');}catch(e){note('保存できません：'+e.message);}};
$('analysis-open').onclick=()=>$('analysis-file').click();$('analysis-file').onchange=async()=>{const file=$('analysis-file').files[0];$('analysis-file').value='';if(!file)return;try{if(file.size>32*1024*1024)throw Error('解析ファイルは32MB以内です。');const data=A.validateArchive(JSON.parse(await file.text()));if(unsaved&&!confirm('保存していない解析結果を置き換えますか？'))return;if(!await api.loadAnalysisSnapshot(data.snapshot))return;stopping=null;session={snapshot:api.peekAnalysisSnapshot(),rules:data.rules,engine:data.engine||null,created:data.created||'',timing:data.timing||null,analysisRun:data.analysisRun||null};results=new Map(data.results.map(item=>[item.index,item]));$('analysis-rules').value=data.rules;unsaved=false;selectedCandidate=0;note('保存済み解析を読み込みました。'+results.size+'局面。グラフから局面を選べます。');controls();displayState();}catch(e){note('読み込めません：'+e.message);}};
window.addEventListener('kifu-position-change',()=>{clearPreview();const s=snap();if(live)scheduleLive();else if(active?.infinite&&s&&(s.index!==active.index||A.identity(s)!==A.identity(session.snapshot)))cancel();displayState();});window.addEventListener('workspace-layout',()=>{clearPreview();overlay.hidden=$('pane-analysis').hidden;displayState();});window.addEventListener('beforeunload',e=>{if(active||live||unsaved){e.preventDefault();e.returnValue='';}});
window.addEventListener('pagehide',()=>{if(window.KifuRemote)window.KifuRemote.call('stop').catch(()=>{});else if(native())native()('engine_call',{action:'stop',payload:{}}).catch(()=>{});else if(token)fetch('/api/engine',{method:'POST',keepalive:true,headers:{'Content-Type':'application/json','X-Kifu-Token':token},body:JSON.stringify({action:'stop',payload:{}})}).catch(()=>{});});
controls();displayState();
})();
