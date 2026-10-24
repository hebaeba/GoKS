/* Board photo / diagram import: local pixels only. MIT, 2026 Eba. */
(()=>{'use strict';
const $=id=>document.getElementById(id),C=GoImageBoard,letters='ABCDEFGHJKLMNOPQRST';
const dialog=document.createElement('dialog');dialog.id='image-board-dialog';dialog.setAttribute('aria-labelledby','image-board-title');
dialog.innerHTML=`<div class="image-title"><h2 id="image-board-title">画像から局面を取り込む</h2><button id="image-close" aria-label="画像取り込みを閉じる">閉じる</button></div>
<div class="image-options"><button id="image-file-open">画像を選ぶ</button><button id="image-camera-open" title="対応するスマホ等ではカメラを開きます。Windows等ではファイル選択になる場合があります">撮影する</button><span>PNG・JPG・WebP／端末内で処理</span><input id="image-file" type="file" accept="image/png,image/jpeg,image/webp" hidden><input id="image-camera" type="file" accept="image/*" capture="environment" hidden></div>
<div class="image-options"><label>碁盤 <select id="image-size" aria-label="画像の碁盤の路数"></select>路</label><label>左端 <select id="image-left"></select></label><label>右端 <select id="image-right"></select></label><label>上端 <select id="image-top"></select></label><label>下端 <select id="image-bottom"></select></label><button id="image-full">全盤</button></div>
<p class="image-guide">① 全盤または画像に写っている範囲を指定 → ② その範囲の四隅の<b>交点</b>を、左上・右上・右下・左下の順にクリック。石がある場合は石の中心を指定します。</p>
<div class="image-work"><section><h3>元画像・交点の指定</h3><p id="image-paste-hint" role="status" class="image-drop-guide">画像をここへドラッグ、または Ctrl+V・右クリックで貼り付け</p><canvas id="image-source" tabindex="0" width="640" height="400" aria-label="画像の四隅の交点を指定"></canvas><div class="image-options"><button id="image-corners-reset">四隅を指定し直す</button><button id="image-recognize" disabled>石を認識する</button></div><section class="image-adjustments"><h3>認識の調整</h3><label>写真の石の厚み補正 <select id="image-offset"><option value="auto">自動</option><option value="0">なし（盤面図）</option><option value="-0.15">上へ少し</option><option value="-0.25">上へ中程度</option><option value="-0.35">上へ大きく</option></select></label><label>黒石の明るさ上限 <input id="image-black" type="range" min="35" max="145" value="90"></label><label>白石と盤の明るさ差 <input id="image-white" type="range" min="5" max="50" value="16"></label><small>変更後に「石を認識する」を押すと、手修正した配置も認識結果で置き換えます。</small></section></section>
<section><h3>認識結果・修正</h3><canvas id="image-review" width="500" height="500" tabindex="0" aria-label="認識した石の配置。クリックで空点・黒・白を切り替え。矢印キーで移動しEnterで修正"></canvas><p>交点をクリック：空点 → 黒 → 白 → 空点。橙の枠は要確認です。画像外の灰色部分は未確認です。</p><div class="image-options"><output id="image-stone-count" aria-live="polite">黒石 — 個 ／ 白石 — 個</output></div><div class="image-options image-game-info"><label>置き石 <select id="image-handicap" aria-label="置き石の数"><option value="0">0</option><option value="1">1</option><option value="2">2</option><option value="3">3</option><option value="4">4</option><option value="5">5</option><option value="6">6</option><option value="7">7</option><option value="8">8</option><option value="9">9</option></select></label><label>次の手番 <select id="image-turn"><option value="B">黒</option><option value="W">白</option></select></label><label>コミ <span class="image-komi-stepper"><button type="button" id="image-komi-less" aria-label="コミを0.5減らす">−</button><input id="image-komi" type="number" min="-100" max="100" step="0.5" value="0"><button type="button" id="image-komi-more" aria-label="コミを0.5増やす">＋</button></span></label><div class="image-captured">取られた石：<label>黒石 <input id="image-captured-black" type="number" min="0" max="9999" step="1" value="0" aria-label="取られた黒石の数"> 個</label> ／ <label>白石 <input id="image-captured-white" type="number" min="0" max="9999" step="1" value="0" aria-label="取られた白石の数"> 個</label></div></div><label class="image-confirm-label"><input id="image-confirm" type="checkbox">元画像と石の配置を確認しました</label><p>着手順・手数番号は復元しません。配置図として取り込みます。</p></section></div>
<p id="image-status" role="status" aria-live="polite">画像を選んでください。</p><div class="image-footer"><button id="image-import" disabled>この配置を碁盤へ取り込む</button><button id="image-cancel">キャンセル</button></div>`;
document.body.append(dialog);

const open=document.createElement('button');open.id='workspace-image-open';open.textContent='画像から';open.title='写真や碁盤図から石の配置を取り込みます';$('workspace-open').after(open);
const menu=document.createElement('button');menu.textContent='画像・写真から';menu.type='button';$('load-options').append(menu);
let image=null,pixels=null,corners=[],result=null,name='',loadToken=0,focus=0,imported=false,committing=false;
const source=$('image-source'),review=$('image-review'),ctx=source.getContext('2d'),rc=review.getContext('2d');
function resetImage(){
 loadToken++;imageHint(defaultPasteHint);source.style.outline='';source.closest('section').classList.remove('image-dragover');image=null;pixels=null;corners=[];result=null;name='';focus=0;imported=false;
 source.width=640;source.height=400;$('image-file').value='';$('image-camera').value='';
 $('image-handicap').value='0';$('image-turn').value='B';$('image-komi').value='0';$('image-captured-black').value='0';$('image-captured-white').value='0';options();status('画像を選んでください。');
}
window.addEventListener('kifu-record-replaced',()=>{if(!committing)resetImage();});
window.addEventListener('kifu-record-saved',()=>{if(imported)resetImage();});
for(const id of ['open','paste-board','import-text','load-text-choice'])$(id)?.addEventListener('click',()=>{if(imported)resetImage();},true);
function status(text){$('image-status').textContent=text;}
function bounds(){const size=+$('image-size').value,left=+$('image-left').value,right=+$('image-right').value,top=+$('image-top').value,bottom=+$('image-bottom').value;if(right<=left||bottom<=top)throw Error('横・縦とも２交点以上となる範囲を指定してください。');return {size,left,top,cols:right-left+1,rows:bottom-top+1};}
function defaults(){const n=+$('image-size').value;const h=+$('image-handicap').value;const full=n===19&&+$('image-left').value===0&&+$('image-top').value===0&&+$('image-right').value===18&&+$('image-bottom').value===18;$('image-komi').value=h>0?'0.5':full?'6.5':'0';$('image-turn').value=h>0?'W':'B';}
$('image-handicap').onchange=()=>{if($('image-handicap').value!==''&&$('image-handicap').checkValidity())defaults();};
for(const [id,delta]of [['image-komi-less',-.5],['image-komi-more',.5]])$(id).onclick=()=>{const input=$('image-komi');input.value=String(Math.max(-100,Math.min(100,(Number(input.value)||0)+delta)));input.dispatchEvent(new Event('input',{bubbles:true}));};
function options(){const n=+$('image-size').value;for(const id of ['left','right','top','bottom']){const e=$('image-'+id);e.replaceChildren();for(let i=0;i<n;i++)e.add(new Option(['left','right'].includes(id)?letters[i]:String(n-i),i));e.value=['right','bottom'].includes(id)?n-1:0;}defaults();invalidate();}
for(let n=4;n<=19;n++)$('image-size').add(new Option(n,n));$('image-size').value=19;options();
function invalidate(){result=null;$('image-confirm').checked=false;$('image-import').disabled=true;drawSource();drawReview();}
function drawSource(){ctx.clearRect(0,0,source.width,source.height);if(image)ctx.drawImage(image,0,0,source.width,source.height);else{ctx.fillStyle='#edf2ee';ctx.fillRect(0,0,source.width,source.height);}ctx.lineWidth=Math.max(1,source.width/550);if(corners.length===4){try{const b=bounds(),map=C.transform(corners,b.cols,b.rows);ctx.strokeStyle='rgba(0,210,230,.7)';for(let x=0;x<b.cols;x++){const a=map(x,0),z=map(x,b.rows-1);ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(z.x,z.y);ctx.stroke();}for(let y=0;y<b.rows;y++){const a=map(0,y),z=map(b.cols-1,y);ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(z.x,z.y);ctx.stroke();}}catch{}}
 corners.forEach((p,i)=>{const r=Math.max(5,source.width/85);ctx.fillStyle='#b00035';ctx.beginPath();ctx.arc(p.x,p.y,r,0,Math.PI*2);ctx.fill();ctx.font=`bold ${r*1.5}px sans-serif`;ctx.fillStyle='white';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(i+1,p.x,p.y);});$('image-recognize').disabled=!pixels||corners.length!==4;
}
function drawReview(){
 $('image-stone-count').textContent=result?'黒石 '+result.board.filter(v=>v===1).length+' 個 ／ 白石 '+result.board.filter(v=>v===2).length+' 個':'黒石 — 個 ／ 白石 — 個';const n=+$('image-size').value,g=440/(n-1),start=30;rc.fillStyle='#eee';rc.fillRect(0,0,500,500);let b;try{b=bounds();}catch{return;}rc.fillStyle='#edc976';rc.fillRect(start+b.left*g-g*.45,start+b.top*g-g*.45,b.cols*g-g*.1,b.rows*g-g*.1);rc.strokeStyle='#777';rc.lineWidth=1;for(let i=0;i<n;i++){rc.beginPath();rc.moveTo(start+i*g,start);rc.lineTo(start+i*g,470);rc.moveTo(start,start+i*g);rc.lineTo(470,start+i*g);rc.stroke();rc.fillStyle='#333';rc.font='12px sans-serif';rc.textAlign='center';rc.fillText(letters[i],start+i*g,16);rc.fillText(n-i,13,start+i*g+4);}
 if(!result)return;result.board.forEach((v,i)=>{const x=start+(b.left+i%b.cols)*g,y=start+(b.top+Math.floor(i/b.cols))*g;if(v){rc.beginPath();rc.arc(x,y,g*.44,0,Math.PI*2);rc.fillStyle=v===1?'#111':'#fff';rc.fill();rc.strokeStyle='#222';rc.stroke();}if(result.confidence[i]<.5){rc.strokeStyle='#c66300';rc.lineWidth=2;rc.strokeRect(x-g*.44,y-g*.44,g*.88,g*.88);rc.lineWidth=1;}if(document.activeElement===review&&i===focus){rc.strokeStyle='#007a99';rc.strokeRect(x-g*.48,y-g*.48,g*.96,g*.96);}});
}
async function readFile(file){if(!file)return;const token=++loadToken;image=null;pixels=null;corners=[];invalidate();status('画像を読み込んでいます…');try{if(file.size>25*1024*1024)throw Error('画像は25MB以下にしてください。');if(!/^image\/(png|jpeg|webp)$/.test(file.type)&&! /\.(png|jpe?g|webp)$/i.test(file.name))throw Error('PNG・JPG・WebP画像を選んでください。');const head=new Uint8Array(await file.slice(0,12).arrayBuffer());if(!(head[0]===137&&head[1]===80&&head[2]===78&&head[3]===71||head[0]===255&&head[1]===216&&head[2]===255||String.fromCharCode(...head.slice(0,4))==='RIFF'&&String.fromCharCode(...head.slice(8,12))==='WEBP'))throw Error('PNG・JPG・WebP形式の画像を選んでください。');const url=URL.createObjectURL(file),im=new Image();try{await new Promise((resolve,reject)=>{im.onload=resolve;im.onerror=()=>reject(Error('画像を開けませんでした。'));im.src=url;});}finally{URL.revokeObjectURL(url);}if(token!==loadToken||!dialog.open)return;if(im.width*im.height>40000000)throw Error('画像は4000万画素以下にしてください。');const scale=Math.min(1,1600/Math.max(im.width,im.height));source.width=Math.round(im.width*scale);source.height=Math.round(im.height*scale);image=im;ctx.drawImage(im,0,0,source.width,source.height);pixels=ctx.getImageData(0,0,source.width,source.height);name=file.name.replace(/\.[^.]+$/,'')+'.sgf';drawSource();status('左上の交点をクリックしてください。部分画像は先に範囲を指定してください。');}catch(e){status(e.message);}}
open.onclick=menu.onclick=()=>{if(document.body.classList.contains('scoring-mode'))return;if(!dialog.open){resetImage();dialog.showModal();}};
$('image-file-open').onclick=()=>$('image-file').click();$('image-camera-open').onclick=()=>$('image-camera').click();for(const id of ['image-file','image-camera'])$(id).onchange=()=>{const f=$(id).files[0];$(id).value='';readFile(f);};
// Keep handlers on the adopted dialog and its current document (separate window).
const pasteHint=$('image-paste-hint');
const defaultPasteHint=pasteHint.textContent;
function imageHint(text){pasteHint.textContent=text;}
function receiveImages(files){
 const list=Array.from(files||[]);
 if(list.length!==1){imageHint('画像は１枚ずつ取り込んでください。');return;}
 imageHint(defaultPasteHint);return readFile(list[0]);
}
function pasteImage(e){
 if(!dialog.open||dialog.ownerDocument!==e.currentTarget)return;
 let files=Array.from(e.clipboardData?.files||[]).filter(f=>f.type.startsWith('image/'));
 if(!files.length)files=Array.from(e.clipboardData?.items||[]).filter(i=>i.kind==='file'&&i.type.startsWith('image/')).map(i=>i.getAsFile()).filter(Boolean);
 if(!files.length){imageHint('画像データがありません。画像を表示して「画像をコピー」するか、画像ファイルをこの窓へドラッグしてください。');return;}
 e.preventDefault();e.stopPropagation();receiveImages(files);
}
function installImagePaste(doc){
 doc.addEventListener('paste',pasteImage,true);
 // Catch drops anywhere in the image window before the browser navigates.
 for(const type of ['dragenter','dragover','drop'])doc.addEventListener(type,e=>{
  if(!dialog.open||dialog.ownerDocument!==doc)return;
  e.preventDefault();e.stopPropagation();
  if(type!=='drop'){if(e.dataTransfer)e.dataTransfer.dropEffect='copy';return;}
  source.style.outline='';
  let files=Array.from(e.dataTransfer?.files||[]);
  if(!files.length)files=Array.from(e.dataTransfer?.items||[]).filter(i=>i.kind==='file').map(i=>i.getAsFile()).filter(Boolean);
  if(files.length)receiveImages(files);
  else imageHint('画像へのリンクを受け取りました。画像ファイルをドラッグするか、画像をコピーしてCtrl+Vで貼り付けてください。');
 },true);
}
installImagePaste(document);
source.addEventListener('contextmenu',async e=>{
 e.preventDefault();e.stopPropagation();source.focus();imageHint('クリップボードを確認しています…');
 const nav=dialog.ownerDocument.defaultView.navigator,token=loadToken;
 if(!nav.clipboard?.read){imageHint('右クリックでの読み取りに対応していません。画像をコピーし、この窓で Ctrl+V を押してください。');return;}
 try{
  const items=await nav.clipboard.read();
  if(!dialog.open||token!==loadToken)return;
  for(const item of items){const type=item.types.find(t=>/^image\/(png|jpeg|webp)$/.test(t));if(!type)continue;
   const blob=await item.getType(type);if(!dialog.open||token!==loadToken)return;
   return receiveImages([new File([blob],'貼り付けた画像.'+(type==='image/jpeg'?'jpg':type.split('/')[1]),{type})]);
  }
  imageHint('コピーされた画像がありません。「画像をコピー」またはスクリーンショットを実行し、Ctrl+Vで貼り付けてください。');
 }catch{if(dialog.open&&token===loadToken)imageHint('クリップボードの読み取りが許可されませんでした。この窓で Ctrl+V を押して貼り付けてください。');}
});
const imageArea=source.closest('section');
imageArea.addEventListener('dragover',e=>{if(Array.from(e.dataTransfer?.types||[]).includes('Files')){e.preventDefault();e.stopPropagation();e.dataTransfer.dropEffect='copy';source.style.outline='2px dashed #245f57';}});
imageArea.addEventListener('dragleave',e=>{if(!imageArea.contains(e.relatedTarget))source.style.outline='';});
imageArea.addEventListener('drop',e=>{e.preventDefault();e.stopPropagation();source.style.outline='';receiveImages(e.dataTransfer?.files);});
// Prevent accidental navigation when a file is dropped elsewhere in this dialog.
for(const type of ['dragover','drop'])dialog.addEventListener(type,e=>{if(Array.from(e.dataTransfer?.types||[]).includes('Files'))e.preventDefault();});
window.KifuImageImport={
 nativeDrag(phase){if(!dialog.open)return false;imageArea.classList.toggle('image-dragover',phase==='enter');return true;},
 nativeDrop(payload){if(!dialog.open)return false;imageArea.classList.remove('image-dragover');if(payload.error){status(payload.error);return true;}const ext=payload.name?.split('.').pop().toLowerCase();const type={png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',webp:'image/webp'}[ext];if(!type){status('PNG・JPG・WebP画像をドロップしてください。');return true;}readFile(new File([new Uint8Array(payload.bytes)],payload.name,{type}));return true;}
};
$('image-size').onchange=options;for(const id of ['left','right','top','bottom'])$('image-'+id).onchange=()=>{defaults();invalidate();};$('image-full').onclick=options;
source.onclick=e=>{if(!pixels||corners.length>=4)return;const r=source.getBoundingClientRect();corners.push({x:(e.clientX-r.left)*source.width/r.width,y:(e.clientY-r.top)*source.height/r.height});invalidate();status(corners.length===4?'水色の線が元画像の交点に合っているか確認し、「石を認識する」を押してください。':['左上','右上','右下','左下'][corners.length]+'の交点をクリックしてください。');};
$('image-corners-reset').onclick=()=>{corners=[];invalidate();status('左上の交点から指定し直してください。');};
$('image-recognize').onclick=()=>{try{const b=bounds();result=C.recognize(pixels,corners,b.cols,b.rows,{black:+$('image-black').value,white:+$('image-white').value,offset:$('image-offset').value});focus=0;$('image-confirm').checked=false;$('image-import').disabled=true;drawReview();status('石の配置を認識しました。石数を確認し、誤認識は右の盤面をクリックして修正してください。');}catch(e){result=null;drawReview();status(e.message);}};
function change(i){if(!result)return;result.board[i]=(result.board[i]+1)%3;result.confidence[i]=1;$('image-confirm').checked=false;$('image-import').disabled=true;drawReview();}
review.onclick=e=>{if(!result)return;const b=bounds(),r=review.getBoundingClientRect(),g=440/(b.size-1),x=Math.round(((e.clientX-r.left)*500/r.width-30)/g)-b.left,y=Math.round(((e.clientY-r.top)*500/r.height-30)/g)-b.top;if(x<0||y<0||x>=b.cols||y>=b.rows)return;focus=y*b.cols+x;change(focus);};
review.onkeydown=e=>{if(!result)return;const b=bounds();if(e.key==='Enter'||e.key===' '){e.preventDefault();e.stopPropagation();change(focus);return;}if(e.key.startsWith('Arrow')){e.preventDefault();e.stopPropagation();let x=focus%b.cols,y=Math.floor(focus/b.cols);x+=e.key==='ArrowRight'?1:e.key==='ArrowLeft'?-1:0;y+=e.key==='ArrowDown'?1:e.key==='ArrowUp'?-1:0;focus=Math.max(0,Math.min(b.rows-1,y))*b.cols+Math.max(0,Math.min(b.cols-1,x));drawReview();}};
review.onfocus=review.onblur=drawReview;$('image-confirm').onchange=()=>$('image-import').disabled=!result||!$('image-confirm').checked;
$('image-import').onclick=async()=>{try{if(!result||!$('image-confirm').checked)return;for(const id of ['image-handicap','image-komi','image-captured-black','image-captured-white']){const input=$(id);if(input.value===''||!input.checkValidity())throw Error('置き石は0〜9、コミは−100〜100（0.5刻み）、取られた石は0〜9999の整数で入力してください。');}const sgf=C.toSgf({...bounds(),board:result.board,handicap:+$('image-handicap').value,turn:$('image-turn').value,komi:+$('image-komi').value,capturedBlack:+$('image-captured-black').value,capturedWhite:+$('image-captured-white').value});committing=true;if(await IndependentGo.loadSgf(sgf,name,0,{edited:true})){imported=true;dialog.close();$('edit').click();$('rotate-reset').click();}}catch(e){status(e.message);}finally{committing=false;}};
$('image-close').onclick=$('image-cancel').onclick=()=>dialog.close();dialog.addEventListener('close',()=>{if(!dialog.open)resetImage();});
})();

;(()=>{function sizeNumber(el){const step=el.step||'1',fraction=step.includes('.')?step.split('.')[1].length:0;let max=el.max,min=el.min;const count=Math.max(String(el.value||'0').length,max?String(max).length:(el.id==='jump'||el.id.startsWith('gif-')?5:4),min?String(min).length:1);el.style.setProperty('--number-ch',Math.max(count,(max?String(Math.trunc(+max)).length:3)+(fraction?fraction+1:0)+(min&&+min<0?1:0)));}function all(){document.querySelectorAll('input[type=number]').forEach(sizeNumber);}all();document.addEventListener('input',e=>{if(e.target.matches('input[type=number]'))sizeNumber(e.target);});new MutationObserver(all).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['max','min','type']});})();
