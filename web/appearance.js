/* Shared appearance state, independent settings window, original synthesized stone audio. */
(()=>{'use strict';
const C=window.KifuAppearanceCore;if(!C)return;
const KEY='gokifu-appearance-v1',params=new URLSearchParams(location.search),editor=params.get('kind')==='appearance'||location.pathname.endsWith('/appearance.html'),native=window.__TAURI_INTERNALS__?.invoke;
const read=()=>{try{return C.clean(JSON.parse(localStorage.getItem(KEY)));}catch{return C.defaults();}};
let settings=read(),draft=null,audio=null,channel=null,editorWindow=null,session=null;
const images=new Map();
const language=()=>window.KifuI18n?.language||(localStorage.getItem('gokifu-language')==='en'?'en':'ja');
const text=(ja,en)=>language()==='en'?en:ja;
try{channel=new BroadcastChannel('gokifu-appearance');channel.onmessage=e=>{if(e.data?.type==='preview'&&!editor)apply(C.clean(e.data.settings));if(e.data?.type==='restore'&&!editor)apply(read());};}catch{}
function notify(type){channel?.postMessage({type,settings});}
function image(src){if(!src)return null;if(!images.has(src)){const img=new Image();images.set(src,img);img.onload=()=>window.dispatchEvent(new Event('kifu-appearance-change'));img.src=src;}const img=images.get(src);return img.complete&&img.naturalWidth?img:null;}
function apply(value){settings=C.clean(value);const p=settings[language()],size=C.sizes[p.size],style=document.documentElement.style;
 for(const [i,k]of ['--ui-text','--ui-prominent','--ui-small','--ui-line','--ui-button','--ui-menu'].entries())style.setProperty(k,size[i]+'px');
 style.setProperty('--ui-font',p.font==='system-ui'?'system-ui,sans-serif':JSON.stringify(p.font)+',system-ui,sans-serif');
 for(const [k,v]of Object.entries({'--app-background':settings.background,'--app-panel':settings.panel,'--app-text':settings.text,'--graph-background':settings.graph,'--graph-win':settings.win,'--graph-score':settings.score}))style.setProperty(k,v);
 window.dispatchEvent(new Event('kifu-appearance-change'));window.dispatchEvent(new Event('resize'));
}
async function play(kind='preview'){
 if(kind!=='preview'&&!settings[kind]||settings.volume===0)return;
 const src=settings.sound==='custom'?settings.soundData:'assets/appearance/stone-'+settings.sound+'.wav';if(!src)return;
 if(audio){audio.pause();audio.currentTime=0;}audio=new Audio(src);audio.volume=settings.volume/100;try{await audio.play();}catch{if(kind==='preview'&&editor)error(text('音声を再生できません。別のWAVファイルを試してください。','Audio could not be played. Try another WAV file.'));}
}
function paintBoard(c,start,span){if(settings.texture==='image'){const img=image(settings.boardImage);if(img)c.drawImage(img,start,start,span,span);}else if(settings.texture==='grain'){c.save();c.strokeStyle='#795423';c.globalAlpha=.13;c.lineWidth=span/640;for(let i=0;i<22;i++){const x=start+span*i/22;c.beginPath();c.moveTo(x,start);c.bezierCurveTo(x+span*.02,start+span*.3,x-span*.02,start+span*.7,x,start+span);c.stroke();}c.restore();}}
function paintStone(c,color,x,y,r){if(settings.stone==='gradient')return;c.save();c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.clip();const img=settings.stone==='image'?image(color===1?settings.blackImage:settings.whiteImage):null;if(img)c.drawImage(img,x-r,y-r,r*2,r*2);else{c.fillStyle=color===1?'#151515':'#ffffff';c.fill();}c.restore();c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.stroke();}
async function open(){if(native){session=crypto.randomUUID();try{await native('auxiliary',{action:'open',kind:'appearance',payload:{id:session,width:720,height:760}});}catch(e){await window.KifuDialogs?.confirm(String(e?.message||e),{accept:'閉じる'});}}else{editorWindow=window.open('appearance.html','gokifu-appearance','width=720,height=760,resizable=yes,scrollbars=yes');editorWindow?.focus();}}
window.KifuAppearance={get settings(){return settings;},open,play,paintBoard,paintStone,apply};
window.addEventListener('storage',e=>{if(e.key===KEY)apply(read());if(e.key==='gokifu-language'){apply(settings);if(editor)render();}});
window.addEventListener('kifu-language-change',()=>{apply(settings);if(editor)render();});
window.addEventListener('kifu-aux',e=>{if(e.detail.kind==='appearance'&&e.detail.type==='closed')apply(read());});
function begin(){apply(settings);if(editor){document.body.classList.add('appearance-window');draft=read();render();return;}
 if(!document.getElementById('board'))return;
 const footer=document.querySelector('.footer-links');if(footer){const b=document.createElement('button');b.id='appearance-open';b.dataset.safeDisplay='1';b.textContent='表示・音';b.title='文字・碁盤・グラフ・石音を設定します';b.onclick=open;footer.prepend(b);}
 const view=[...document.querySelectorAll('#simple-menu summary')].find(e=>(window.KifuI18n?.rawText(e)||e.textContent)==='表示'||e.textContent==='View')?.nextElementSibling;
 if(view){const b=document.createElement('button');b.textContent='表示・音';b.dataset.safeDisplay='1';b.onclick=()=>{view.parentElement.open=false;open();};view.append(b);}
}
let tab='text';
function render(){
 document.title=text('表示・音','Appearance & Sound');if(native)native('auxiliary',{action:'title',kind:'appearance',payload:{title:document.title}}).catch(()=>{});document.body.replaceChildren();const host=document.createElement('main');host.dataset.appearanceEditor='';host.dataset.noI18n='';document.body.append(host);
 const heading=document.createElement('header');heading.className='appearance-heading';const h=document.createElement('h1');h.textContent=document.title;heading.append(h);host.append(heading);
 const close=button(text('閉じる','Close'),cancel);heading.append(close);
 if(native)heading.addEventListener('pointerdown',e=>{if(e.button===0&&!e.target.closest('button'))native('auxiliary',{action:'drag',kind:'appearance',payload:{}}).catch(()=>{});});
 const nav=document.createElement('nav');nav.className='appearance-tabs';host.append(nav);for(const [id,ja,en]of [['text','文字','Text'],['board','碁盤・背景','Board / Background'],['graph','グラフ','Graph'],['audio','石音','Sound']]){const b=button(text(ja,en),()=>{tab=id;render();});b.setAttribute('aria-selected',String(tab===id));nav.append(b);}
 const section=document.createElement('section');section.className='appearance-section';host.append(section);
 const row=()=>{const d=document.createElement('div');d.className='appearance-row';section.append(d);return d;};
 const label=(parent,title,el)=>{const l=document.createElement('label');l.append(document.createTextNode(title+' '),el);parent.append(l);return el;};
 const select=(parent,title,value,options,change)=>{const s=document.createElement('select');for(const [v,t]of options){const o=new Option(t,v);s.add(o);}s.value=value;s.onchange=()=>{change(s.value);preview();};return label(parent,title,s);};
 const check=(parent,title,key)=>{const el=document.createElement('input');el.type='checkbox';el.checked=draft[key];el.onchange=()=>{draft[key]=el.checked;preview();};label(parent,title,el);};
 const color=(parent,title,key)=>{const el=document.createElement('input');el.type='color';el.value=draft[key];el.oninput=()=>{draft[key]=el.value;preview();};label(parent,title,el);};
 const hint=s=>{const p=document.createElement('p');p.className='appearance-hint';p.textContent=s;section.append(p);};
 const file=(parent,title,key,audioFile=false)=>{const el=document.createElement('input');el.type='file';el.accept=audioFile?'.wav,audio/wav':'image/png,image/jpeg,image/webp';label(parent,title,el);el.onchange=async()=>{try{const f=el.files[0];if(!f)return;draft[key]=audioFile?await readWav(f):await readImage(f);preview();render();}catch(e){error(e);}};if(draft[key])parent.append(button(text('解除','Clear'),()=>{draft[key]='';preview();render();}));};
 if(tab==='text'){
  const lang=language();hint(text('日本語と英語の文字設定は別々に記憶します。','Text preferences are saved separately for Japanese and English.'));
  const r=row();select(r,text('文字サイズ','Text size'),draft[lang].size,[['small',text('小 12px','Small 12px')],['normal',text('標準 14px','Normal 14px')],['large',text('大 16px','Large 16px')],['xlarge',text('特大 18px','Extra large 18px')]],v=>draft[lang].size=v);
  const font=document.createElement('input');font.type='text';font.value=draft[lang].font;font.maxLength=80;font.setAttribute('list','appearance-fonts');font.onchange=()=>{draft[lang].font=font.value;preview();font.value=draft[lang].font;};label(row(),text('フォント名','Font family'),font);
  const list=document.createElement('datalist');list.id='appearance-fonts';for(const name of ['system-ui','Yu Gothic UI','Meiryo','Segoe UI','Arial','Noto Sans JP','BIZ UDPGothic'])list.append(new Option(name));section.append(list);
  hint(text('端末にあるフォント名を選択または入力します。ない場合は標準フォントになります。','Choose or enter an installed font family. Unavailable fonts fall back to the system font.'));
  select(row(),text('盤上の数字・記号','Board labels'),String(draft.boardText),[['0.8','80%'],['1','100%'],['1.2','120%']],v=>draft.boardText=Number(v));
  const sample=document.createElement('div');sample.className='appearance-example';sample.textContent=text('文字の見本：黒番・白番・候補手 0123456789','Preview: Black / White / Candidates 0123456789');sample.append(button(text('ボタンの見本','Sample button'),()=>{}));section.append(sample);
  hint(text('大きい文字では折り返しやスクロールが増え、碁盤が小さくなる場合があります。','Larger text may wrap, require scrolling, or reduce board size.'));
 }else if(tab==='board'){
  select(row(),text('テーマ','Theme'),draft.theme,[['warm',text('木肌','Warm wood')],['paper',text('白灰','Paper')],['night',text('夜','Night')]],v=>{draft.theme=v;Object.assign(draft,C.themes[v]);preview();render();});
  for(const [k,ja,en]of [['board','碁盤色','Board'],['background','画面背景','Background'],['panel','パネル背景','Panels'],['text','文字色','Text']])color(row(),text(ja,en),k);
  select(row(),text('碁盤の模様','Board texture'),draft.texture,[['plain',text('無地','Plain')],['grain',text('木目','Wood grain')],['image',text('画像','Image')]],v=>{draft.texture=v;render();});file(row(),text('碁盤画像','Board image'),'boardImage');
  select(row(),text('碁石','Stones'),draft.stone,[['gradient',text('立体','Shaded')],['flat',text('単色','Flat')],['image',text('画像','Images')]],v=>draft.stone=v);file(row(),text('黒石画像','Black stone image'),'blackImage');file(row(),text('白石画像','White stone image'),'whiteImage');hint(text('画像はPNG/JPEG/WebP、8MB以下。512px以内に縮小して設定に保存します。','PNG/JPEG/WebP images up to 8 MB are resized to at most 512px and stored with settings.'));
 }else if(tab==='graph'){
  for(const [k,ja,en]of [['graph','グラフ背景','Graph background'],['graphText','目盛り文字','Axis labels'],['win','勝率の線','Win-rate line'],['score','目数差の線','Score line']])color(row(),text(ja,en),k);
  select(row(),text('線の太さ','Line width'),String(draft.lineWidth),[1,1.5,2,2.5,3,3.5,4].map(v=>[String(v),v+'px']),v=>draft.lineWidth=Number(v));select(row(),text('線の種類','Line style'),draft.lineStyle,[['solid',text('実線','Solid')],['dash',text('破線','Dashed')]],v=>draft.lineStyle=v);
  hint(text('AI同士の対局では勝率を黒線・白線で区別します。目数差の白側評価は破線を維持します。','AI games retain black/white win-rate lines and a dashed line for White’s score estimate.'));
 }else{
  select(row(),text('石音','Stone sound'),draft.sound,[['soft',text('柔らかい音','Soft')],['clear',text('明瞭な音','Clear')],['low',text('低めの音','Low')],['custom',text('WAVファイル','WAV file')]],v=>draft.sound=v);file(row(),text('音声ファイル','Audio file'),'soundData',true);
  const v=document.createElement('input');v.type='range';v.min=0;v.max=100;v.value=draft.volume;const value=document.createElement('span');value.textContent=draft.volume+'%';v.oninput=()=>{draft.volume=Number(v.value);value.textContent=v.value+'%';preview();};const r=row();label(r,text('音量','Volume'),v);r.append(value,button(text('試聴','Play sample'),()=>play()));
  check(row(),text('着手','Played moves'),'moves');check(row(),text('手順移動','Navigation'),'navigation');check(row(),text('自動再生','Autoplay'),'autoplay');hint(text('読み筋のマウスオーバーでは鳴りません。WAVは1MB以下です。','Hovering over a variation is silent. WAV files must be no larger than 1 MB.'));
 }
 const status=document.createElement('p');status.id='appearance-error';status.setAttribute('role','status');host.append(status);
 const actions=document.createElement('div');actions.className='appearance-actions';host.append(actions);actions.append(button(text('標準に戻す','Reset defaults'),()=>{draft=C.defaults();preview();render();}),button(text('キャンセル','Cancel'),cancel),button(text('適用','Apply'),()=>{try{localStorage.setItem(KEY,JSON.stringify(C.clean(draft)));apply(draft);notify('restore');finish();}catch(e){error(text('設定を保存できません。画像・音声を小さくしてください。','Settings could not be saved. Use smaller image/audio files.'));}}));
}
function button(label,fn){const b=document.createElement('button');b.type='button';b.textContent=label;b.onclick=fn;return b;}
function error(e){const el=document.getElementById('appearance-error');if(el)el.textContent=String(e?.message||e);}
function preview(){draft=C.clean(draft);apply(draft);notify('preview');}
function cancel(){apply(read());notify('restore');finish();}
function finish(){if(native)native('auxiliary',{action:'close',kind:'appearance',payload:{}}).catch(error);else window.close();}
function dataURL(f){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(Error(text('ファイルを読めません。','Cannot read file.')));reader.readAsDataURL(f);});}
async function readImage(f){if(!/^image\/(png|jpeg|webp)$/.test(f.type)||f.size>8*1024*1024)throw Error(text('PNG/JPEG/WebPの8MB以下の画像を選択してください。','Select a PNG/JPEG/WebP image up to 8 MB.'));const bitmap=await createImageBitmap(f);try{const scale=Math.min(1,512/Math.max(bitmap.width,bitmap.height)),c=document.createElement('canvas');c.width=Math.max(1,Math.round(bitmap.width*scale));c.height=Math.max(1,Math.round(bitmap.height*scale));c.getContext('2d').drawImage(bitmap,0,0,c.width,c.height);return c.toDataURL('image/webp',.9);}finally{bitmap.close();}}
async function readWav(f){const bytes=new Uint8Array(await f.arrayBuffer());const str=(a,b)=>String.fromCharCode(...bytes.slice(a,b));if(f.size>1024*1024||str(0,4)!=='RIFF'||str(8,12)!=='WAVE')throw Error(text('1MB以下のWAVファイルを選択してください。','Select a WAV file up to 1 MB.'));return dataURL(new Blob([bytes],{type:'audio/wav'}));}
window.addEventListener('pagehide',()=>{if(editor)channel?.postMessage({type:'restore'});});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',begin,{once:true});else begin();
})();
