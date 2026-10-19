/* Local KataGo matches. Separate GTP sessions keep analysis and opposing engines isolated. */
'use strict';
(()=>{
const $=id=>document.getElementById(id),api=IndependentGo,A=KifuAnalysis,pane=$('pane-match');
pane.innerHTML=`<h2>KataGoと対局</h2><fieldset id="match-options"><legend>対局者・条件</legend><div class="match-player"><strong>● 黒番</strong><select id="match-black" aria-label="黒番の対局者"></select><label>１手 <input id="match-black-seconds" type="number" min="0.1" max="600" step="0.1" value="1">秒</label></div><div class="match-player"><strong>○ 白番</strong><select id="match-white" aria-label="白番の対局者"></select><label>１手 <input id="match-white-seconds" type="number" min="0.1" max="600" step="0.1" value="1">秒</label></div><div class="match-rules"><label>ルール <select id="match-rules"><option value="japanese">日本ルール</option><option value="chinese">中国ルール</option></select></label><button id="match-reload" title="エンジン設定に登録したKataGoを一覧に反映します">リスト更新</button></div><small>現在の盤面・手番・コミから開始します。置碁は碁盤上部で設定してください。秒数はAIの１手の思考時間の上限です。</small></fieldset><div class="match-actions"><button id="match-start">対局開始</button><button id="match-pause" disabled>中断</button><button id="match-resume" disabled>再開</button><button id="match-end" disabled>対局を終了</button></div><div id="match-status" role="status" aria-live="polite">対局者を選び「対局開始」を押してください。</div><div class="match-actions"><button id="match-pass" disabled>パス</button><button id="match-resign" disabled>投了</button><button id="match-score" hidden>勝敗判定</button><button id="match-save">棋譜を保存</button></div><details><summary>対局の使い方</summary><ul><li>黒番と白番に「人間」または登録済みKataGoを選びます。両方にKataGoを選ぶとAI同士で対局します。</li><li>途中の棋譜からも始められます。元の続きと異なる手は変化として残します。</li><li>対局開始時に解析用エンジンを停止します。対局中は盤面の編集・手戻りを止めます。</li><li>２回連続のパスで終局します。勝敗判定で死に石・セキを指定してください。投了の勝敗は棋譜に記録します。</li><li>中断するとエンジンを終了します。同じ局面なら「再開」できます。盤面を変更した場合は「対局開始」で始め直します。</li><li>異なるKataGoを黒白に選ぶ場合は２つのプロセスを使います。同じ登録なら１つを共用します。メモリーの少ない端末では同じ登録をおすすめします。</li></ul></details><details><summary>対局ログ</summary><pre id="match-log"></pre></details>`;
let phase='idle',epoch=0,workers=[],players=null,rules='japanese',expected=null,busy=false,passes=0,added=0;
const locked=()=>['starting','playing','stopping'].includes(phase);
const snapshot=()=>api.analysisSnapshot();
const key=s=>JSON.stringify([s.sgf,s.index,s.path]);
const turn=()=>A.positionAt(api.peekAnalysisSnapshot()).state.turn===1?'B':'W';
const humanTurn=()=>phase==='playing'&&players?.[turn()]?.human&&!busy;
function status(text,error=false){$('match-status').textContent=text;$('match-status').dataset.error=String(error);}
function log(s){const el=$('match-log');el.textContent=(el.textContent+'\n'+s).split('\n').slice(-100).join('\n');}
function controls(){const lock=locked();document.body.classList.toggle('match-running',lock);$('match-options').disabled=lock;$('match-start').disabled=lock;$('match-pause').disabled=!['starting','playing'].includes(phase);$('match-resume').disabled=phase!=='paused';$('match-end').disabled=!['playing','paused','starting'].includes(phase);$('match-pass').disabled=!humanTurn();$('match-resign').disabled=!humanTurn();}
function populate(){if(locked())return;const ps=KifuAnalysisControl.profiles();for(const side of ['black','white']){const e=$('match-'+side),old=e.value;e.replaceChildren(new Option('人間','human'),new Option('現在のKataGo設定','current'));for(const p of ps)e.append(new Option(p.name,p.id));e.value=[...e.options].some(o=>o.value===old)?old:side==='black'?'human':'current';} }
$('match-reload').onclick=populate;populate();window.addEventListener('workspace-layout',()=>{if(!pane.hidden)populate();});
function selection(side){const id=$('match-'+side).value;if(id==='human')return {human:true,name:'人間'};const config=id==='current'?KifuAnalysisControl.config():KifuAnalysisControl.profiles().find(p=>p.id===id);if(!config?.exe||!config?.model)throw Error('エンジン設定で実行ファイルとモデルを指定してください。');const input=$('match-'+side+'-seconds'),seconds=Number(input.value);if(!input.checkValidity()||!Number.isFinite(seconds))throw Error('思考時間は0.1〜600秒で指定してください。');return {human:false,config:{...config,kind:'katago'},name:config.name||'KataGo',seconds};}
class Worker{
 constructor(session){this.session=session;this.alive=true;this.polling=false;this.bridge=new KifuGTP.Bridge((action,payload)=>KifuAnalysisControl.rawCall(action,{...payload,session}));this.timer=setInterval(()=>this.poll(),50);}
 async poll(){if(this.polling||!this.alive)return;this.polling=true;try{const r=await this.bridge.call('poll');for(const line of r.logs||[])log(this.session+': '+line);for(const e of r.events||[]){if(e.type==='exit'){log(e.message);this.bridge.reset();throw Error(e.message);}if(e.type==='log')log(e.message);}}catch(e){if(this.alive){this.error=e;this.bridge.reset();}}finally{this.polling=false;}}
 async start(config){await this.bridge.call('start',config);const [name,commands]=await this.command(['name','list_commands']);if(!/katago/i.test(name))throw Error('KataGo専用です。選択したエンジン：'+name);for(const c of ['genmove','kata-set-param','kata-set-rules','set_position'])if(!commands.split(/\s+/).includes(c))throw Error('必要なGTP命令がありません：'+c);log(config.name+' 起動完了');}
 async command(commands){if(this.error)throw this.error;try{return await this.bridge.commands(commands);}catch(e){throw this.error||e;}}
 async stop(){this.alive=false;clearInterval(this.timer);await this.bridge.call('stop');}
}
async function release(){const old=workers;workers=[];await Promise.allSettled(old.map(w=>w.stop()));}
async function halt(next,message){epoch++;phase='stopping';controls();await release();phase=next;busy=false;status(message);controls();}
async function fail(e,token){if(token!==epoch)return;log(e.message);await halt('paused','対局を中断しました：'+e.message);}
async function boot(resume){if(locked())return;let token;
 try{
  if(window.KifuRemote)throw Error('対局はWindows版またはPCのローカル起動で利用してください。');const s=snapshot();if(resume){if(!expected||key(s)!==key(expected))throw Error('中断後に局面が変わりました。「対局開始」で始め直してください。');}
  else{players={B:selection('black'),W:selection('white')};if(players.B.human&&players.W.human)throw Error('少なくとも片方にKataGoを選んでください。');rules=$('match-rules').value;A.plan(s,rules,{seconds:1},false);api.matchInfo({PB:players.B.name,PW:players.W.name,RU:rules==='japanese'?'Japanese':'Chinese',RE:'',DT:new Date().toLocaleDateString('sv-SE')});passes=A.positionAt(s).state.last?.point===null?1:0;added=0;expected=snapshot();}
  phase='starting';busy=true;token=++epoch;controls();$('match-score').hidden=true;status('KataGoを起動しています。初回のチューニングには時間がかかる場合があります。');
  await KifuAnalysisControl.suspend();if(token!==epoch)return;
  const byConfig=new Map();for(const color of ['B','W']){const p=players[color];if(p.human)continue;const configKey=JSON.stringify([p.config.exe,p.config.model,p.config.config,p.config.workdir,p.config.extraArgs]);let w=byConfig.get(configKey);if(!w){w=new Worker(color==='B'?'black':'white');workers.push(w);byConfig.set(configKey,w);await w.start(p.config);if(token!==epoch)return;}p.worker=w;}
  phase='playing';busy=false;controls();await advance(token);
 }catch(e){if(token===undefined){status(e.message,true);return;}await fail(e,token);}
}
async function advance(token){if(token!==epoch||phase!=='playing')return;
 try{const s=snapshot();if(key(s)!==key(expected))throw Error('対局中に局面が変わりました。');if(added>=2000){await halt('paused','2000手に達したため中断しました。');return;}const color=turn(),p=players[color];if(p.human){busy=false;status((color==='B'?'● 黒番':'○ 白番')+'：あなたの手番です。盤上をクリックしてください。');controls();return;}
  busy=true;status((color==='B'?'● 黒番':'○ 白番')+' '+p.name+' 思考中（上限 '+p.seconds+'秒）');controls();
  const q=A.plan(s,rules,{seconds:p.seconds},false)[0].request;
  // Reconstruct the complete selected history, including captures and ko; never send only visible stones.
  await p.worker.command(KifuGTP.positionCommands(q));if(token!==epoch)return;
  await p.worker.command(['time_settings 0 0 0','kata-set-param maxVisits 1000000000','kata-set-param maxPlayouts 1000000000','kata-set-param maxTime '+p.seconds]);if(token!==epoch)return;
  const [raw]=await p.worker.command(['genmove '+color]);if(token!==epoch)return;const move=raw.trim();
  if(/^resign$/i.test(move)){await finish((color==='B'?'W':'B')+'+R',p.name+'が投了しました。');return;}
  const point=A.point(move.toUpperCase()==='PASS'?'pass':move.toUpperCase(),s.size);apply(point,s);log((color==='B'?'黒':'白')+' '+move);busy=false;
  if(passes>=2){await finish('', '２回連続のパスで終局しました。勝敗判定で死に石・セキを指定してください。');return;}
  controls();setTimeout(()=>advance(token),80);
 }catch(e){await fail(e,token);}
}
function apply(point,s){api.matchPlay(point,s);passes=point===null?passes+1:0;added++;expected=snapshot();}
async function humanMove(point){if(!humanTurn())return;const token=epoch;busy=true;controls();try{const s=snapshot();if(key(s)!==key(expected))throw Error('局面が変更されました。');
 const plan=A.plan(s,rules,{seconds:1},false)[0],validator=workers[0];
 // Ask KataGo before committing human moves: this also enforces the selected ko/superko rule.
 status('着手を確認しています…');await validator.command(KifuGTP.positionCommands(plan.request));if(token!==epoch)return;
 await validator.command(['play '+plan.turn+' '+A.gtp(point,s.size)]);if(token!==epoch)return;
 apply(point,s);if(passes>=2)await finish('','２回連続のパスで終局しました。勝敗判定で死に石・セキを指定してください。');else await advance(token);
 }catch(e){if(token===epoch){busy=false;status(e.message,true);controls();if(workers.some(w=>w.error))await fail(e,token);}}}

async function finish(result,message){if(result)api.matchInfo({RE:result});expected=snapshot();await halt('finished',message);$('match-score').hidden=!!result;}
$('match-start').onclick=()=>boot(false);$('match-resume').onclick=()=>boot(true);$('match-pause').onclick=()=>halt('paused','中断しました。同じ局面から再開できます。');$('match-end').onclick=()=>{if(confirm('対局を終了しますか？棋譜はそのまま残ります。'))halt('finished','対局を終了しました。棋譜を保存できます。');};$('match-pass').onclick=()=>humanMove(null);$('match-resign').onclick=()=>{if(humanTurn()&&confirm('投了しますか？'))finish((turn()==='B'?'W':'B')+'+R','投了により終局しました。');};$('match-score').onclick=()=>$('score').click();$('match-save').onclick=async()=>{if(locked())await halt('paused','保存のため中断しました。保存後に再開できます。');$('save').click();};
// Permit navigation between panels and display-only controls, while blocking game-changing shortcuts.
const allowed=e=>!!e.target.closest('#pane-match, .workspace-tabs, .canvas-wrap, #numbers, #recent, #rotate-left, #rotate-right, #rotate-reset, #match-save, #save, #workspace-save, #about-open, footer, .guide-top');
for(const type of ['click','pointerdown','change','input','wheel','keydown','paste','drop'])document.addEventListener(type,e=>{if(!locked())return;if(type==='keydown'){if(e.key==='Tab')return;if(e.target.closest('.workspace-tabs'))return;if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();halt('paused','中断しました。');return;}if(e.target.closest('#pane-match')&&['Tab','Enter',' '].includes(e.key))return;e.preventDefault();e.stopImmediatePropagation();return;}if((type==='wheel'&&e.target.closest('.canvas-wrap'))||!allowed(e)){e.preventDefault();e.stopImmediatePropagation();}},true);
window.KifuMatch={get locked(){return locked();},humanMove,get phase(){return phase;}};
window.addEventListener('pagehide',()=>{epoch++;for(const w of workers)w.stop().catch(()=>{});});controls();
})();
