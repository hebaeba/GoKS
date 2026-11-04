/* Shared appearance state, independent settings window, original synthesized stone audio. */
(()=>{'use strict';
const C=window.KifuAppearanceCore;if(!C)return;
const KEY='gokifu-appearance-v1',params=new URLSearchParams(location.search),editor=params.get('kind')==='appearance'||location.pathname.endsWith('/appearance.html'),native=window.__TAURI_INTERNALS__?.invoke;
const read=()=>{try{return C.clean(JSON.parse(localStorage.getItem(KEY)));}catch{return C.defaults();}};
let settings=read(),draft=null,audio=null,channel=null,editorWindow=null,session=null;
const images=new Map();let fonts=[],fontState='idle',fontError='',pendingCommit=null;
function send(type,data){return native?.('auxiliary',{action:'send',kind:'appearance',payload:{id:editor?params.get('id'):session,type,data}});}
const language=()=>window.KifuI18n?.language||(localStorage.getItem('gokifu-language')==='en'?'en':'ja');
const text=(ja,en)=>language()==='en'?en:ja;
try{channel=new BroadcastChannel('gokifu-appearance');channel.onmessage=e=>{if(e.data?.type==='preview'&&!editor)apply(C.clean(e.data.settings));if(e.data?.type==='restore'&&!editor)apply(read());};}catch{}
function notify(type){channel?.postMessage({type,settings});if(editor&&native)send(type==='preview'?'appearance-preview':'appearance-revert',{settings}).catch(error);}
function image(src){if(!src)return null;if(!images.has(src)){const img=new Image();images.set(src,img);img.onload=()=>{window.dispatchEvent(new Event('kifu-appearance-change'));if(editor&&draft&&tab==='board')render();};img.src=src;}const img=images.get(src);return img.complete&&img.naturalWidth?img:null;}
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
function paintStone(c,color,x,y,r,style=settings){
 const side=color===1?'black':'white',preset=style[side+'Preset']||'classic',variant=['classic','soft','gloss'].indexOf(preset),v=Math.max(0,variant);
 c.save();c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.clip();
 const custom=preset==='custom'?image(style[side+'Image']):null;
 if(custom)c.drawImage(custom,x-r,y-r,2*r,2*r);
 else if(style.stone==='image'){
  const img=image('assets/appearance/stone-'+side+'-'+['slate','grain','rings'][v]+'.svg');
  if(img)c.drawImage(img,x-r,y-r,2*r,2*r);else{c.fillStyle=color===1?'#151515':'#fff';c.fill();}
 }else if(style.stone==='flat'){c.fillStyle=(color===1?['#151515','#30383c','#292929']:['#ffffff','#f4efe1','#dce5e8'])[v];c.fill();}
 else{const g=c.createRadialGradient(x-r*(v===1?.15:.35),y-r*.4,r*.08,x,y,r);g.addColorStop(0,(color===1?['#555b5c','#41484b','#858b90']:['#ffffff','#fffdf7','#ffffff'])[v]);g.addColorStop(1,(color===1?['#111415','#24292c','#06090c']:['#dce2df','#e5decd','#becbd2'])[v]);c.fillStyle=g;c.fill();}
 c.restore();c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.strokeStyle=color===1?'#101718':'#87958f';c.lineWidth=.7;c.stroke();
}
async function open(){if(native){if(session){await native('auxiliary',{action:'focus',kind:'appearance',payload:{}});return;}session=crypto.randomUUID();try{await native('auxiliary',{action:'open',kind:'appearance',payload:{id:session,width:720,height:760}});}catch(e){await window.KifuDialogs?.confirm(String(e?.message||e),{accept:'閉じる'});}}else{if(editorWindow&&!editorWindow.closed){editorWindow.focus();return;}editorWindow=window.open('appearance.html','gokifu-appearance','width=720,height=760,resizable=yes,scrollbars=yes');editorWindow?.focus();}}
window.KifuAppearance={get settings(){return settings;},open,play,paintBoard,paintStone,apply};
window.addEventListener('storage',e=>{if(e.key===KEY)apply(read());if(e.key==='gokifu-language'){apply(settings);if(editor)render();}});
window.addEventListener('kifu-language-change',()=>{apply(settings);if(editor)render();});
window.addEventListener('kifu-aux',e=>{const m=e.detail;if(m.kind!=='appearance')return;
 if(!editor){if(m.id!==session)return;
  if(m.type==='appearance-ready')send('appearance-init',{settings:read()}).catch(()=>{});
  if(m.type==='appearance-preview')apply(m.data.settings);
  if(m.type==='appearance-revert'||m.type==='closed')apply(read());if(m.type==='closed')session=null;
  if(m.type==='appearance-commit'){try{const saved=C.clean(m.data.settings);localStorage.setItem(KEY,JSON.stringify(saved));apply(saved);notify('restore');send('appearance-saved',{settings:saved}).catch(()=>{});}catch{send('appearance-saved',{error:true}).catch(()=>{});}}
 }else if(m.id===params.get('id')){
  if(m.type==='appearance-init'){draft=C.clean(m.data.settings);apply(draft);render();}
  if(m.type==='appearance-saved'&&pendingCommit){const done=pendingCommit;pendingCommit=null;done(m.data);}
 }
});
function begin(){apply(settings);if(editor){document.body.classList.add('appearance-window');draft=read();render();if(native)send('appearance-ready',{}).catch(error);loadFonts();return;}
 if(!document.getElementById('board'))return;
 const footer=document.querySelector('.footer-links');if(footer){const b=document.createElement('button');b.id='appearance-open';b.dataset.safeDisplay='1';b.textContent='表示・音';b.title='文字・碁盤・グラフ・石音を設定します';b.onclick=open;const actions=document.createElement('div');actions.className='sidebar-utilities';document.querySelector('#board-sidebar .header-actions').after(actions);actions.append(b);const keys=document.getElementById('shortcuts-open');if(keys)actions.append(keys);}
 const view=[...document.querySelectorAll('#simple-menu summary')].find(e=>(window.KifuI18n?.rawText(e)||e.textContent)==='表示'||e.textContent==='View')?.nextElementSibling;
 if(view){const b=document.createElement('button');b.textContent='表示・音';b.dataset.safeDisplay='1';b.onclick=()=>{view.parentElement.open=false;open();};view.append(b);}
}
let tab='text';
function render(){
 document.title=text('表示・音','Appearance & Sound');if(native)native('auxiliary',{action:'title',kind:'appearance',payload:{title:document.title}}).catch(()=>{});document.body.replaceChildren();const host=document.createElement('main');host.dataset.appearanceEditor='';host.dataset.noI18n='';document.body.append(host);
 const heading=document.createElement('header');heading.className='appearance-heading';const h=document.createElement('h1');h.textContent=document.title;heading.append(h);host.append(heading);
 const close=button(text('閉じる','Close'),()=>{revert();finish();});heading.append(close);
 if(native)heading.addEventListener('pointerdown',e=>{if(e.button===0&&!e.target.closest('button'))native('auxiliary',{action:'drag',kind:'appearance',payload:{}}).catch(()=>{});});
 const nav=document.createElement('nav');nav.className='appearance-tabs';host.append(nav);for(const [id,ja,en]of [['text','文字','Text'],['board','碁盤・背景','Board / Background'],['graph','グラフ','Graph'],['audio','石音','Sound']]){const b=button(text(ja,en),()=>{tab=id;render();});b.setAttribute('aria-selected',String(tab===id));nav.append(b);}
 const section=document.createElement('section');section.className='appearance-section';host.append(section);
 const row=()=>{const d=document.createElement('div');d.className='appearance-row';section.append(d);return d;};
 const label=(parent,title,el)=>{const l=document.createElement('label');l.append(document.createTextNode(title+' '),el);parent.append(l);return el;};
 const select=(parent,title,value,options,change)=>{const s=document.createElement('select');for(const [v,t]of options){const o=new Option(t,v);s.add(o);}s.value=value;s.onchange=()=>{change(s.value);preview();};return label(parent,title,s);};
 const check=(parent,title,key)=>{const el=document.createElement('input');el.type='checkbox';el.checked=draft[key];el.onchange=()=>{draft[key]=el.checked;preview();};label(parent,title,el);};
 const color=(parent,title,key)=>{const el=document.createElement('input');el.type='color';el.value=draft[key];el.oninput=()=>{draft[key]=el.value;preview();};label(parent,title,el);};
 const hint=s=>{const p=document.createElement('p');p.className='appearance-hint';p.textContent=s;section.append(p);};
 const file=(parent,title,key,audioFile=false)=>{const el=document.createElement('input');el.type='file';el.accept=audioFile?'.wav,audio/wav':'image/png,image/jpeg,image/webp';label(parent,title,el);el.onchange=async()=>{try{const f=el.files[0];if(!f)return;draft[key]=audioFile?await readWav(f):await readImage(f);if(audioFile){draft.sound='custom';draft.soundName=f.name;}if(key==='blackImage')draft.blackPreset='custom';if(key==='whiteImage')draft.whitePreset='custom';preview();render();}catch(e){error(e);}};if(audioFile&&draft[key]){const name=document.createElement('span');name.dataset.noI18n='';name.className='appearance-audio-name';name.textContent=draft.soundName||'WAV';parent.append(name);}if(draft[key])parent.append(button(text('解除','Clear'),()=>{draft[key]='';if(audioFile){draft.sound='soft';draft.soundName='';}preview();render();}));};
 if(tab==='text'){
  const lang=language();hint(text('日本語と英語の文字設定は別々に記憶します。','Text preferences are saved separately for Japanese and English.'));
  const r=row();select(r,text('文字サイズ','Text size'),draft[lang].size,[['small',text('小 12px','Small 12px')],['normal',text('標準 14px','Normal 14px')],['large',text('大 16px','Large 16px')],['xlarge',text('特大 18px','Extra large 18px')]],v=>draft[lang].size=v);
  const listRow=row();const choices=[['system-ui',text('標準フォント','System default')],...fonts.map(f=>[f,f])];if(!choices.some(v=>v[0]===draft[lang].font))choices.push([draft[lang].font,draft[lang].font]);
  const installed=select(listRow,text('インストール済み','Installed fonts'),draft[lang].font,choices,v=>{draft[lang].font=v;render();});installed.id='appearance-installed-font';listRow.append(button(text('再取得','Refresh'),()=>loadFonts(true)));
  const font=document.createElement('input');font.type='text';font.value=draft[lang].font;font.maxLength=80;font.id='appearance-font-name';font.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();font.blur();}};font.onchange=()=>{draft[lang].font=font.value;preview();font.value=draft[lang].font;};label(row(),text('フォント名を入力','Enter font family'),font);
  hint(fontState==='loading'?text('フォント一覧を取得しています…','Loading installed fonts…'):fontError||text('上の一覧から選ぶか、入力欄にフォント名を入力してEnterで反映します。','Select an installed font above, or type a family name and press Enter.'));
  select(row(),text('盤上の数字・記号','Board labels'),String(draft.boardText),[['0.8','80%'],['1','100%'],['1.2','120%']],v=>draft.boardText=Number(v));
  const sample=document.createElement('div');sample.className='appearance-example';sample.textContent=text('文字の見本：黒番・白番・候補手 0123456789','Preview: Black / White / Candidates 0123456789');sample.append(button(text('ボタンの見本','Sample button'),()=>{}));section.append(sample);
  hint(text('大きい文字では折り返しやスクロールが増え、碁盤が小さくなる場合があります。','Larger text may wrap, require scrolling, or reduce board size.'));
 }else if(tab==='board'){
  select(row(),text('テーマ','Theme'),draft.theme,[['warm',text('木肌','Warm wood')],['paper',text('白灰','Paper')],['night',text('夜','Night')]],v=>{draft.theme=v;Object.assign(draft,C.themes[v]);draft.texture=v==='warm'?'grain':'plain';preview();render();});
  for(const [k,ja,en]of [['board','碁盤色','Board'],['background','画面の余白色','Outer background'],['panel','パネル背景','Panels'],['text','文字色','Text']])color(row(),text(ja,en),k);
  select(row(),text('碁盤の模様','Board texture'),draft.texture,[['plain',text('無地','Plain')],['grain',text('木目','Wood grain')],['image',text('画像','Image')]],v=>{draft.texture=v;render();});file(row(),text('碁盤画像','Board image'),'boardImage');
  select(row(),text('碁石','Stones'),draft.stone,[['gradient',text('立体','Shaded')],['flat',text('単色','Flat')],['image',text('画像','Images')]],v=>{draft.stone=v;render();});
  for(const side of ['black','white']){
   const title=side==='black'?text('黒石','Black stones'):text('白石','White stones'),r=row();const options=draft.stone==='gradient'?[text('標準','Classic'),text('柔らかい光','Soft light'),text('光沢','Gloss')]:draft.stone==='flat'?[text('標準','Classic'),text('暖色','Warm'),text('寒色','Cool')]:[text('石肌','Slate'),text('細目','Grain'),text('波紋','Rings')];
   for(const [i,preset]of ['classic','soft','gloss'].entries()){
    const b=button(options[i],()=>{draft[side+'Preset']=preset;preview();render();});b.className='stone-preset';b.setAttribute('aria-label',title+' '+options[i]);b.setAttribute('aria-pressed',String(draft[side+'Preset']===preset));const canvas=document.createElement('canvas');canvas.width=72;canvas.height=72;b.prepend(canvas);r.append(b);paintStone(canvas.getContext('2d'),side==='black'?1:2,36,36,32,{...draft,[side+'Preset']:preset});
   }
   file(row(),title+text('：自分の画像',': custom image'),side+'Image');
   if(draft[side+'Image'])r.append(button(text('自分の画像を使用','Use custom image'),()=>{draft[side+'Preset']='custom';preview();render();}));
  }
  hint(text('画像はPNG/JPEG/WebP、8MB以下。512px以内に縮小して設定に保存します。','PNG/JPEG/WebP images up to 8 MB are resized to at most 512px and stored with settings.'));
 }else if(tab==='graph'){
  for(const [k,ja,en]of [['graph','グラフ背景','Graph background'],['graphText','目盛り文字','Axis labels'],['win','勝率の線','Win-rate line'],['score','目数差の線','Score line']])color(row(),text(ja,en),k);
  select(row(),text('線の太さ','Line width'),String(draft.lineWidth),[1,1.5,2,2.5,3,3.5,4].map(v=>[String(v),v+'px']),v=>draft.lineWidth=Number(v));select(row(),text('線の種類','Line style'),draft.lineStyle,[['solid',text('実線','Solid')],['dash',text('破線','Dashed')]],v=>draft.lineStyle=v);
  hint(text('AI同士の対局では勝率を黒線・白線で区別します。目数差の白側評価は破線で示します。','AI games retain black/white win-rate lines and a dashed line for White’s score estimate.'));
 }else{
  select(row(),text('石音','Stone sound'),draft.sound,[['soft',text('柔らかい音','Soft')],['clear',text('明瞭な音','Clear')],['low',text('低めの音','Low')],['custom',text('WAVファイル','WAV file')]],v=>draft.sound=v);file(row(),text('音声ファイル','Audio file'),'soundData',true);
  const v=document.createElement('input');v.type='range';v.min=0;v.max=100;v.value=draft.volume;const value=document.createElement('span');value.textContent=draft.volume+'%';v.oninput=()=>{draft.volume=Number(v.value);value.textContent=v.value+'%';preview();};const r=row();label(r,text('音量','Volume'),v);r.append(value,button(text('試聴','Play sample'),()=>play()));
  check(row(),text('着手','Played moves'),'moves');check(row(),text('手順移動','Navigation'),'navigation');check(row(),text('自動再生','Autoplay'),'autoplay');hint(text('読み筋のマウスオーバーでは鳴りません。WAVは1MB以下です。','Hovering over a variation is silent. WAV files must be no larger than 1 MB.'));
 }
 const status=document.createElement('p');status.id='appearance-error';status.setAttribute('role','status');host.append(status);
 const actions=document.createElement('div');actions.className='appearance-actions';host.append(actions);actions.append(button(text('標準に戻す','Reset defaults'),()=>{draft=C.defaults();preview();render();}),button(text('元に戻す','Revert'),()=>{revert();render();}),button(text('適用','Apply'),save));

}
async function save(){try{
 if(native){const result=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>{pendingCommit=null;reject(Error(text('本体からの応答がありません。','No response from the main window.')));},10000);pendingCommit=v=>{clearTimeout(timer);resolve(v);};send('appearance-commit',{settings:C.clean(draft)}).catch(e=>{clearTimeout(timer);pendingCommit=null;reject(e);});});if(result.error)throw Error('storage');draft=C.clean(result.settings);localStorage.setItem(KEY,JSON.stringify(draft));apply(draft);}
 else{localStorage.setItem(KEY,JSON.stringify(C.clean(draft)));apply(draft);notify('restore');}
 const status=document.getElementById('appearance-error');status.dataset.success='true';status.textContent=text('設定を保存しました。','Settings saved.');
 }catch(e){error(text('設定を保存できません。画像・音声の容量と本体の状態を確認してください。','Settings could not be saved. Check media size and the main window.'));}}
