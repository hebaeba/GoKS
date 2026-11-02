/* Display-only localization. Game data, paths, input values and engine logs stay untouched. */
(()=>{'use strict';
const KEY='gokifu-language',dictionary=window.KifuEnglish||{},texts=new WeakMap(),attributes=new WeakMap();
let language='ja';try{language=localStorage.getItem(KEY)==='en'?'en':'ja';}catch{}
const protectedSelector='script,style,textarea,code,[data-no-i18n],.game-title,#simple-title,#black-name,#white-name,#comment,#metadata dd,.notes-content p,.notes-content dd,#engine-active-name,#engine-nearby-name,#engine-order button:first-child,#engine-profile option:not([value=""]),#match-black option:not([value="human"]):not([value="current"]),#match-white option:not([value="human"]):not([value="current"]),#engine-files';
const fragments=Object.keys(dictionary).filter(k=>k.length>=4&&/[ぁ-龯]/.test(k)).sort((a,b)=>b.length-a.length);
function english(s){if(Object.hasOwn(dictionary,s))return dictionary[s];let m;
 if(m=s.match(/^盤上 (\d+)手 ／ 取得済み (\d+)候補（一覧はすべて表示）(.*)$/))return 'On board: '+m[1]+' moves / '+m[2]+' candidates received (expand for ranks 11+). '+english(m[3]);
 if(m=s.match(/^読み筋 (\d+)手（マウスを外すと戻ります）。クリックすると候補手の１手だけを着手します。(.*)$/))return 'PV: '+m[1]+' moves. Move the pointer away to return; click to play only the first move. '+english(m[2].trim());
 if(m=s.match(/^現在の棋譜を置き換えて、(\d+)子の置碁を始めますか？$/))return 'Replace the current game with a '+m[1]+'-stone handicap game?';
 if(m=s.match(/^(.*)の推定$/))return 'Estimate by '+m[1];
 if(m=s.match(/^(.*)が投了しました。$/))return m[1]+' resigned.';
 if(m=s.match(/^(黒|白)視点：勝率％／目数差（＋は(黒|白)有利）$/))return (m[1]==='黒'?'Black':'White')+' perspective: win % / score lead (+ favors '+(m[2]==='黒'?'Black':'White')+').';
 if(m=s.match(/^変化([0-9０-９]+)(.*)$/))return 'Variation '+m[1]+m[2].replace(/（(\d+)手で分岐）/,' (branches at move $1)').replace(/（(\d+)手〜）/,' (from move $1)');
 if(m=s.match(/^(解析済み|解析完了|解析中止|解析中断) (\d+)／(\d+)局面$/))return dictionary[m[1]]+' '+m[2]+' / '+m[3]+' positions';
 if(m=s.match(/^経過 (.*)秒 ／ 残り約 (.*)秒(.*)$/))return 'Elapsed '+m[1]+' s / about '+m[2]+' s remaining'+(m[3]?' (earlier ko history and captures excluded)':'');
 if(m=s.match(/^黒 (.*?)％／(.*?)目　白 (.*?)％／(.*?)目（(黒|白)AIの着手前評価）$/))return 'Black '+m[1]+'% / '+m[2]+' pts · White '+m[3]+'% / '+m[4]+' pts ('+(m[5]==='黒'?'Black':'White')+' AI, before move)';
 if(m=s.match(/^(日本|中国)ルールでの計算結果$/))return 'Score under '+(m[1]==='日本'?'Japanese':'Chinese')+' rules';
 if(s.startsWith('黒：')&&s.includes('（地）'))return s.replaceAll('黒：','Black: ').replaceAll('白：','White: ').replaceAll('（地）',' (territory)').replaceAll('（取られた石）',' (captured)').replaceAll('（石）',' (stones)').replaceAll('（コミ）',' (komi)').replaceAll('（補正）',' (adjustment)');
 if(s.startsWith('実行ファイル：'))return s.replace(/^実行ファイル：/,'Engine: ').replace(/\nモデル：/,'\nModel: ').replace(/\n設定：/,'\nConfig: ');
 if(m=s.match(/^(\d+)路、(\d+)手。(黒|白)番。(閲覧|編集)モード。矢印で交点を選びEnterで着手。$/))return m[1]+'×'+m[1]+', move '+m[2]+'. '+(m[3]==='黒'?'Black':'White')+' to play. '+(m[4]==='編集'?'Edit':'View')+' mode. Select a point with arrow keys and press Enter to play.';
 if(m=s.match(/^(\d+)路$/))return m[1]+'×'+m[1];
 if(m=s.match(/^(\d+)子$/))return m[1]+' stones';
 if(m=s.match(/^([\d０-９.]+)秒$/))return m[1]+' s';
 if(m=s.match(/^([\d０-９]+)手$/))return m[1]+' moves';
 if(m=s.match(/^手数(\d+)／(\d+)手$/))return 'Move '+m[1]+' / '+m[2];
 if(m=s.match(/^解析対象：(本譜|変化\d+) ／ 初期局面～(\d+)手(.*)$/))return 'Scope: '+english(m[1])+' / Start–'+m[2]+(m[3]?' · '+english(m[3]):'');
 if(m=s.match(/^(● 黒番|○ 白番)：あなたの手番です。盤上をクリックしてください。$/))return english(m[1])+': Your turn. Click the board.';
 if(m=s.match(/^(● 黒番|○ 白番) (.*) 思考中（(.*)／(.*)）$/))return english(m[1])+' '+m[2]+' thinking ('+m[3].replace('時間無制限','unlimited time').replace('秒以内',' s')+' / '+m[4].replace('訪問数無制限','unlimited visits').replace('訪問',' visits')+')';
 if(m=s.match(/^(黒|白) 残り ([\d.]+)秒$/))return english(m[1])+': '+m[2]+' s left';
 if(m=s.match(/^(黒|白)の時間切れです。$/))return english(m[1])+' lost on time.';
 if(m=s.match(/^(全局|連続|現在局面)解析 ／ (日本ルール|中国ルール) ／ １局面 (.+) ／ 開始 (.+) ／ (\d+)局面(.*)$/))return ({全局:'Full game',連続:'Live',現在局面:'Position'})[m[1]]+' / '+english(m[2])+' / '+english(m[3])+' / '+m[4]+' / '+m[5]+' positions'+(m[6]?' (updating)':'');
 if(m=s.match(/^候補(\d+)：(.*)$/))return 'Candidate '+m[1]+': '+m[2].replaceAll('パス','Pass').replace('読み筋なし','No PV').replace('（探索中の結果）',' (searching)');
 if(m=s.match(/^(.+)：(\d+)手時点の推定(.*)$/))return m[1]+': estimate at move '+m[2]+m[3].replace(/（現在は(\d+)手）/,' (current: $1)').replace('・対局中断中',' · Game paused').replace('推定完了','Estimate complete');
 if(m=s.match(/^(互角|[黒白]＋[\d.]+目)（推定・コミ([\d.-]+)込み）$/))return m[1].replace('互角','Even').replace('黒','Black').replace('白','White').replace('目',' points')+' (estimated, komi '+m[2]+')';
 if(m=s.match(/^登録\s*(\d+)\s*件$/))return m[1]+' profiles';
 if(m=s.match(/^11位以下を表示（(\d+)件）$/))return 'Show ranks 11+ ('+m[1]+')';
 if(m=s.match(/^単独版 · 更新(\d+)$/))return 'Standalone · Update '+m[1];
 if(m=s.match(/^変化(\d+)$/))return 'Variation '+m[1];
 if(m=s.match(/^([A-Z]：)?本譜を表示中$/))return (m[1]||'')+'Main line';
 if(m=s.match(/^(黒|白)(\s*[\d.,]+[%％])$/))return (m[1]==='黒'?'Black':'White')+m[2];
 if(m=s.match(/^(黒|白)のアゲハマ (\d+)$/))return (m[1]==='黒'?'Black':'White')+' captures: '+m[2];
 if(m=s.match(/^黒石 ([\d—]+) 個 ／ 白石 ([\d—]+) 個$/))return 'Black '+m[1]+' / White '+m[2];
 if(m=s.match(/^(本譜|変化\d+) (\d+)手の局面へ移動します$/))return 'Go to '+english(m[1])+', move '+m[2];
 if(m=s.match(/^「(.+)」を読み込みました。上部の起動／再起動ボタンで反映します。$/))return 'Selected “'+m[1]+'”. Start or restart the engine to apply it.';
 if(m=s.match(/^(黒|白)の([\d.]+)目勝ち$/))return (m[1]==='黒'?'Black':'White')+' wins by '+m[2];
 if(m=s.match(/^(.*) \((Home|End|M|C|Ctrl\+Home)\)$/)){const v=english(m[1]);if(v!==m[1])return v+' ('+m[2]+')';}
 // Translate known sentence fragments in dynamically assembled UI messages.
 // Game metadata and protocol logs are excluded by textNode.
 let out=s;for(const key of fragments)if(out.includes(key))out=out.split(key).join(dictionary[key]);return out;
}
function t(s){return language==='en'?english(String(s)):String(s);}
function textNode(n){const p=n.parentElement;if(!p||p.closest(protectedSelector)||(p.closest('pre')&&!p.closest('#engine-running-files,#engine-log,#match-log')))return;
 let r=texts.get(n);if(!r||n.data!==r.shown)r={raw:n.data,shown:n.data};
 const core=r.raw.trim(),log=p.closest('#engine-log,#match-log'),next=log?(language==='en'?r.raw.split('\n').map(line=>Object.hasOwn(dictionary,line)?dictionary[line]:line.replace(/^KataGoの注意：/,'KataGo notice: ').replace(/^同梱エンジンの確認：/,'Bundled engine check: ')).join('\n'):r.raw):r.raw.replace(core,t(core));r.shown=next;texts.set(n,r);if(n.data!==next)n.data=next;
}
function attr(e,key){let a=attributes.get(e);if(!a){a={};attributes.set(e,a);}const current=e.getAttribute(key);if(current===null)return;let r=a[key];if(!r||current!==r.shown)r={raw:current};const next=t(r.raw);r.shown=next;a[key]=r;if(current!==next)e.setAttribute(key,next);}
let observer,queued=false,titleState=null,nativeTitle="";
function rawText(el){if(!el)return "";const w=document.createTreeWalker(el,NodeFilter.SHOW_TEXT);let n,out="";while(n=w.nextNode())out+=(texts.get(n)?.raw??n.data);return out;}
function apply(){queued=false;observer?.disconnect();
 document.documentElement.lang=language;
 for(const e of document.querySelectorAll('[data-i18n-default]'))if(e.dataset.i18nDefault){const value=t(e.dataset.i18nDefault);if(e.textContent!==value)e.textContent=value;e.title=value;}
 for(const e of document.querySelectorAll('a[href],iframe[src]')){const key=e.tagName==='IFRAME'?'src':'href',v=e.getAttribute(key);if(/^(README|licenses)(-en)?\.html(\?.*)?$/.test(v)){const next=v.replace(/(-en)?\.html/,language==='en'?'-en.html':'.html');if(v!==next)e.setAttribute(key,next);}}
 if(!titleState||document.title!==titleState.shown)titleState={raw:document.title};titleState.shown=t(titleState.raw);if(document.title!==titleState.shown)document.title=titleState.shown;
 const kind=new URLSearchParams(location.search).get('kind');if(kind&&window.__TAURI_INTERNALS__&&nativeTitle!==document.title){nativeTitle=document.title;window.__TAURI_INTERNALS__.invoke('auxiliary',{action:'title',kind,payload:{title:nativeTitle}}).catch(()=>{});}
 const simpleTitle=document.getElementById('simple-title'),mainTitle=document.querySelector('.game-title');if(simpleTitle&&mainTitle?.dataset.i18nDefault)simpleTitle.textContent=t(mainTitle.dataset.i18nDefault);
 // Options with implicit values must retain their original machine value.
 for(const o of document.querySelectorAll('option:not([value])'))o.setAttribute('value',o.value);
 const walker=document.createTreeWalker(document.body||document.documentElement,NodeFilter.SHOW_TEXT);let n;while(n=walker.nextNode())textNode(n);
 for(const e of document.querySelectorAll('[title],[placeholder],[aria-label]')){if(e.closest('pre,code,[data-no-i18n],.game-title,#simple-title,#black-name,#white-name'))continue;for(const a of ['title','placeholder','aria-label'])attr(e,a);}
 document.querySelectorAll('[data-language-choice]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.languageChoice===language)));
 observer?.observe(document.documentElement,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['title','placeholder','aria-label']});
}
function schedule(){if(!queued){queued=true;queueMicrotask(apply);}}
function set(value,persist=true){language=value==='en'?'en':'ja';if(persist)try{localStorage.setItem(KEY,language);}catch{}apply();window.dispatchEvent(new CustomEvent('kifu-language-change',{detail:language}));window.dispatchEvent(new Event('resize'));}
function restoreClone(original,clone){const a=document.createTreeWalker(original,NodeFilter.SHOW_TEXT),b=document.createTreeWalker(clone,NodeFilter.SHOW_TEXT);let x,y;while((x=a.nextNode())&&(y=b.nextNode())){const r=texts.get(x);if(r)y.data=r.raw;}const els=[original,...original.querySelectorAll('*')],copies=[clone,...clone.querySelectorAll('*')];els.forEach((e,i)=>{const data=attributes.get(e);if(data)for(const [k,r]of Object.entries(data))copies[i].setAttribute(k,r.raw);});return clone;}
window.KifuI18n={t,english,apply,set,restoreClone,rawText,get language(){return language;}};
function start(){
 const simple=document.getElementById('simple-toggle');if(simple){const row=document.createElement('div');row.className='language-row';simple.before(row);row.append(simple);const buttons=document.createElement('div');buttons.className='language-switch';buttons.dataset.noI18n='';buttons.setAttribute('aria-label','Language / 言語');for(const [value,label]of [['ja','日本語'],['en','English']]){const b=document.createElement('button');b.type='button';b.dataset.languageChoice=value;b.textContent=label;b.onclick=()=>set(value);buttons.append(b);}row.append(buttons);}
 const view=[...document.querySelectorAll('#simple-menu summary')].find(e=>e.textContent==='表示')?.nextElementSibling;
 if(view){const b=document.createElement('button');b.dataset.noI18n='';b.dataset.safeDisplay='1';b.textContent='日本語 / English';b.onclick=()=>set(language==='ja'?'en':'ja');view.append(b);}
 observer=new MutationObserver(schedule);apply();
}
window.addEventListener('storage',e=>{if(e.key===KEY)set(e.newValue,false);});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