async function loadFonts(force=false){if(fontState==='loading'||fontState==='ready'&&!force)return;fontState='loading';fontError='';render();try{let result=[];if(native)result=await native('desktop_fonts',{});else if(window.queryLocalFonts)result=(await window.queryLocalFonts()).map(f=>f.family);else throw Error('unsupported');fonts=[...new Set(result)].filter(f=>typeof f==='string').sort((a,b)=>a.localeCompare(b));fontState='ready';if(!fonts.length)fontError=text('一覧を取得できません。フォント名を入力してください。','The list is unavailable. Enter a font family manually.');}catch{fontState='error';fontError=text('フォント一覧を取得できません。フォント名を入力できます。','Installed fonts could not be listed. You can enter a font family manually.');}render();}
function button(label,fn){const b=document.createElement('button');b.type='button';b.textContent=label;b.onclick=fn;return b;}
function error(e){const el=document.getElementById('appearance-error');if(el){el.dataset.success='false';el.textContent=String(e?.message||e);}}
function preview(){draft=C.clean(draft);apply(draft);notify('preview');}
function revert(){draft=read();apply(draft);notify('restore');}
function finish(){if(native)native('auxiliary',{action:'close',kind:'appearance',payload:{}}).catch(error);else window.close();}
function dataURL(f){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(Error(text('ファイルを読めません。','Cannot read file.')));reader.readAsDataURL(f);});}
async function readImage(f){if(!/^image\/(png|jpeg|webp)$/.test(f.type)||f.size>8*1024*1024)throw Error(text('PNG/JPEG/WebPの8MB以下の画像を選択してください。','Select a PNG/JPEG/WebP image up to 8 MB.'));const bitmap=await createImageBitmap(f);try{const scale=Math.min(1,512/Math.max(bitmap.width,bitmap.height)),c=document.createElement('canvas');c.width=Math.max(1,Math.round(bitmap.width*scale));c.height=Math.max(1,Math.round(bitmap.height*scale));c.getContext('2d').drawImage(bitmap,0,0,c.width,c.height);return c.toDataURL('image/webp',.9);}finally{bitmap.close();}}
async function readWav(f){const bytes=new Uint8Array(await f.arrayBuffer());const str=(a,b)=>String.fromCharCode(...bytes.slice(a,b));if(f.size>1024*1024||str(0,4)!=='RIFF'||str(8,12)!=='WAVE')throw Error(text('1MB以下のWAVファイルを選択してください。','Select a WAV file up to 1 MB.'));return dataURL(new Blob([bytes],{type:'audio/wav'}));}
window.addEventListener('pagehide',()=>{if(editor)channel?.postMessage({type:'restore'});});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',begin,{once:true});else begin();
})();
