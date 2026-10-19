/* Independent Go Basic — application. Newly implemented, 2026-10-05. MIT. */
'use strict';
(() => {
  let toolRoot=null,toolWindow=null,closeToolWindow=null,toolOpening=false;
  const R = GoRules, S = GoSgf, $ = id => document.getElementById(id)||toolRoot?.querySelector('#'+id);
  const firstElement=selector=>document.querySelector(selector)||toolRoot?.querySelector(selector);
  const allElements=selector=>[...new Set([...document.querySelectorAll(selector),...(toolRoot?toolRoot.querySelectorAll(selector):[])])];
  let root = S.create(), size = 19, choices = new WeakMap(), route = [], frames = [], numberFrames = [], issues = [], index = 0;
  let editing = true, numbers = false, dirty = false, focusPoint = 0, keyboardBoard = false, originalName = 'kifu.sgf';
  let autoTimer=null,autoPlaying=false,analysisPreview=null,boardRotation=0;
  const canvas = $('board'), context = canvas.getContext('2d');
  const read = (props, key, fallback = '') => props[key]?.[0] ?? fallback;
  // Explicit KM takes priority; HA is the SGF handicap count, AB alone may be a problem diagram.
  function currentKomi(){const value=read(root.props,'KM');if(value.trim()!==''&&Number.isFinite(Number(value)))return Number(value);return Number(read(root.props,'HA','0'))>=2?0.5:0;}
  function setupKomi(){
    const label=document.createElement('label');label.textContent='コミ ';
    const input=document.createElement('input');input.id='komi-input';input.type='number';input.step='0.5';input.setAttribute('aria-label','コミ');input.title='コミを0.5目刻みで変更できます。負の値は黒コミです。変更すると編集モードになります';
    input.style.cssText='box-sizing:border-box;width:4.6em;max-width:100%;height:24px;min-height:24px;padding:1px 3px;font:inherit;color:#173c3d;background:white;border:1px solid #a8bfbc;border-radius:3px';
    label.append(input);$('komi').replaceChildren(label);
    input.onchange=()=>{
      if(input.value===''||!Number.isFinite(input.valueAsNumber)||!input.checkValidity()){input.value=String(currentKomi());report('コミを0.5刻みの数値で入力してください。',true);return;}
      const value=input.valueAsNumber;
      if(insertion||!canLeave()){input.value=String(currentKomi());return;}
      if(value===currentKomi())return;
      editing=true;transaction(()=>{root.props.KM=[String(value)];infoTarget=null;},'コミを変更しました。');
    };
    input.addEventListener('keydown',event=>{event.stopPropagation();if(event.key==='Enter'){event.preventDefault();input.blur();}});
  }
  const report = (text, error = false) => { $('message').hidden=!error;$('message').textContent = text; $('message').classList.toggle('error', error); };
  for (let n = 4; n <= 19; n++) $('size').add(new Option(n + '路', n));
  $('size').value = '19';
  function forceNode(state,props){
    const key=props.B?'B':props.W?'W':null;
    if(!key||props.B&&props.W||['AB','AW','AE'].some(k=>props[k])||props[key].length!==1)throw Error('着手データが正しくありません。');
    const point=R.coordinate(props[key][0],state.size,true),next=R.forcePlay(state,point,key==='B'?R.BLACK:R.WHITE);
    if(props.PL){if(!['B','W'].includes(props.PL[0]))throw Error('手番指定が正しくありません。');next.turn=props.PL[0]==='B'?R.BLACK:R.WHITE;}
    return next;
  }
  function applied(state,props,first){try{return R.apply(state,props,first);}catch(error){if(props.XIGPENDING||props.XIGFORCE)return forceNode(state,props);throw error;}}
  function prepareContinuation(children,state){
    const pending=[],stack=children.map(node=>({node,state}));
    while(stack.length){const item=stack.pop();let next;
      try{next=R.apply(item.state,item.node.props,false);}catch(error){next=forceNode(item.state,item.node.props);if(!item.node.props.XIGFORCE)pending.push(item.node);}
      for(const child of item.node.children)stack.push({node:child,state:next});
    }
    return pending;
  }
  function validate(game, n) {
    const stack = [{node: game, state: R.position(n), first: true}];
    while (stack.length) {
      const item = stack.pop();
      if (!item.first && item.node.props.SZ) throw Error('途中で盤の大きさを変更するSGFには対応していません。');
      let state;
      try { state = applied(item.state, item.node.props, item.first); }
      catch (error) { throw Error((item.state.move + 1) + '手付近：' + error.message); }
      for (const child of item.node.children) stack.push({node: child, state, first: false});
    }
  }
  function rebuild() {
    route = []; frames = []; numberFrames = []; issues=[];
    let current = root, state = R.position(size), labels = new Array(size * size).fill(0);
    while (current) {
      const previous = state;
      let issue='';try{state=R.apply(state,current.props,route.length===0);}catch(error){state=applied(state,current.props,route.length===0);if(!current.props.XIGFORCE)issue=error.message;}issues.push(issue);
      labels = labels.slice();
      for (const key of ['AE','AB','AW']) for (const point of R.expanded(current.props[key], size)) labels[point] = 0;
      for (let i = 0; i < labels.length; i++) if (!state.board[i]) labels[i] = 0;
      if (state.move > previous.move && state.last?.point !== null) labels[state.last.point] = state.move;
      route.push(current); frames.push(state); numberFrames.push(labels);
      current = current.children[choices.get(current) || 0];
    }
    index = Math.min(index, route.length - 1);
  }
  // History stores editable SGF plus navigation choices, never DOM or browser data.
  let stroke=null,suppressClick=false;let undoStack=[],redoStack=[],insertion=null,tool='play',serial=1;
  let commentTarget=null,infoTarget=null;
  function visitTree(action){const stack=[root];let ordinal=0;while(stack.length){const item=stack.pop();action(item,ordinal++);for(let i=item.children.length-1;i>=0;i--)stack.push(item.children[i]);}}
  function snapshot(){const selected=[];visitTree((node,ordinal)=>{const choice=choices.get(node)||0;if(choice)selected.push([ordinal,choice]);});return {sgf:S.write(root),selected,index,size,name:originalName,dirty,serial};}
  function restore(saved){root=S.parse(saved.sgf).root;size=saved.size;originalName=saved.name;dirty=saved.dirty;serial=saved.serial||1;index=saved.index;choices=new WeakMap();const selected=new Map(saved.selected);visitTree((node,ordinal)=>{if(selected.has(ordinal))choices.set(node,selected.get(ordinal));});commentTarget=null;infoTarget=null;rebuild();refresh();}
  function trimHistory(){while(undoStack.length>60)undoStack.shift();while(redoStack.length>60)redoStack.shift();let bytes=undoStack.concat(redoStack).reduce((sum,item)=>sum+item.sgf.length*2,0);while(bytes>12*1024*1024&&(undoStack.length+redoStack.length)>1){const item=undoStack.length?undoStack.shift():redoStack.shift();bytes-=item.sgf.length*2;}}
  function remember(before){undoStack.push(before);redoStack=[];trimHistory();dirty=true;}
  function transaction(action,message,checkRules=false){if(scoreSession||!editing||insertion)return false;const before=snapshot();try{action();S.parse(S.write(root));if(checkRules)validate(root,size);rebuild();if(S.write(root)!==before.sgf){if(stroke)dirty=true;else remember(before);}refresh();if(message)report(message);return true;}catch(error){restore(before);report('編集を反映できませんでした：'+error.message,true);return false;}}
  function hasCommentDraft(){return commentTarget&&$('comment-edit').value!==read(commentTarget.props,'C');}
  function hasInfoDraft(){return infoTarget&&[...allElements('[data-prop]')].some(input=>input.value!==read(infoTarget.props,input.dataset.prop));}
  function clearDrafts(){commentTarget=null;infoTarget=null;syncEditors();}
  function canLeave(){if(scoreSession)return false;if(!hasCommentDraft()&&!hasInfoDraft())return true;if(!confirm('「反映」していない文章があります。入力を破棄して移動・操作しますか？'))return false;clearDrafts();return true;}
  function syncEditors(){if(commentTarget!==route[index]){commentTarget=route[index];$('comment-edit').value=read(commentTarget.props,'C');}if(infoTarget!==root){infoTarget=root;allElements('[data-prop]').forEach(input=>{input.value=read(root.props,input.dataset.prop);});}}
  function activeVariation(){// Nearest chosen non-main branch, also when standing at its fork.
    for(let i=route.length-1;i>=0;i--){const parent=route[i],choice=choices.get(parent)||0;if(choice>0&&parent.children[choice])return {parent,choice,depth:i};}return null;
  }
  function editRefresh(){
    const blocked=!editing||!!insertion,variation=activeVariation();
    $('undo').disabled=blocked||!undoStack.length;$('redo').disabled=blocked||!redoStack.length;
    $('insert').disabled=!editing;$('insert').textContent=insertion?'終了する':'ここへ挿入';$('insert').title=insertion?'挿入を終了します':'直近の手に続いて挿入します';$('insert').classList.toggle('active',!!insertion);$('cancel-insert').hidden=!insertion;
    $('promote').disabled=$('delete-branch').disabled=blocked||!variation;$('mainline').disabled=!!insertion;
    $('route-info').textContent=insertion?'挿入中：'+(frames[index].move-insertion.startMove)+'手。終了すると元の続きがつながります。':variation?'変化を表示中。削除の対象は、直近の分岐から先の変化全体です。':'本譜を表示中。本譜は「この変化を削除」では削除されません。';
    ['tool','label-text','turn','comment-edit','apply-comment','apply-info'].forEach(id=>$(id).disabled=blocked);allElements('[data-prop]').forEach(input=>input.disabled=blocked);
    for(const id of ['view','new','size','open','import-text','save','export-text','branch','slider','jump','jump-go'])$(id).disabled=!!insertion||(id==='slider'&&route.length===1);
    if(insertion)for(const id of ['first','back10','back','next','next10','last'])$(id).disabled=true;
    for(const id of ['save-main','save-clean','save-image','print','gif-create','load-text-choice','score','recovery-save','recovery-restore'])if($(id))$(id).disabled=!!insertion;if($('handicap'))$('handicap').disabled=!!insertion;allElements('[data-editor]').forEach(button=>button.disabled=blocked);allElements('[data-tool]').forEach(button=>button.disabled=blocked);syncEditors();const hasRecord=GoExport.hasRecord(root),hasMain=GoExport.hasRecord(root,true);$('save').disabled=!!insertion||!hasRecord;for(const id of ['save-main','save-clean'])if($(id))$(id).disabled=!!insertion||!hasMain;
  }
  function resetHistory(){undoStack=[];redoStack=[];insertion=null;tool='play';$('tool').value='play';serial=1;commentTarget=null;infoTarget=null;canvas.style.touchAction='pan-y';$('tools').querySelector('summary').textContent='ツール';$('tools').open=false;$('label-row').hidden=true;allElements('[data-tool]').forEach(button=>button.classList.remove('selected'));}
  function history(back){if(!editing||insertion||!canLeave())return;const from=back?undoStack:redoStack,to=back?redoStack:undoStack;if(!from.length)return;to.push(snapshot());const saved=from.pop();restore(saved);dirty=true;trimHistory();report(back?'編集を取り消しました。':'編集をやり直しました。');}
  function startOrFinishInsert(){
    if(!editing||!canLeave())return;
    if(!insertion){const before=snapshot(),base=route[index];insertion={before,base,children:base.children.slice(),startMove:frames[index].move,choice:choices.get(base)||0};base.children=[];choices.delete(base);tool='play';$('tool').value='play';dirty=true;rebuild();refresh();report('挿入する石を順に打ち、最後に「終了する」を押してください。');return;}
    const session=insertion,count=frames[index].move-session.startMove;
    if(!count){insertion=null;restore(session.before);report('挿入せず元の棋譜に戻しました。');return;}
    if(count%2&&session.children.length&&!confirm('奇数手を挿入するため、元の続きと同じ色が連続する場合があります。よろしいですか？'))return;
    const tail=route[index];tail.children=session.children;
    let pending;
    try{pending=prepareContinuation(session.children,frames[index]);S.parse(S.write(root));}catch(error){tail.children=[];report('元の続きのデータを読み取れません：'+error.message,true);return;}
    pending.forEach(node=>{node.props.XIGPENDING=['1'];});
    choices.set(tail,session.choice);insertion=null;remember(session.before);rebuild();refresh();report(count+'手を挿入しました。'+(pending.length?'後の'+pending.length+'局面に確認が必要な着手があります。その手に進むと選択できます。':'元の続きにつなぎました。'));
  }

  function mainline(){if(insertion||!canLeave())return;const move=frames[index].move;choices=new WeakMap();index=0;rebuild();let target=frames.findIndex(state=>state.move>=move);if(target<0)target=frames.length-1;at(target);}
  function promote(){if(!activeVariation()||!canLeave())return;transaction(()=>{const path=route.slice();for(let i=0;i<path.length;i++){const parent=path[i],selected=choices.get(parent)||0;if(selected>0){const child=parent.children.splice(selected,1)[0];parent.children.unshift(child);choices.set(parent,0);}}},'選択した変化を本譜にしました。元の本譜は変化として残っています。');}
  function deleteBranch(){const branch=activeVariation();if(!branch||!canLeave())return;let count=0,stack=[branch.parent.children[branch.choice]];while(stack.length){const node=stack.pop();count++;stack.push(...node.children);}if(!confirm('この変化とその先の分岐（'+count+'局面）を削除しますか？'))return;transaction(()=>{branch.parent.children.splice(branch.choice,1);choices.set(branch.parent,0);index=Math.min(index,branch.depth);},'変化を削除しました。取り消しで元に戻せます。');}
  const markerKeys=['TR','SQ','CR','MA','LB','DD'];
  function removeAt(props,point,keys){if(keys.includes('LB')&&props.XIGTEXT){props.XIGTEXT=props.XIGTEXT.filter(value=>value!==R.encode(point,size));if(!props.XIGTEXT.length)delete props.XIGTEXT;}for(const key of keys){if(!props[key])continue;if(key==='LB')props[key]=props[key].filter(value=>value.split(':')[0]!==R.encode(point,size));else props[key]=R.expanded(props[key],size).filter(p=>p!==point).map(p=>R.encode(p,size));if(!props[key].length)delete props[key];}}
  function markupMap(){const map=new Map(),props=route[index].props;for(const key of markerKeys){for(const value of props[key]||[]){try{if(key==='LB'){const split=value.indexOf(':');if(split<0)continue;const point=R.coordinate(value.slice(0,split),size);if(!map.has(point))map.set(point,[]);map.get(point).push({key,text:value.slice(split+1),free:(props.XIGTEXT||[]).includes(value.slice(0,split))});}else for(const point of R.expanded([value],size)){if(!map.has(point))map.set(point,[]);map.get(point).push({key});}}catch(error){/* Preserve unsupported incoming markup in SGF, without executing it. */}}}return map;}
  function drawMarkup(c,g,marks,state){const {gap,start}=g;for(const [point,items] of marks){const {x,y}=displayXY(point,g),r=gap*.28;for(const item of items){c.save();c.strokeStyle=state.board[point]===R.BLACK?'#fff3bf':'#7c251b';c.fillStyle=c.strokeStyle;c.lineWidth=Math.max(1.4,gap*.055);c.beginPath();switch(item.key){case 'DD':c.fillStyle='#12697055';c.fillRect(x-gap*.46,y-gap*.46,gap*.92,gap*.92);c.strokeStyle='#12697088';for(let offset=-gap*.4;offset<gap*.5;offset+=gap*.2){c.beginPath();c.moveTo(x+offset,y-gap*.42);c.lineTo(x+offset,y+gap*.42);c.stroke();}break;case 'CR':c.arc(x,y,r,0,Math.PI*2);c.stroke();break;case 'SQ':c.strokeRect(x-r,y-r,r*2,r*2);break;case 'TR':c.moveTo(x,y-r*1.2);c.lineTo(x+r,y+r*.75);c.lineTo(x-r,y+r*.75);c.closePath();c.stroke();break;case 'MA':c.moveTo(x-r,y-r);c.lineTo(x+r,y+r);c.moveTo(x+r,y-r);c.lineTo(x-r,y+r);c.stroke();break;case 'LB':{const text=item.text;let font=item.free?10*g.extent/(canvas.clientWidth||g.extent):gap*.52;c.font='600 '+font+'px system-ui,sans-serif';if(!item.free){const m=c.measureText(text);font*=gap*.56/Math.max(1,m.actualBoundingBoxAscent+m.actualBoundingBoxDescent);c.font='600 '+font+'px system-ui,sans-serif';}let width=c.measureText(text).width;if(!item.free&&width>gap*.84){font*=gap*.84/width;c.font='600 '+font+'px system-ui,sans-serif';width=c.measureText(text).width;}if(!state.board[point]){c.fillStyle='#ebc365';c.fillRect(x-width/2-1,y-font*.6,width+2,font*1.2);}c.fillStyle=item.free?'blue':state.board[point]===R.BLACK?'#fff3bf':'#7c251b';c.fillText(text,x,y);break;}}c.restore();}}}
  function annotate(point){if(!editing||insertion||!canLeave())return;transaction(()=>{
    let current=route[index],props=current.props;const coordinate=R.encode(point,size);
    if(['AB','AW','AE'].includes(tool)){
      // SGF forbids setup properties and a move in the same node. Insert a setup-only node.
      if(props.B||props.W){const setup=S.node();setup.children=current.children;current.children=[setup];const preferred=choices.get(current)||0;choices.set(current,0);choices.set(setup,preferred);current=setup;props=setup.props;index++;}
      removeAt(props,point,['AB','AW','AE']);
      (props[tool]??=[]).push(coordinate);
    }else if(tool==='clear'){removeAt(props,point,markerKeys);removeAt(props,point,['AB','AW']);}
    else if(['upper','lower','number','label'].includes(tool)){
      const text=tool==='label'?$('label-text').value:tool==='number'?String(serial):String.fromCharCode((tool==='upper'?65:97)+(serial-1)%26);
      if(!text)throw Error('配置する文字を入力してください。');removeAt(props,point,markerKeys);(props.LB??=[]).push(coordinate+':'+text);if(tool==='label')(props.XIGTEXT??=[]).push(coordinate);if(tool!=='label')serial++;
    }else {const existed=R.expanded(props[tool]||[],size).includes(point);removeAt(props,point,markerKeys);if(!existed)(props[tool]??=[]).push(coordinate);}
  },'盤上の編集を反映しました。',true);}
  $('delete-move').onclick=()=>{if(!editing||insertion||index===0||!canLeave())return;if(!confirm('表示中の局面と、その先の手順・分岐を削除しますか？'))return;transaction(()=>{const parent=route[index-1],child=route[index];parent.children.splice(parent.children.indexOf(child),1);choices.set(parent,0);index--;},'表示中の局面とその先を削除しました。取り消しで元に戻せます。');};
  $('undo').onclick=()=>history(true);$('redo').onclick=()=>history(false);$('insert').onclick=startOrFinishInsert;
  $('cancel-insert').onclick=()=>{if(insertion&&confirm('今回の挿入をすべて中止しますか？')){const before=insertion.before;insertion=null;restore(before);report('挿入を中止しました。');}};
  $('mainline').onclick=mainline;$('promote').onclick=promote;$('delete-branch').onclick=deleteBranch;
  $('tool').onchange=()=>{tool=$('tool').value;canvas.style.touchAction=['AB','AW','TR','SQ','CR','MA','DD','clear'].includes(tool)?'none':'pan-y';serial=1;$('label-row').hidden=tool!=='label';report(tool==='play'?'通常の着手に戻りました。':'盤上の交点を押して編集してください。');};
  $('turn').onclick=()=>{if(!canLeave())return;transaction(()=>{route[index].props.PL=[frames[index].turn===R.BLACK?'W':'B'];},'次の手番を切り替えました。',true);};
  $('apply-comment').onclick=()=>{const value=$('comment-edit').value;transaction(()=>{if(value)route[index].props.C=[value];else delete route[index].props.C;},'コメントを反映しました。');};
  $('apply-info').onclick=()=>{if(!$('info-edit').querySelector('input[data-prop=KM]').checkValidity()){report('コミを0.5刻みの数値で入力してください。',true);return;}transaction(()=>{allElements('[data-prop]').forEach(input=>{if(input.value)root.props[input.dataset.prop]=[input.value];else delete root.props[input.dataset.prop];});},'対局情報を反映しました。');};

  function displayPoint(point,turns=boardRotation){let x=point%size,y=Math.floor(point/size);for(let n=0;n<(turns+4)%4;n++){[x,y]=[size-1-y,x];}return y*size+x;}
  function originalPoint(point){return displayPoint(point,4-boardRotation);}
  function displayXY(point,g=geometry()){const p=displayPoint(point);return {x:g.start+p%size*g.gap,y:g.start+Math.floor(p/size)*g.gap};}
  function rotateBoard(turns){boardRotation=(boardRotation+turns+4)%4;analysisPreview=null;draw();invalidateGif();window.dispatchEvent(new Event('kifu-board-view'));}
  function geometry() {
    const extent = size <= 9 ? 390 : size <= 13 ? 430 : 460;
    const gap = (extent - 72) / size, start = 36 + gap / 2;
    return {extent, gap, start, wood: 36, span: extent - 72};
  }
  function starPoints(n) {
    // Display coordinates: skip I, and count rows upward from the bottom.
    const specified={
      9:['E5'],10:['D7','G7','D4','G4'],
      11:['D8','D4','H8','H4'],12:['D9','J9','D4','J4'],
      13:['D10','D4','K10','K4','G7'],14:['D11','D4','L11','L4'],
      16:['D13','D4','N13','N4'],18:['D15','D4','P15','P4']
    };
    if(specified[n])return specified[n].map(value=>['ABCDEFGHJKLMNOPQRST'.indexOf(value[0]),n-Number(value.slice(1))]);
    if ([5,7].includes(n)) return [[(n-1)/2,(n-1)/2]];
    if (![15,17,19].includes(n)) return [];
    const inset=3,far=n-1-inset,middle=(n-1)/2;
    if ([17,19].includes(n)) return [inset,middle,far].flatMap(y=>[inset,middle,far].map(x=>[x,y]));
    return [[inset,inset],[far,inset],[middle,middle],[inset,far],[far,far]];
  }
  function draw(usePreview=true) {
    const pv=usePreview?analysisPreview:null;
    const state = pv?pv.state:scoreSession?.result?{...frames[index],board:scoreSession.result.board}:frames[index], {extent, gap, start, wood, span} = geometry();
    const width = canvas.clientWidth || extent, ratio = Math.max(1, window.devicePixelRatio || 1);
    canvas.width = Math.round(width * ratio); canvas.height = canvas.width;
    context.setTransform(canvas.width / extent, 0, 0, canvas.height / extent, 0, 0);
    const marks=pv?new Map():markupMap();const c = context; c.clearRect(0,0,extent,extent);
    c.fillStyle = 'silver'; c.fillRect(0,0,extent,extent); c.strokeStyle = '#1d2926'; c.lineWidth = 1.5; c.strokeRect(.75,.75,extent-1.5,extent-1.5);
    c.fillStyle = '#ebc365'; c.fillRect(wood,wood,span,span);
    c.strokeStyle = '#564424'; c.lineWidth = .85; c.beginPath();
    for (let n=0;n<size;n++) { const pos=start+n*gap; c.moveTo(start,pos); c.lineTo(start+(size-1)*gap,pos); c.moveTo(pos,start); c.lineTo(pos,start+(size-1)*gap); } c.stroke();
    c.fillStyle='#4a3a21'; for (const [x,y] of starPoints(size)) { c.beginPath(); c.arc(start+x*gap,start+y*gap,Math.max(2,gap*.08),0,Math.PI*2); c.fill(); }
    c.fillStyle='#24332e'; c.textAlign='center'; c.textBaseline='middle'; c.font=Math.min(16,Math.max(11,gap*.43))+'px system-ui,sans-serif';
    const letters='ABCDEFGHJKLMNOPQRST';
    for(let n=0;n<size;n++) { const pos=start+n*gap,top=originalPoint(n),left=originalPoint(n*size);const a=boardRotation%2?String(size-Math.floor(top/size)):letters[top%size],b=boardRotation%2?letters[left%size]:String(size-Math.floor(left/size));c.fillText(a,pos,19);c.fillText(a,pos,extent-19);c.fillText(b,19,pos);c.fillText(b,extent-19,pos); }
    state.board.forEach((color,point)=>{
      if(!color)return;
      const {x,y}=displayXY(point),r=gap*.46;
      const gradient=c.createRadialGradient(x-r*.35,y-r*.4,r*.08,x,y,r);
      if(color===R.BLACK){gradient.addColorStop(0,'#555b5c');gradient.addColorStop(1,'#111415');}
      else{gradient.addColorStop(0,'#ffffff');gradient.addColorStop(1,'#dce2df');}
      c.fillStyle=gradient;c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fill();c.strokeStyle=color===R.BLACK?'#0a1111':'#87958f';c.lineWidth=.7;c.stroke();
      const pvLabel=pv?.labels.get(point),label=pv?pvLabel:numberFrames[index][point],latest=state.last?.point===point;
      if((pvLabel||numbers)&&label&&(pvLabel||!$('recent').checked||label>state.move-5)&&!marks.has(point)){
        const text=String(label);let font=r*1.12;c.font='600 '+font+'px Arial,sans-serif';
        const actual=c.measureText(text).width;if(actual>r*1.55)font*=r*1.55/actual;
        c.font='600 '+font+'px Arial,sans-serif';c.fillStyle=latest?(color===R.BLACK?'#ff9e89':'#b12212'):(color===R.BLACK?'#fff':'#192824');c.fillText(text,x,y+.4);
      }else if(latest&&!marks.has(point)){c.strokeStyle=color===R.BLACK?'#ff9980':'#b5261a';c.lineWidth=Math.max(1.5,gap*.07);c.beginPath();c.arc(x,y,r*.28,0,Math.PI*2);c.stroke();}
    });
    if(!scoreSession)drawMarkup(c,{gap,start,extent},marks,state);drawScore(c,{gap,start,extent});
    if(!pv&&!scoreSession&&route[index].children.length>1&&!insertion&&(tool==='play'||!editing)){for(const child of route[index].children){const value=child.props.B?.[0]??child.props.W?.[0];if(!value)continue;const point=R.coordinate(value,size,true);if(point===null||state.board[point]||marks.has(point))continue;const text=lineEntry(child).label,{x,y}=displayXY(point);c.save();const font=16*extent/(canvas.clientWidth||extent);c.font='700 '+font+'px Arial,sans-serif';const width=c.measureText(text).width;c.fillStyle='#ebc365';c.fillRect(x-width/2-1,y-font*.5,width+2,font);c.fillStyle='#06ad01';c.fillText(text,x,y);c.restore();}}

    if(keyboardBoard){const {x,y}=displayXY(focusPoint);c.strokeStyle='#006675';c.lineWidth=2;c.strokeRect(x-gap*.45,y-gap*.45,gap*.9,gap*.9);}
  }
  let lastRenderedRecord=null;
  function refresh() {
    const currentRecord=S.write(root);if(lastRenderedRecord!==null&&currentRecord!==lastRenderedRecord)$('sgf').value='';lastRenderedRecord=currentRecord;
    if($('gif-end')){const end=$('gif-end'),start=$('gif-start'),max=frames.at(-1).move,previous=Number(end.dataset.limit||0);if(!end.dataset.limit||Number(end.value)===previous||Number(end.value)>max)end.value=String(max);if(Number(start.value)>max)start.value='0';end.max=start.max=String(max);end.dataset.limit=String(max);}

    analysisPreview=null;
    document.body.classList.toggle('editing-mode',editing);queueMicrotask(()=>window.dispatchEvent(new Event('kifu-position-change')));
    syncAuto();invalidateGif();
    const state=frames[index], max=frames.at(-1).move;const title=read(root.props,'GN')||(originalName!=='kifu.sgf'?originalName.replace(/\.sgf$/i,''):'新しい碁盤');firstElement('h1').textContent=title;firstElement('h1').title=title;if(read(root.props,'XIGIMAGE')==='1'||title==='画像から取り込んだ局面'){const note=document.createElement('span');note.className='image-position-note';note.textContent='着手順・コウ履歴は不明です。';if(read(root.props,'XIGPARTIAL')==='1')note.title='画像の範囲外は未確認です。';firstElement('h1').append(note);}
    $('view').setAttribute('aria-pressed',String(!editing));$('edit').setAttribute('aria-pressed',String(editing));$('pass').disabled=!editing;$('pass').hidden=false;$('delete-move').hidden=false;$('delete-move').disabled=!editing||!!insertion||index===0;
    $('numbers').setAttribute('aria-pressed',String(numbers));$('numbers').textContent=numbers?'手数無表示':'手数の表示';
    $('first').disabled=$('back').disabled=$('back10').disabled=index===0;
    $('last').disabled=$('next').disabled=$('next10').disabled=index===route.length-1;
    catalog();$('slider').max=String(gameMaxMove);$('slider').value=String(state.move);$('slider').disabled=route.length===1;
    $('slider').setAttribute('aria-valuetext',state.move+'手');$('jump').max=String(max);$('jump').value=state.move;
    $('move').textContent='手数'+state.move+'／'+max+'手';$('black-captures').textContent='アゲハマ '+state.captures[R.BLACK];$('white-captures').textContent='アゲハマ '+state.captures[R.WHITE];
    $('komi-input').value=String(currentKomi());$('komi-input').disabled=!!insertion||!!scoreSession;
    for(const [id,key,fallback] of [['black-name','PB','黒番'],['white-name','PW','白番']]){$(id).textContent=read(root.props,key,fallback);$(id).title=$(id).textContent;}
    $('black-turn').classList.toggle('active',state.turn===R.BLACK);$('white-turn').classList.toggle('active',state.turn===R.WHITE);
    const comment=read(route[index].props,'C').replace(/^画像から石の配置を取り込みました。着手順・アゲハマ・コウ履歴は不明です。(?:画像の範囲外は未確認です。)?$/, ''),commentBox=$('comment');commentBox.replaceChildren();
    if(index===0){const data=document.createElement('dl');data.className='root-info';for(const [key,label] of [['GN','対局名'],['PB','黒番'],['BR','棋力'],['PW','白番'],['WR','棋力'],['EV','大会'],['RO','回戦'],['DT','日付'],['PC','場所'],['RE','結果'],['GC','対局説明']]){const value=read(root.props,key);if(!value||(key==='GN'&&value==='画像から取り込んだ局面'))continue;const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=label;dd.textContent=value;data.append(dt,dd);}if(data.childNodes.length)commentBox.append(data);}
    if(comment){const text=document.createElement('p');text.textContent=comment;commentBox.append(text);}$('comment-area').hidden=!commentBox.childNodes.length;
    $('metadata').replaceChildren();for(const [key,label] of [['PB','黒番'],['PW','白番'],['GN','対局名'],['EV','大会'],['DT','日付'],['RE','結果'],['RU','ルール'],['GC','対局説明']]){if(!root.props[key])continue;const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=label;dd.textContent=read(root.props,key);$('metadata').append(dt,dd);}
    catalog();const current=route[index];$('branches').hidden=current.children.length<2;$('branch').replaceChildren();current.children.forEach((child,i)=>{const key=child.props.B?'B':child.props.W?'W':'';const v=key?read(child.props,key):'';$('branch').add(new Option((lineEntry(child).number?'変化'+lineEntry(child).lane:'本譜')+(key?'：'+(key==='B'?'黒':'白')+(v?lineEntry(child).label:' パス'):''),i));});$('branch').value=String(choices.get(current)||0);
    canvas.setAttribute('aria-label',size+'路、'+state.move+'手。'+(state.turn===R.BLACK?'黒':'白')+'番。'+(editing?'編集モード。矢印で交点を選びEnterで着手。':'閲覧モード。石を押すとその手へ移動。'));
    firstElement('.canvas-wrap').style.width=geometry().extent+'px';editRefresh();drawMoveStrip();draw();scheduleRecovery();
  }
  let resolving=false;
  function askConflict(text){return new Promise(resolve=>{const dialog=$('conflict');$('conflict-text').textContent=text;dialog.returnValue='cancel';dialog.addEventListener('close',()=>resolve(dialog.returnValue),{once:true});dialog.showModal();});}
  async function at(next){
    if(scoreSession||insertion||resolving||exportBusy||!canLeave())return;
    next=Math.max(0,Math.min(route.length-1,next));resolving=true;
    try{
      // Check every unresolved move on the route, including when jumping over it.
      for(let n=0;n<=next;n++)if(issues[n]){
        index=Math.max(0,n-1);refresh();
        const answer=await askConflict(frames[n].move+'手目：'+issues[n]+' そのまま打つ場合はルール違反を許容し、重複する交点では既存の石を後の手の色で置き換えます。不正な棋譜になることを了承して続けるか、この手と以降の手順を削除してください。');
        if(answer==='force'){const before=snapshot();route[n].props.XIGFORCE=['1'];delete route[n].props.XIGPENDING;remember(before);rebuild();}
        else if(answer==='cut'){
          if(!n){report('先頭局面は削除できません。',true);return;}
          const before=snapshot(),parent=route[n-1],child=route[n];parent.children.splice(parent.children.indexOf(child),1);choices.set(parent,0);index=n-1;remember(before);rebuild();refresh();report('対象の手と、その先の手順・分岐を削除しました。取り消しで戻せます。');return;
        }else{refresh();report('手順移動を中止しました。未確認の着手はそのまま残っています。');return;}
      }
      index=next;refresh();report(route[index].props.XIGFORCE?'利用者が承認した例外着手です。通常の囲碁のルールでは不正な局面を含みます。':frames[index].last?.point===null&&frames[index].last?'パスの局面です。':editing?'編集モードです。続きの着手を記録できます。':'閲覧モードです。棋譜は変更されません。');
    }finally{resolving=false;}
  }

  function byMoves(delta){const target=Math.max(0,frames[index].move+delta);let next=index;do{next+=Math.sign(delta);}while(next>0&&next<frames.length-1&&(delta>0?frames[next].move<target:frames[next].move>target));at(next);}
  let matchMutation=false;
  function place(point){
    if(!matchMutation&&window.KifuMatch?.locked){window.KifuMatch.humanMove(point);return;}
    if(scoreSession){scoreClick(point);return;}
    if(!editing){if(point!==null&&!frames[index].board[point]&&route[index].children.length>1){const child=route[index].children.find(child=>(child.props.B?.[0]??child.props.W?.[0])===R.encode(point,size));if(child){chooseLine(lineEntry(child),child);return;}}if(point!==null&&frames[index].board[point]){const move=numberFrames[index][point];if(move){const next=frames.findIndex(f=>f.move===move);at(next);}else report('初期配置の石です。着手番号はありません。');}else report('石を打つには「編集」に切り替えてください。');return;}
    if(point!==null&&tool!=='play'&&!insertion){annotate(point);return;}
    if(!canLeave())return;
    try{
      const saved=snapshot();const before=frames[index],next=R.play(before,point),current=route[index],key=before.turn===R.BLACK?'B':'W',value=R.encode(point,size);
      let chosen=current.children.findIndex(child=>child.props[key]?.[0]===value);
      if(chosen<0){let total=0;visitTree(()=>total++);if(total>=S.LIMIT||saved.sgf.length>2*1024*1024-40)throw Error('編集できる棋譜の上限に達しました。');const child=S.node({[key]:[value]});current.children.push(child);chosen=current.children.length-1;dirty=true;}
      choices.set(current,chosen);index++;rebuild();if(!insertion&&S.write(root)!==saved.sgf)remember(saved);refresh();report(point===null?'パスを記録しました。':next.move+'手目を記録しました。'+(chosen>0?' 元の続きは本譜として残っています。':''));
    }catch(error){report(error.message,true);}
  }
  function okayToReplace(){if(insertion||!canLeave())return false;return !dirty||confirm('保存していない変更があります。現在の棋譜を置き換えますか？');}
  function load(text,name='kifu.sgf'){
    if(window.KifuMatch?.locked){report('対局を中断してから棋譜を開いてください。',true);return false;}
    try{const game=GoImport.parse(text,name);validate(game.root,game.size);if(!okayToReplace())return false;
      clearTimeout(recoveryTimer);root=game.root;size=game.size;choices=new WeakMap();index=0;dirty=false;editing=false;focusPoint=0;originalName=name.replace(/\.(?:sgf|ngf|ugf|ugi|gib|mgt)$/i,'')+'.sgf';
      $('sgf').value='';$('size').value=String(size);resetHistory();rebuild();index=route.length-1;window.dispatchEvent(new Event('kifu-record-replaced'));refresh();$('load-menu').open=false;$('load-options').hidden=true;dragStatus('');report('SGFを読み込みました。閲覧モードで最終手の局面を表示しています。');return true;
    }catch(error){report('読込みできませんでした：'+error.message,true);return false;}
  }
  function serialized(){const old=root.props.CA,oldKomi=root.props.KM;root.props.CA=['UTF-8'];root.props.KM=[String(currentKomi())];try{return S.write(root);}finally{if(old)root.props.CA=old;else delete root.props.CA;if(oldKomi)root.props.KM=oldKomi;else delete root.props.KM;}}
  $('new').onclick=()=>{if(!okayToReplace())return;$('sgf').value='';size=Number($('size').value);root=S.create(size);choices=new WeakMap();index=0;editing=true;dirty=false;focusPoint=0;originalName='kifu.sgf';resetHistory();rebuild();window.dispatchEvent(new Event('kifu-record-replaced'));refresh();report(size+'路の新しい碁盤です。編集モードで石を打てます。');};
  $('view').onclick=()=>{if(insertion||!canLeave())return;editing=false;refresh();report('閲覧モードです。棋譜は変更されません。');};$('edit').onclick=()=>{if(scoreSession||exportBusy)return;editing=true;refresh();report('編集モードです。途中から別の手を打つと変化として記録します。');};
  $('numbers').onclick=()=>{numbers=!numbers;refresh();};$('recent').onchange=()=>{if($('recent').checked)numbers=true;refresh();};$('pass').onclick=()=>place(null);
  $('first').onclick=()=>at(0);$('last').onclick=()=>at(route.length-1);$('back').onclick=()=>byMoves(-1);$('next').onclick=()=>byMoves(1);$('back10').onclick=()=>byMoves(-10);$('next10').onclick=()=>byMoves(10);
  $('slider').oninput=()=>{const move=Math.min(Number($('slider').value),frames.at(-1).move);let next=frames.findIndex(frame=>frame.move>=move);at(next<0?route.length-1:next);};
  function jump(){const n=Number($('jump').value);if($('jump').value===''||!Number.isInteger(n)||n<0||n>frames.at(-1).move){report('移動先は0～'+frames.at(-1).move+'の整数で入力してください。',true);return;}const i=frames.findIndex(f=>f.move>=n);at(Math.max(0,i));}
  $('jump-go').onclick=jump;$('jump').onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();jump();}};
  $('branch').onchange=()=>{if(insertion||!canLeave()){refresh();return;}choices.set(route[index],Number($('branch').value));rebuild();refresh();report('この局面からの手順を切り替えました。「1手進む」で表示します。');};
  canvas.addEventListener('click',e=>{if(suppressClick){suppressClick=false;return;}const rect=canvas.getBoundingClientRect(),g=geometry(),x=(e.clientX-rect.left)*g.extent/rect.width,y=(e.clientY-rect.top)*g.extent/rect.height,ix=Math.round((x-g.start)/g.gap),iy=Math.round((y-g.start)/g.gap);if(ix<0||ix>=size||iy<0||iy>=size||Math.hypot(x-g.start-ix*g.gap,y-g.start-iy*g.gap)>g.gap*.6)return;keyboardBoard=false;focusPoint=originalPoint(iy*size+ix);place(focusPoint);});
  canvas.addEventListener('keydown',e=>{if(!e.ctrlKey&&!e.metaKey&&!e.altKey&&!e.shiftKey&&['ArrowDown','ArrowUp'].includes(e.key)){e.preventDefault();e.stopPropagation();if(!document.querySelector('dialog[open]')&&!scoreSession)byMoves(e.key==='ArrowDown'?1:-1);return;}let shown=displayPoint(focusPoint),x=shown%size,y=Math.floor(shown/size);if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();keyboardBoard=true;x+=e.key==='ArrowLeft'?-1:e.key==='ArrowRight'?1:0;y+=e.key==='ArrowUp'?-1:e.key==='ArrowDown'?1:0;focusPoint=originalPoint(Math.max(0,Math.min(size-1,y))*size+Math.max(0,Math.min(size-1,x)));draw();}else if(e.key==='Enter'||e.key===' '){e.preventDefault();place(focusPoint);}});
  canvas.addEventListener('blur',()=>{keyboardBoard=false;draw();});
  document.addEventListener('keydown',e=>{if(e.defaultPrevented||scoreSession||document.querySelector('dialog[open]')||e.target.isContentEditable||e.target===canvas||/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)||e.ctrlKey||e.metaKey||e.altKey)return;if(['ArrowRight','ArrowLeft','ArrowDown','ArrowUp'].includes(e.key)){e.preventDefault();byMoves((['ArrowRight','ArrowDown'].includes(e.key)?1:-1)*(['ArrowLeft','ArrowRight'].includes(e.key)&&e.shiftKey?10:1));}});
  $('open').onclick=()=>{$('file').value='';$('file').click();};
  async function importFile(file){
    if(!file)return false;
    try{if(!/\.(sgf|ngf|ugf|ugi|gib|mgt)$/i.test(file.name))throw Error('対応形式はSGF・NGF・UGF・UGI・GIB・MGTです');if(file.size>2*1024*1024)throw Error('棋譜ファイルは2MB以内にしてください');const bytes=new Uint8Array(await file.arrayBuffer());return load(GoImport.decode(bytes,file.name,$('encoding').value),file.name);}catch(error){report('読込みできません：'+error.message,true);return false;}
  }
  function pasteRecord(text){if(new TextEncoder().encode(text).length>2*1024*1024){report('棋譜は2MB以内にしてください',true);return false;}return load(text,'貼り付けた棋譜.sgf');}
  $('file').onchange=async()=>{try{await importFile($('file').files[0]);}finally{$('file').value='';}};
  const dropZone=firstElement('.canvas-wrap');
  let dropTicket=0,pendingDrop=null;
  const dropStatus=document.createElement('p');dropStatus.id='drop-status';dropStatus.hidden=true;dropStatus.setAttribute('role','status');dropZone.before(dropStatus);
  function dragStatus(text){dropStatus.textContent=text;dropStatus.hidden=!text;}
  let lastWheelMove=-Infinity;
  document.querySelector('.canvas-wrap').addEventListener('wheel',e=>{if(e.ctrlKey||e.metaKey||e.altKey||e.shiftKey||!e.deltaY||Math.abs(e.deltaX)>Math.abs(e.deltaY)||document.querySelector('dialog[open]')||scoreSession||insertion)return;e.preventDefault();if(performance.now()-lastWheelMove<100)return;lastWheelMove=performance.now();stopAuto();byMoves(e.deltaY>0?1:-1);},{passive:false});
  function nativeDrag(phase){dropZone.classList.toggle('file-dragover',phase==='enter');if(phase==='enter')dragStatus('棋譜ファイルをここへドロップしてください');if(phase==='leave')dragStatus('');if(phase==='drop')dragStatus('ファイルを受け取りました。読み込んでいます…');}

  const dropNotice=document.createElement('div');dropNotice.className='pending-drop';dropNotice.hidden=true;
  const dropName=document.createElement('span'),dropLoad=document.createElement('button'),dropCancel=document.createElement('button');
  dropName.setAttribute('role','status');dropLoad.textContent='受け取った棋譜を読込み';dropCancel.textContent='中止';dropNotice.append(dropName,dropLoad,dropCancel);dropZone.after(dropNotice);
  dropLoad.onclick=async()=>{const file=pendingDrop;pendingDrop=null;dropNotice.hidden=true;if(file){const loaded=await importFile(file);dragStatus(loaded?'':'読込みを中止したか、棋譜の形式が正しくありません。');}};
  dropCancel.onclick=()=>{dropTicket++;pendingDrop=null;dropNotice.hidden=true;dragStatus('読込みを中止しました。');};

  dropZone.removeAttribute('title');
  document.addEventListener('dragover',e=>{if([...e.dataTransfer.types].includes('Files'))e.preventDefault();});
  document.addEventListener('drop',e=>{if(e.dataTransfer.files.length)e.preventDefault();dropZone.classList.remove('file-dragover');});
  dropZone.addEventListener('dragover',e=>{if([...e.dataTransfer.types].includes('Files')){e.preventDefault();e.dataTransfer.dropEffect='copy';dropZone.classList.add('file-dragover');}});
  dropZone.addEventListener('dragleave',e=>{if(!dropZone.contains(e.relatedTarget))dropZone.classList.remove('file-dragover');});
  dropZone.addEventListener('drop',async e=>{e.preventDefault();if(e.dataTransfer.files.length!==1){report('棋譜ファイルは１つずつ読み込んでください',true);return;}await importFile(e.dataTransfer.files[0]);});
  canvas.addEventListener('paste',e=>{const text=e.clipboardData?.getData('text/plain');if(text){e.preventDefault();pasteRecord(text);}});
  $('import-text').onclick=()=>load($('sgf').value);$('export-text').onclick=()=>{if(insertion||!canLeave())return;$('sgf').value=exportSgf();report('現在の棋譜をSGFテキスト欄へ書き出しました。');};
  function download(content){
    const blob=new Blob([content],{type:'application/x-go-sgf;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');
    a.href=url;a.download=originalName;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
    report('SGFをダウンロードしました。保存先はブラウザーの設定に従います。');
  }
  function exportSgf(){return S.write(GoExport.rotated(S.parse(serialized()).root,size,boardRotation));}
  $('save').onclick=async()=>{
    if(insertion||!canLeave())return;if(!GoExport.hasRecord(root)){report('保存する棋譜がありません。');return;}const content=exportSgf();let handle;if(window.__TAURI_INTERNALS__?.invoke){try{if(await GoExport.save(new Blob([content],{type:'application/x-go-sgf'}),originalName)){dirty=false;report('SGFファイルを保存しました。');}}catch(e){report('保存できません：'+e.message,true);}return;}
    if(window.showSaveFilePicker){
      try{handle=await window.showSaveFilePicker({suggestedName:originalName,types:[{description:'SGF棋譜',accept:{'application/x-go-sgf':['.sgf']}}]});}
      catch(error){if(error.name==='AbortError')return;if(!['SecurityError','NotAllowedError','TypeError'].includes(error.name)){report('保存先を開けませんでした：'+error.message,true);return;}}
    }
    if(!handle){download(content);window.dispatchEvent(new Event('kifu-record-saved'));return;}
    try{const stream=await handle.createWritable();await stream.write(content);await stream.close();dirty=false;window.dispatchEvent(new Event('kifu-record-saved'));report('SGFファイルを保存しました。');}
    catch(error){report('保存できませんでした：'+error.message,true);}
  };
  window.addEventListener('beforeunload',e=>{if(dirty||hasCommentDraft()||hasInfoDraft()){e.preventDefault();e.returnValue='';}});
  let gameMaxMove=0;let branchCatalog=[],parentIndex=new WeakMap(),branchIndex=new WeakMap();
  function letter(n){let text='';do{text=String.fromCharCode(65+n%26)+text;n=Math.floor(n/26)-1;}while(n>=0);return text;}
  function catalog(){
    gameMaxMove=0;branchCatalog=[{anchor:root,label:'A',number:0,lane:0}];parentIndex=new WeakMap();branchIndex=new WeakMap();
    const candidates=[],stack=[{node:root,move:0}];let order=0;
    while(stack.length){const item=stack.pop(),node=item.node,move=item.move+((node.props.B||node.props.W)?1:0);gameMaxMove=Math.max(gameMaxMove,move);
      for(let i=node.children.length-1;i>=0;i--){const child=node.children[i];parentIndex.set(child,node);stack.push({node:child,move});}
      if(node!==root&&parentIndex.get(node).children[0]!==node)candidates.push({anchor:node,move,order:order++});
    }
    const laneEnds=[Infinity];
    candidates.sort((a,b)=>a.move-b.move||a.order-b.order);
    for(const candidate of candidates){const entry={anchor:candidate.anchor,label:letter(branchCatalog.length),number:branchCatalog.length};entry.start=candidate.move;let end=entry.start,next=entry.anchor.children[0];while(next){if(next.props.B||next.props.W)end++;next=next.children[0];}const parentLane=lineEntry(parentIndex.get(entry.anchor)).lane||0;let lane=parentLane+1;while(laneEnds[lane]>=entry.start)lane++;entry.lane=lane;laneEnds[lane]=end;branchCatalog.push(entry);branchIndex.set(entry.anchor,entry);}

  }
  function lineEntry(node){while(node&&node!==root){if(branchIndex.has(node))return branchIndex.get(node);node=parentIndex.get(node);}return branchCatalog[0];}
  function linePath(entry){const path=[];let node=entry.anchor;while(node){path.push(node);node=parentIndex.get(node);}path.reverse();node=entry.anchor.children[0];while(node){path.push(node);node=node.children[0];}return path;}
  function chooseLine(entry,target){if(scoreSession||insertion||resolving||exportBusy||!canLeave())return;const desiredMove=frames[index].move,path=linePath(entry);choices=new WeakMap();for(let n=0;n<path.length-1;n++)choices.set(path[n],path[n].children.indexOf(path[n+1]));index=0;rebuild();let next=target?route.indexOf(target):frames.findIndex(frame=>frame.move>=desiredMove);if(next<0)next=route.length-1;at(next);}
  function drawMoveStrip(){
    const host=$('move-strip');if(!host)return;catalog();host.replaceChildren();$('tree-block').hidden=route.length<=1;
    const selected=lineEntry(route.at(-1));$('route-info').textContent=insertion?'挿入中：終了すると元の続きにつながります。':selected.label+(selected.number?'：変化'+selected.lane:'：本譜')+'を表示中';
    const picker=$('line-picker');if(picker){picker.replaceChildren();for(const entry of branchCatalog)picker.add(new Option((entry.number?'変化'+entry.lane+'（'+entry.start+'手〜）':'本譜'),entry.number));picker.value=String(selected.number);picker.disabled=!!insertion;}
    const entries=branchCatalog.filter(entry=>entry.lane<=10||entry.lane===selected.lane);const lanes=[...new Set(entries.map(entry=>entry.lane))].sort((a,b)=>a-b);
    const paths=entries.map(linePath),rowOf=new Map(entries.map(entry=>[entry,lanes.indexOf(entry.lane)])),step=40,labelWidth=0,rowHeight=46;
    const width=labelWidth+Math.max(...paths.map(path=>path.length))*step+6;
    const labels=document.createElement('div');labels.className='variation-labels';const viewport=document.createElement('div');viewport.className='variation-viewport';host.append(labels,viewport);const graph=document.createElement('div');graph.className='variation-graph';graph.style.width=width+'px';graph.style.minWidth='100%';viewport.append(graph);
    const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.classList.add('branch-lines');svg.setAttribute('width',width);svg.setAttribute('height',lanes.length*rowHeight);graph.append(svg);
    const strips=new Map();
    for(const lane of lanes){const group=entries.filter(entry=>entry.lane===lane),row=document.createElement('div');row.className='variation-row';row.classList.toggle('active-line',selected.lane===lane);
      const title=document.createElement('button');title.className='line-title';title.textContent=lane?'変化'+lane:'本譜';title.title=lane?'クリックするたびに、この行の次の分岐へ移動します':'本譜へ戻ります';title.disabled=!!insertion;title.onclick=()=>{if(!lane){mainline();return;}const entry=group.find(entry=>entry.start>frames[index].move)||group[0];chooseLine(entry,entry.anchor);};const labelRow=document.createElement('div');labelRow.className='variation-label-row';labelRow.classList.toggle('active-line',selected.lane===lane);labelRow.append(title);labels.append(labelRow);
      const strip=document.createElement('div');strip.className='line-moves';row.append(strip);graph.append(row);strips.set(lane,strip);
    }
    entries.forEach((entry,n)=>{const r=rowOf.get(entry),strip=strips.get(entry.lane),path=paths[n],anchor=entry.number?path.indexOf(entry.anchor):0;let move=0;const records=path.map((node,column)=>({node,column,move:move+=(node.props.B||node.props.W)?1:0}));
      const center=path.indexOf(route[index]),start=Math.max(anchor,center-80),visible=records.slice(start,start+200);
      for(const record of visible){const button=document.createElement('button');button.type='button';button.textContent=String(record.move);button.title=(entry.number?'変化'+entry.lane:'本譜')+' '+record.move+'手の局面へ移動します';button.className='move-chip';button.style.left=record.column*step+'px';button.classList.toggle('white',!!record.node.props.W);button.classList.toggle('current',record.node===route[index]);button.disabled=!!insertion;button.onclick=()=>chooseLine(entry,record.node);strip.append(button);}
      if(entry.number){const parent=parentIndex.get(entry.anchor),parentEntry=lineEntry(parent),parentRow=rowOf.get(parentEntry);const x=labelWidth+(anchor-1)*step+12,y=r*rowHeight+23,toX=x+step;
        const line=document.createElementNS(svg.namespaceURI,'path');line.setAttribute('d',parentRow===undefined?'M '+(x+18)+' '+(y-16)+' V '+y+' H '+toX:'M '+x+' '+(parentRow*rowHeight+23)+' H '+(x+18)+' V '+y+' H '+toX);svg.append(line);

      }
    });
    const current=graph.querySelector('.current');if(current)viewport.scrollLeft=Math.max(0,parseFloat(current.style.left)-viewport.clientWidth/2);
  }

  function arrangeLayout(){
    $('captures').innerHTML='<span id="black-captures" title="黒のアゲハマ"></span><span id="white-captures" title="白のアゲハマ"></span>';$('captures').setAttribute('aria-label','アゲハマ');
    const controls=firstElement('.controls'),actions=firstElement('.actions'),panel=firstElement('.edit-panel'),files=firstElement('.files-panel');
    const row=document.createElement('div');row.className='edit-action-row';row.append($('turn'),$('pass'),$('delete-move'));actions.after(row);row.after(firstElement('.edit-buttons'));
    const comments=$('comment-area');controls.before(comments);controls.after($('message'));
    const tree=document.createElement('section');tree.id='tree-block';tree.innerHTML='<h2>手順・変化手順</h2><div id="move-strip" class="move-strip" aria-label="手順の一覧"></div>';
    tree.append($('branches'),firstElement('.variation-actions'),$('route-info'));panel.append(tree);
    const tools=$('tools');panel.prepend(tools);tools.querySelector('summary').textContent='ツール';
    const close=document.createElement('button');close.type='button';close.textContent='閉じる';close.className='close-tools';close.onclick=()=>{$('tool').value='play';$('tool').dispatchEvent(new Event('change'));tools.open=false;};tools.querySelector('summary').after(close);
    const table=document.createElement('div');table.className='tool-table';
    for(const option of $('tool').options){const button=document.createElement('button');button.type='button';button.textContent=option.text;button.dataset.tool=option.value;button.onclick=()=>{$('tool').value=option.value;$('tool').dispatchEvent(new Event('change'));table.querySelectorAll('button').forEach(item=>item.classList.toggle('selected',item===button));};table.append(button);}
    $('tool').closest('label').hidden=true;close.after(table);tools.querySelector('summary').title='碁石・記号・文字などを配置できます';
    $('tool').addEventListener('change',()=>{tools.querySelector('summary').textContent=$('tool').value==='play'?'ツール':$('tool').selectedOptions[0].text;});const popup=document.createElement('div');popup.className='tool-popup';[...tools.children].filter(child=>child.tagName!=='SUMMARY').forEach(child=>popup.append(child));tools.append(popup);
    const help=files.querySelector('.help');help.open=false;help.querySelector('summary').textContent='このKifu-Editorについて';panel.after(help);panel.append(files);
    files.querySelector('h2').remove();files.querySelector(':scope > .muted').remove();
    const buttons=files.querySelector('.file-buttons');for(const [id,label] of [['open','棋譜を読み込む'],['save','棋譜の保存']]){const details=document.createElement('details'),summary=document.createElement('summary');details.className='file-menu';summary.textContent=label;details.append(summary,$(id));buttons.append(details);}
    const clear=document.createElement('button');clear.type='button';clear.textContent='棋譜欄を消去';clear.title='テキスト欄だけを消去します';clear.onclick=()=>{$('sgf').value='';};files.querySelector('.text-actions').append(clear);
    firstElement('.topline').after(firstElement('.canvas-wrap'));
  }
  let exportBusy=false,gifBlob=null,gifUrl=null;
  function invalidateGif(){if(exportBusy||!$('gif-preview'))return;gifBlob=null;$('gif-preview').hidden=true;$('gif-save').hidden=true;if(gifUrl){URL.revokeObjectURL(gifUrl);gifUrl=null;}}
  function rasterAt(position=index,scale=1){const old=index,keyboard=keyboardBoard;index=position;keyboardBoard=false;draw(false);const output=document.createElement('canvas');output.width=Math.max(1,Math.round(canvas.clientWidth*scale));output.height=output.width;output.getContext('2d').drawImage(canvas,0,0,output.width,output.height);index=old;keyboardBoard=keyboard;draw();return output;}
  function pointAt(event){const rect=canvas.getBoundingClientRect(),g=geometry(),x=(event.clientX-rect.left)*g.extent/rect.width,y=(event.clientY-rect.top)*g.extent/rect.height,ix=Math.round((x-g.start)/g.gap),iy=Math.round((y-g.start)/g.gap);return ix>=0&&ix<size&&iy>=0&&iy<size?originalPoint(iy*size+ix):null;}
  function configureInterface(){
    firstElement('.text-label').hidden=true;$('sgf').placeholder='棋譜欄';$('sgf').setAttribute('aria-label','棋譜欄');$('import-text').textContent='棋譜欄から碁盤へ';$('export-text').textContent='碁盤から棋譜欄へ';
    const infoDisplay=$('game-info');infoDisplay.hidden=true;
    // Place handicap on the left, the numeric jump on the right, as before.
    const settings=document.createElement('div');settings.className='position-settings';settings.innerHTML='<label>置碁の設定 <select id="handicap" title="2〜9子の置石を配置して、新しい棋譜を白番から始めます"><option value="0">選択</option></select></label>';for(let n=2;n<=9;n++)settings.querySelector('select').add(new Option(n+'子',n));settings.append(firstElement('.jump'));firstElement('.actions').after(settings);
    $('handicap').onchange=()=>{const h=Number($('handicap').value);$('handicap').value='0';if(!h||insertion)return;if(size<7){report('置碁の設定は7路以上で使用できます。',true);return;}if(!canLeave())return;if((root.children.length||root.props.AB||root.props.AW)&&!confirm('現在の棋譜を置き換えて、'+h+'子の置碁を始めますか？'))return;
      const edge=size<=11?2:3,far=size-1-edge,mid=Math.floor(size/2),corners=[[far,edge],[edge,far],[far,far],[edge,edge]],points=h<=4?corners.slice(0,h):h===5?[...corners,[mid,mid]]:h===6?[...corners,[edge,mid],[far,mid]]:h===7?[...corners,[edge,mid],[far,mid],[mid,mid]]:h===8?[...corners,[edge,mid],[far,mid],[mid,edge],[mid,far]]:[...corners,[edge,mid],[far,mid],[mid,edge],[mid,far],[mid,mid]];
      const before=snapshot();root=S.create(size);root.props.HA=[String(h)];root.props.KM=['0.5'];root.props.AB=points.map(([x,y])=>R.encode(y*size+x,size));root.props.PL=['W'];choices=new WeakMap();index=0;editing=true;remember(before);commentTarget=null;infoTarget=null;rebuild();refresh();report(h+'子の置碁を設定しました。白番・編集モードです。');};
    const picker=document.createElement('select');picker.id='line-picker';picker.title='本譜・変化を選択します';picker.setAttribute('aria-label','変化を選択');const lineLabel=document.createElement('label');lineLabel.className='line-selector';lineLabel.append('変化を選択 ',picker);$('tree-block').querySelector('h2').after(lineLabel);picker.onchange=()=>{const entry=branchCatalog[Number(picker.value)];chooseLine(entry,entry.number?entry.anchor:undefined);};
    // Match the user's tool table: left shapes, right characters and areas.
    const table=firstElement('.tool-table'),popup=firstElement('.tool-popup'),tools=$('tools');table.replaceChildren();
    const entries=[['AB','＊ 黒石 ●','を盤面に配置','黒石を配置します。ドラッグで連続操作できます'],['upper','英大文字','を順番に配置','A〜Zを順番に配置します。Zの次はAに戻ります'],['AW','＊ 白石 ○','を盤面に配置','白石を配置します。ドラッグで連続操作できます'],['lower','英小文字','を順番に配置','a〜zを順番に配置します。zの次はaに戻ります'],['TR','＊ 三角 △','を盤面に配置','交点に三角の記号を付けます。ドラッグで連続操作できます'],['number','数字','を順番に配置','交点に数字を順に付けます'],['SQ','＊ 四角 □','を盤面に配置','交点に四角の記号を付けます。ドラッグで連続操作できます'],['label','文章入力','10px・青文字で横書き','入力した文字を交点に付けます'],['CR','＊ 丸 ○','を盤面に配置','交点に丸の記号を付けます。ドラッグで連続操作できます'],['DD','＊ 網掛け','盤面に領域作成','網掛けで盤面に領域を作成します。ドラッグで連続操作できます'],['MA','＊ バツ ×','を盤面に配置','交点にバツの記号を付けます。ドラッグで連続操作できます'],['clear','＊ 要素を削除','着手以外を消去','追加石や記号を削除します。ドラッグで連続操作できます']];
    for(const [value,name,description,title]of entries){const button=document.createElement('button');button.type='button';button.dataset.tool=value;button.title=title;const option=[...$('tool').options].find(option=>option.value===value);if(option)option.text=name.replace('＊ ','');const label=document.createElement('span'),text=document.createElement('span');label.textContent=name;text.textContent=description;text.className='tool-description';button.append(label,text);button.onclick=()=>{$('tool').value=value;$('tool').dispatchEvent(new Event('change'));table.querySelectorAll('button').forEach(item=>item.classList.toggle('selected',item===button));firstElement('.editor-fields').hidden=true;$('info-edit').hidden=true;if(value!=='label')tools.open=false;};table.append(button);}
    const header=document.createElement('strong');header.textContent='碁盤のツール';header.className='tool-heading';popup.prepend(header);const help=document.createElement('p');help.className='tool-drag-help';help.textContent='＊印はドラッグで連続操作できます';table.before(help);
    const commentEditor=firstElement('.editor-fields');commentEditor.hidden=true;$('info-edit').hidden=true;const editGroup=document.createElement('div');editGroup.className='tool-other';
    for(const [label,target,title]of [['コメントの編集',commentEditor,'現在の局面のコメントを編集します'],['対局情報の編集',$('info-edit'),'対局者名やコミなどの対局情報を編集します']]){const button=document.createElement('button');button.type='button';button.dataset.editor='1';button.textContent=label;button.title=title;button.onclick=()=>{commentEditor.hidden=target!==commentEditor;$('info-edit').hidden=target!==$('info-edit');$('info-edit').open=true;tools.querySelector('summary').textContent=label;target.scrollIntoView({block:'nearest'});};editGroup.append(button);}table.after(editGroup);
    const empty=document.createElement('button');empty.type='button';empty.dataset.editor='1';empty.textContent='碁盤をクリア';empty.title='棋譜と盤上のすべての石・記号を消して空盤に戻します';empty.className='clear-board';empty.onclick=()=>{if(!editing||insertion||!canLeave()||!confirm('棋譜と盤上のすべての石・記号を消去しますか？'))return;transaction(()=>{root=S.create(size);originalName='kifu.sgf';choices=new WeakMap();index=0;commentTarget=null;infoTarget=null;},'碁盤をクリアしました。取り消しで戻せます。');window.dispatchEvent(new Event('kifu-record-replaced'));tools.open=false;};popup.append(empty);
    popup.querySelector('.close-tools').title='ツールの使用を終了して通常の操作に戻ります';popup.querySelector('.close-tools').addEventListener('click',()=>{commentEditor.hidden=true;$('info-edit').hidden=true;});
    // File loading: the three original choices, with a manual encoding override.
    const loadMenu=$('open').closest('details');loadMenu.id='load-menu';loadMenu.querySelector('summary').title='棋譜をファイルまたは棋譜欄から読み込みます';$('open').textContent='ファイルから';$('open').title='SGF・NGF・UGF・UGI・GIB・MGTの棋譜を選びます';const fromText=document.createElement('button');fromText.type='button';fromText.id='load-text-choice';fromText.textContent='棋譜欄から';fromText.title='下の棋譜欄の棋譜を読み込みます';fromText.onclick=()=>{$('import-text').click();loadMenu.open=false;};loadMenu.append(fromText);
    const encoding=document.createElement('details');encoding.className='encoding-menu';encoding.innerHTML='<summary title="文字化けする場合だけ文字コードを手動で指定します">文字化けする場合</summary><label>文字コード <select id="encoding" title="通常は自動のままで読み込めます。文字化けする場合に変更してください"><option value="auto">自動</option><option value="utf-8">UTF-8</option><option value="shift_jis">日本語（Shift_JIS）</option><option value="euc-jp">日本語（EUC-JP）</option><option value="euc-kr">韓国語（CP949）</option><option value="gb18030">中国語（簡体字）</option><option value="big5">中国語（繁体字）</option></select></label>';loadMenu.append(encoding);
    const saveMenu=$('save').closest('details');saveMenu.id='save-menu';saveMenu.querySelector('summary').textContent='棋譜の保存・印刷';saveMenu.querySelector('summary').title='クリックすると保存・印刷の操作を表示／非表示にします';const records=document.createElement('div');records.className='record-save-row';records.append($('save'));saveMenu.append(records);
    for(const [id,label,clean,title]of [['save-main','本譜だけを保存',false,'各分岐の先頭を本譜として、変化を除いてSGF保存します'],['save-clean','コメントも除いた本譜だけ保存',true,'変化とコメント・局面名を除いて本譜をSGF保存します']]){const button=document.createElement('button');button.type='button';button.id=id;button.textContent=label;button.title=title;button.onclick=async()=>{if(insertion||!canLeave()||!GoExport.hasRecord(root,true))return;try{await GoExport.save(new Blob([S.write(GoExport.mainOnly(S.parse(exportSgf()).root,clean))],{type:'application/x-go-sgf'}),clean?'本譜_コメントなし.sgf':'本譜.sgf');}catch(error){report(error.message,true);}};records.append(button);}
    const images=document.createElement('div');images.className='image-save-row';images.innerHTML='<button id="save-image" title="表示中と同じ寸法の画像で保存します">盤面を画像保存</button><select id="image-format" aria-label="保存する画像形式" title="保存する画像形式をPNGまたはJPGから選びます"><option value="png">PNG</option><option value="jpg">JPG</option></select><button id="print" title="現在の盤面だけを印刷用の別窓に表示します">盤面を印刷</button>';saveMenu.append(images);
    $('save-image').onclick=async()=>{try{const type=$('image-format').value;await GoExport.save(await GoExport.raster(rasterAt(),type),'盤面.'+type);}catch(error){report(error.message,true);}};
    const preview=document.createElement('dialog');preview.id='print-preview';preview.innerHTML='<h2>盤面の印刷・画像保存</h2><img id="print-preview-image" alt="印刷する盤面"><p id="print-status" role="status"></p><div class="print-actions"><button id="print-now">印刷する</button><button id="print-save">盤面を画像保存</button><select id="print-format" aria-label="プレビューの画像形式"><option value="png">PNG</option><option value="jpg">JPG</option></select><button id="print-close">閉じる</button></div>';document.body.append(preview);let printRaster=null;
    $('print').onclick=()=>{if(insertion||!canLeave())return;printRaster=rasterAt();$('print-preview-image').src=printRaster.toDataURL('image/png');$('print-status').textContent='表示中の盤面を印刷、または画像として保存します。';preview.showModal();};
    $('print-close').onclick=()=>preview.close();
    $('print-now').onclick=async()=>{try{if(window.__TAURI_INTERNALS__?.invoke)await window.__TAURI_INTERNALS__.invoke('desktop_print');else window.print();}catch(error){$('print-status').textContent='印刷を開始できません：'+(error.message||error)+'。画像保存も利用できます。';}};
    $('print-save').onclick=async()=>{try{const type=$('print-format').value;if(await GoExport.save(await GoExport.raster(printRaster,type),'盤面.'+type))$('print-status').textContent='画像を保存しました。';}catch(error){$('print-status').textContent='保存できません：'+error.message;}};

    const gif=document.createElement('details');gif.id='gif-options';gif.innerHTML='<summary title="開始・終了手数を指定して、手順を動くGIF画像にします">手順をGIF画像保存</summary><div class="gif-settings"><label>開始 <input id="gif-start" type="number" min="0" step="1" value="0">手</label><label>終了 <input id="gif-end" type="number" min="0" step="1" value="0">手</label><label>間隔 <select id="gif-seconds"><option value="0.5">0.5秒</option><option value="1" selected>1秒</option><option>2</option><option>3</option><option>4</option><option>5</option></select></label><label>サイズ <select id="gif-scale"><option value="1">100%</option><option value="0.75">75%</option><option value="0.5">50%</option></select></label><label><input id="gif-loop" type="checkbox" checked>繰り返す</label></div><p>現在選んでいる手順を保存します。作成前に手順と手数表示を整えてください。</p><button id="gif-create" title="指定範囲のGIFを作成してプレビューを表示します">GIFを作成</button><button id="gif-save" hidden title="作成済みのGIFをデバイスに保存します">GIFを保存</button><p id="gif-status" role="status"></p><img id="gif-preview" hidden alt="作成した手順GIFのプレビュー">';saveMenu.append(gif);gif.querySelector('summary').onclick=()=>{if(!gif.open){$('gif-start').value='0';$('gif-end').value=frames.at(-1).move;}};
    const progress=document.createElement('dialog');progress.id='gif-progress';progress.innerHTML='<p id="gif-progress-text">GIFを作成しています</p><button id="gif-cancel">中止</button>';document.body.append(progress);
    $('gif-create').onclick=async()=>{const start=Number($('gif-start').value),end=Number($('gif-end').value);if(!$('gif-start').value||!$('gif-end').value||!Number.isInteger(start)||!Number.isInteger(end)||start<0||end<start||end>frames.at(-1).move||end-start>=500){$('gif-status').textContent='開始・終了を選択中の手順の範囲内で指定してください（最大500局面）。';return;}
      const positions=new Map();frames.forEach((frame,n)=>{if(frame.move>=start&&frame.move<=end)positions.set(frame.move,n);});if([...positions.values()].some(n=>issues.slice(0,n+1).some(Boolean))){$('gif-status').textContent='先に盤面を進めて、挿入後の確認が必要な着手を処理してください。';return;}
      let cancelled=false;exportBusy=true;firstElement('main').inert=true;progress.showModal();$('gif-cancel').onclick=()=>cancelled=true;progress.oncancel=event=>{event.preventDefault();cancelled=true;};
      try{const scale=Number($('gif-scale').value),extent=Math.max(1,Math.round(canvas.clientWidth*scale)),writer=new GoExport.Gif(extent,extent,$('gif-loop').checked);let count=0;for(const n of positions.values()){if(cancelled)throw Error('GIF作成を中止しました。');const frame=rasterAt(n,scale);writer.frame(frame.getContext('2d').getImageData(0,0,extent,extent).data,Number($('gif-seconds').value));$('gif-progress-text').textContent='GIFを作成しています：'+(++count)+'／'+positions.size+'局面';await new Promise(resolve=>setTimeout(resolve,0));}if(cancelled)throw Error('GIF作成を中止しました。');if(gifUrl)URL.revokeObjectURL(gifUrl);gifBlob=writer.finish();gifUrl=URL.createObjectURL(gifBlob);$('gif-preview').src=gifUrl;$('gif-preview').hidden=false;$('gif-save').hidden=false;$('gif-status').textContent=count+'局面・'+extent+'×'+extent+'px・'+Math.ceil(gifBlob.size/1000)+'KB。保存できます。';}
      catch(error){$('gif-status').textContent=error.message;}finally{progress.close();firstElement('main').inert=false;exportBusy=false;draw();}};
    $('gif-save').onclick=async()=>{if(gifBlob)try{await GoExport.save(gifBlob,'手順.gif');}catch(error){report(error.message,true);}};
    const titles={size:'4路から19路までの碁盤を選択します',new:'選択した路数の空の碁盤に切り替えます',view:'棋譜を変更せずに閲覧します',edit:'石や記号を追加・変更します',first:'最初の局面へ移動します',back10:'10手戻ります',back:'1手戻ります',next:'1手進みます',next10:'10手進みます',last:'最後の局面へ移動します',numbers:'碁石の手数表示を切り替えます',recent:'現在の局面から直近５手の手数を表示します',pass:'パスを入力します','delete-move':'現在の着手以降の棋譜を削除します',jump:'現在の変化手順の指定手数へ移動します','jump-go':'指定した手数へ移動します',slider:'赤いつまみを動かして、現在の変化順の手数へ移動します','import-text':'棋譜欄の棋譜を碁盤に読み込みます','export-text':'現在の棋譜をSGF形式で棋譜欄に書き出します'};for(const [id,title]of Object.entries(titles))$(id).title=title;
    $('size').previousSibling.textContent='碁盤選択 ';$('jump').parentElement.firstChild.textContent='指定手数へ移動 ';$('turn').title='黒番・白番を切り替えます';
    const fileButtons=firstElement('.file-buttons');
    for(const [menu,id] of [[loadMenu,'load-options'],[saveMenu,'save-options']]){
      const content=document.createElement('div');content.id=id;content.className='file-options';content.hidden=!menu.open;
      [...menu.children].filter(child=>child.tagName!=='SUMMARY').forEach(child=>content.append(child));fileButtons.append(content);
      menu.addEventListener('toggle',()=>{content.hidden=!menu.open;if(menu===loadMenu&&menu.open){content.style.bottom=(fileButtons.getBoundingClientRect().bottom-loadMenu.getBoundingClientRect().top+6)+'px';}});
    }
    new ResizeObserver(()=>{if(loadMenu.open)$('load-options').style.bottom=(fileButtons.getBoundingClientRect().bottom-loadMenu.getBoundingClientRect().top+6)+'px';}).observe(fileButtons);
    // Drag uses one undo record; crossed intersections are interpolated.
    const dragTools=new Set(['AB','AW','TR','SQ','CR','MA','DD','clear']);
    canvas.addEventListener('pointerdown',event=>{if(scoreSession||event.button!==0||!editing||insertion||!dragTools.has(tool)||!canLeave())return;const point=pointAt(event);if(point===null)return;event.preventDefault();stroke={before:snapshot(),visited:new Set(),last:point,pointer:event.pointerId};canvas.setPointerCapture(event.pointerId);suppressClick=true;stroke.visited.add(point);annotate(point);});
    canvas.addEventListener('pointermove',event=>{if(!stroke||event.pointerId!==stroke.pointer)return;const point=pointAt(event);if(point===null)return;const previous=stroke.last,x1=previous%size,y1=Math.floor(previous/size),x2=point%size,y2=Math.floor(point/size),steps=Math.max(Math.abs(x2-x1),Math.abs(y2-y1));for(let step=1;step<=steps;step++){const n=Math.round(y1+(y2-y1)*step/steps)*size+Math.round(x1+(x2-x1)*step/steps);if(!stroke.visited.has(n)){stroke.visited.add(n);annotate(n);}}stroke.last=point;});
    function endStroke(){if(!stroke)return;const before=stroke.before;stroke=null;if(S.write(root)!==before.sgf)remember(before);refresh();}
    canvas.addEventListener('pointerup',endStroke);canvas.addEventListener('pointercancel',()=>{if(stroke){const before=stroke.before;stroke=null;restore(before);}});canvas.addEventListener('lostpointercapture',endStroke);
  }

  let scoreSession=null,scoreWindow=null,scorePoll=null;
  function closeScore(){if(!scoreSession)return;scoreSession=null;document.body.classList.remove('scoring-mode');clearInterval(scorePoll);allElements('[data-score-lock]').forEach(element=>{element.inert=false;delete element.dataset.scoreLock;});if(scoreWindow&&!scoreWindow.closed)scoreWindow.close();scoreWindow=null;refresh();}
  function updateScore(){if(!scoreSession)return;const d=scoreWindow.document,v=id=>d.getElementById(id),options={...scoreSession.options};for(const id of ['komi','capturedB','capturedW','adjust']){const input=v(id),value=Number(input.value);if(input.value===''||!input.checkValidity()||!Number.isFinite(value)){v('problem').textContent='コミ・アゲハマ・補正を正しい数値で入力してください。';return;}options[id]=value;}if(options.komi!==currentKomi()){const before=snapshot();root.props.KM=[String(options.komi)];remember(before);editing=true;infoTarget=null;syncEditors();$('komi-input').value=String(options.komi);}scoreSession.options=options;v('problem').textContent='';scoreSession.result=GoScore.calculate(scoreSession.state,{...options,dead:scoreSession.dead,seki:scoreSession.seki});const r=scoreSession.result;v('heading').textContent=(options.rule==='japanese'?'日本':'中国')+'ルールでの計算結果';v('rule').textContent=options.rule==='japanese'?'中国ルール':'日本ルール';v('formulas').textContent=options.rule==='japanese'?'黒：'+r.territory[1]+'（地）−'+(options.capturedW+r.lost[1])+'（取られた石）＝'+r.black+'\n白：'+r.territory[2]+'（地）−'+(options.capturedB+r.lost[2])+'（取られた石）＋'+options.komi+'（コミ）＝'+r.white:'黒：'+r.live[1]+'（石）＋'+r.territory[1]+'（地）＝'+r.black+'\n白：'+r.live[2]+'（石）＋'+r.territory[2]+'（地）＋'+options.komi+'（コミ）＋'+options.adjust+'（補正）＝'+r.white;const diff=r.black-r.white;v('result').textContent=diff===0?'持碁':(diff>0?'黒':'白')+'の'+Number(Math.abs(diff).toFixed(5))+'目勝ち';v('operation-message').textContent=v('seki-mode').checked?'セキの石を指定してください':'死に石を指定してください';draw();}
  function scoreClick(point){if(point===null||!scoreSession.state.board[point])return;const set=scoreWindow.document.getElementById('seki-mode').checked?scoreSession.seki:scoreSession.dead,other=set===scoreSession.seki?scoreSession.dead:scoreSession.seki,remove=set.has(point);for(const p of R.group(scoreSession.state.board,point,size).stones){if(remove)set.delete(p);else{set.add(p);other.delete(p);}}updateScore();}
  function drawScore(c,g){if(!scoreSession?.result)return;const result=scoreSession.result;for(let p=0;p<result.board.length;p++){const {x,y}=displayXY(p,g);c.save();if(!result.board[p]){if(result.owner[p]){const w=Math.max(3,g.gap*.24);c.fillStyle=result.owner[p]===1?'#151515':'white';c.strokeStyle='#555';c.fillRect(x-w/2,y-w/2,w,w);c.strokeRect(x-w/2,y-w/2,w,w);}else{c.fillStyle='#b53028';c.beginPath();c.arc(x,y,Math.max(1,g.gap*.055),0,Math.PI*2);c.fill();}}if(scoreSession.seki.has(p)){c.strokeStyle='#0786d1';c.lineWidth=2;c.beginPath();c.arc(x,y,g.gap*.35,0,Math.PI*2);c.stroke();}c.restore();}}
  // WebView2 does not reliably provide a script-accessible window.open result.
  // A floating same-document host keeps scoring usable without popup permission.
  function scorePanel(){
    const host=document.createElement('section');host.id='score-panel';host.setAttribute('role','dialog');host.setAttribute('aria-label','勝敗判定');
    const bar=document.createElement('div');bar.className='score-panel-bar';bar.textContent='勝敗判定（ここをドラッグして移動）';
    const close=document.createElement('button');close.textContent='×';close.title='勝敗判定を閉じる';close.setAttribute('aria-label',close.title);bar.append(close);
    const frame=document.createElement('iframe');frame.title='勝敗判定の操作と計算結果';host.append(bar,frame);document.body.append(host);
    let closed=false;const adapter={document:frame.contentDocument,get closed(){return closed;},close(){closed=true;host.remove();},focus(){host.focus();},addEventListener(){}};host.tabIndex=-1;close.onclick=()=>closeScore();
    const rect=canvas.getBoundingClientRect();host.style.left=Math.max(0,Math.min(innerWidth-host.offsetWidth,rect.right+8))+'px';host.style.top=Math.max(0,Math.min(70,innerHeight-host.offsetHeight))+'px';
    let drag=null;bar.onpointerdown=e=>{if(e.target===close)return;const r=host.getBoundingClientRect();drag={x:e.clientX-r.left,y:e.clientY-r.top};bar.setPointerCapture(e.pointerId);e.preventDefault();};bar.onpointermove=e=>{if(!drag)return;host.style.left=Math.max(0,Math.min(innerWidth-host.offsetWidth,e.clientX-drag.x))+'px';host.style.top=Math.max(0,Math.min(innerHeight-40,e.clientY-drag.y))+'px';};bar.onpointerup=bar.onpointercancel=()=>drag=null;
    return adapter;
  }
  async function openScore(){if(toolOpening)return;if(scoreSession){scoreWindow.focus();return;}if(insertion||!canLeave())return;if(closeToolWindow&&toolWindow)closeToolWindow();const rect=canvas.getBoundingClientRect(),width=420,height=Math.min(850,screen.availHeight-70),left=Math.min(screen.availWidth-width,Math.max(0,window.screenX+rect.right)),top=Math.max(0,window.screenY+rect.top);let win;
    // Native app uses a persistent floating panel; browsers prefer PiP/popups.
    if($('analyze-live')?.getAttribute('aria-pressed')==='true')$('analyze-live').click();
    analysisPreview=null;
    if(window.__TAURI_INTERNALS__)win=scorePanel();
    try{const host=window.top;const pip=host.documentPictureInPicture;if(!win&&pip)win=await pip.requestWindow({width,height});}catch{}
    if(!win){try{win=window.open('','independentGoScore','popup,width='+width+',height='+height+',left='+left+',top='+top+',resizable=yes,scrollbars=yes');}catch{}}
    if(!win)win=scorePanel();
    if(!win){report('勝敗判定の別窓を開けません。ポップアップを許可してください。',true);return;}
    document.body.classList.add('scoring-mode');scoreWindow=win;const template=$('score-template').content;win.document.head.replaceChildren(...[...template.querySelector('[data-score-head]').children].map(node=>win.document.importNode(node,true)));win.document.body.replaceChildren(...[...template.querySelector('[data-score-body]').children].map(node=>win.document.importNode(node,true)));
    const km=currentKomi();scoreSession={state:R.copy(frames[index]),dead:new Set(),seki:new Set(),options:{rule:'japanese',komi:km,capturedB:frames[index].captures[1],capturedW:frames[index].captures[2],adjust:0}};const v=id=>win.document.getElementById(id);for(const id of ['komi','capturedB','capturedW','adjust']){v(id).value=scoreSession.options[id];v(id).oninput=updateScore;}v('rule').onclick=()=>{scoreSession.options.rule=scoreSession.options.rule==='japanese'?'chinese':'japanese';updateScore();};v('seki-mode').onchange=updateScore;v('reset').onclick=()=>{scoreSession.dead.clear();scoreSession.seki.clear();updateScore();};v('close').onclick=closeScore;win.addEventListener('pagehide',closeScore,{once:true});allElements('.controls,.topline,.edit-panel,.statusline').forEach(element=>{element.inert=true;element.dataset.scoreLock='1';});scorePoll=setInterval(()=>{if(!scoreWindow||scoreWindow.closed)closeScore();},400);updateScore();win.focus();
  }
  window.addEventListener('pagehide',closeScore);
  const recoveryKey='kifu-standalone-recovery-v1';let recoveryRaw=null,recoveryPending=false,recoveryTimer=null,recoverySignature='',recoveryReady=false;
  function recoveryStatus(text){$('recovery-status').textContent=text;}
  function recoveryData(){return {version:1,time:Date.now(),snapshot:snapshot(),editing,input:$('sgf').value,comment:$('comment-edit').value,info:[...allElements('[data-prop]')].map(input=>[input.dataset.prop,input.value])};}
  function saveRecovery(manual){if(insertion||scoreSession)return;try{const current=localStorage.getItem(recoveryKey);if(recoveryPending||current!==recoveryRaw){if(!manual||!confirm('端末内にある一時保存を、現在の棋譜で置き換えますか？')){recoveryPending=true;recoveryStatus('前回または別の画面の一時保存があります。「復元」か「今すぐ保存」を選んでください。');return;}}const value=recoveryData(),raw=JSON.stringify(value);if(raw.length>4*1024*1024)throw Error('一時保存の上限を超えています');localStorage.setItem(recoveryKey,raw);recoveryRaw=raw;recoveryPending=false;recoveryStatus('端末内に一時保存しました（'+new Date(value.time).toLocaleTimeString('ja-JP')+'）');}catch(error){recoveryStatus('一時保存できません。棋譜をファイルに保存してください：'+error.message);}}
  function scheduleRecovery(){if(!recoveryReady||insertion||scoreSession)return;const signature=serialized()+'\n'+$('sgf').value+'\n'+$('comment-edit').value+'\n'+JSON.stringify([...allElements('[data-prop]')].map(input=>input.value));if(signature===recoverySignature)return;recoverySignature=signature;clearTimeout(recoveryTimer);if($('auto-recovery').checked&&!recoveryPending&&(dirty||hasCommentDraft()||hasInfoDraft()||$('sgf').value.trim()))recoveryTimer=setTimeout(()=>saveRecovery(false),700);}
  function setupExtra(){const score=document.createElement('button');score.id='score';score.textContent='勝敗判定';score.title='元の碁盤で死に石・セキを指定し、日本ルール・中国ルールの結果を表示します';$('turn').after(score);score.onclick=openScore;
    const recovery=document.createElement('details');recovery.id='recovery';recovery.innerHTML='<summary title="このブラウザー内に盤面を一時保存し、復元します">盤面の一時保存・復元</summary><label><input id="auto-recovery" type="checkbox" checked> 自動で一時保存</label><div><button id="recovery-save" title="現在の棋譜をこの端末に一時保存します">今すぐ保存</button><button id="recovery-restore" title="端末内の一時保存を確認して復元します">復元</button><button id="recovery-delete" title="端末内の一時保存だけを削除します">保存を削除</button></div><p>このブラウザーに１件保存します。サーバーへの送信や他の端末との共有は行いません。大切な棋譜は上部の「保存・印刷」→「棋譜を保存…」でファイルに保存してください。</p><p id="recovery-status" role="status"></p>';
    firstElement('.text-actions').after(recovery);try{recoveryRaw=localStorage.getItem(recoveryKey);recoveryPending=!!recoveryRaw;if(recoveryPending)recoveryStatus('前回の一時保存があります。「復元」で読み込めます。');}catch{recoveryStatus('このブラウザーでは一時保存を利用できません。');$('auto-recovery').checked=false;}
    $('recovery-save').onclick=()=>saveRecovery(true);$('auto-recovery').onchange=()=>{clearTimeout(recoveryTimer);if($('auto-recovery').checked){recoverySignature='';scheduleRecovery();}};
    $('recovery-restore').onclick=()=>{if(insertion||!canLeave())return;try{const raw=localStorage.getItem(recoveryKey);if(!raw){recoveryStatus('一時保存はありません。');return;}const saved=JSON.parse(raw);if(saved.version!==1||!saved.snapshot||typeof saved.snapshot.name!=='string'||!Array.isArray(saved.info)||saved.info.some(pair=>!Array.isArray(pair)||pair.length!==2||pair.some(value=>typeof value!=='string'))||!Number.isInteger(saved.snapshot.index)||saved.snapshot.index<0||!Array.isArray(saved.snapshot.selected)||saved.snapshot.selected.some(pair=>!Array.isArray(pair)||pair.length!==2||pair.some(value=>!Number.isInteger(value)||value<0)))throw Error('保存データが不正です');const parsed=S.parse(saved.snapshot.sgf);validate(parsed.root,parsed.size);if(parsed.size!==saved.snapshot.size)throw Error('盤の大きさが一致しません');if(!confirm(new Date(saved.time).toLocaleString('ja-JP')+' の一時保存を復元しますか？現在の棋譜を置き換えます。'))return;clearTimeout(recoveryTimer);recoveryReady=false;resetHistory();restore(saved.snapshot);editing=!!saved.editing;dirty=true;$('size').value=String(size);$('sgf').value=String(saved.input||'');$('comment-edit').value=String(saved.comment||'');for(const [key,value]of saved.info||[]){const input=[...allElements('[data-prop]')].find(input=>input.dataset.prop===key);if(input)input.value=String(value);}window.dispatchEvent(new Event('kifu-record-replaced'));recoveryRaw=raw;recoveryPending=false;lastRenderedRecord=S.write(root);refresh();recoverySignature='';recoveryReady=true;scheduleRecovery();recoveryStatus('一時保存を復元しました。');}catch(error){recoveryReady=true;recoveryStatus('復元できません：'+error.message);}};
    $('recovery-delete').onclick=()=>{if(!confirm('この端末の一時保存を削除しますか？表示中の棋譜は残ります。'))return;try{clearTimeout(recoveryTimer);localStorage.removeItem(recoveryKey);recoveryRaw=null;recoveryPending=false;recoveryStatus('端末内の一時保存を削除しました。');}catch(error){recoveryStatus(error.message);}};
    allElements('#sgf,#comment-edit,[data-prop]').forEach(input=>input.addEventListener('input',scheduleRecovery));window.addEventListener('storage',event=>{if(event.key===recoveryKey){clearTimeout(recoveryTimer);recoveryPending=true;recoveryStatus('別の画面で一時保存が変更されました。復元または保存の前に確認してください。');}});window.addEventListener('pagehide',()=>{clearTimeout(recoveryTimer);if($('auto-recovery').checked&&!recoveryPending&&dirty)saveRecovery(false);});
  }

  arrangeLayout();configureInterface();
  const top=firstElement('.topline'),settings=firstElement('.position-settings'),actions=firstElement('.actions');
  top.querySelector('label').after($('handicap').closest('label'));
  settings.prepend($('turn'));actions.append($('pass'),$('delete-move'));
  firstElement('.edit-action-row').remove();$('message').hidden=true;$('new').hidden=true;$('size').onchange=()=>{$('new').click();$('size').value=String(size);};

  firstElement('.edit-buttons').append($('tools'));

  // Explicit same-origin interface for the bulletin board. No legacy player shim.
  window.IndependentGo=Object.freeze({
    matchInfo(info){
      if(insertion||scoreSession||exportBusy||!canLeave())throw Error('編集中の操作を終了してください。');
      const before=snapshot();for(const [key,value] of Object.entries(info)){if(!['PB','PW','RU','RE','DT'].includes(key))continue;if(value)root.props[key]=[String(value)];else delete root.props[key];}
      remember(before);infoTarget=null;editing=true;tool='play';$('tool').value='play';refresh();
    },
    matchPlay(point,expected){
      if(insertion||scoreSession||exportBusy)throw Error('盤面を変更できません。');
      if(serialized()!==expected.sgf||index!==expected.index||JSON.stringify(route.slice(1).map((n,i)=>route[i].children.indexOf(n)))!==JSON.stringify(expected.path))throw Error('対局中に局面が変更されました。');
      R.play(frames[index],point);analysisPreview=null;tool='play';$('tool').value='play';editing=true;
      const oldIndex=index;matchMutation=true;try{place(point);}finally{matchMutation=false;}
      if(index===oldIndex)throw Error('着手を反映できませんでした。');
    },
    getSgf(){if(insertion||scoreSession||!canLeave())throw Error('挿入・勝敗判定・編集中の入力を終了してから取り込んでください。');return serialized();},
    rotateBoard,displayPoint,
    importFile,nativeDrag,
    async nativeDrop(payload){
      nativeDrag('drop');
      // OS-delivered record drops are accepted anywhere in the main window.
      // Do not silently discard them based on client/screen/DPI coordinates.
      if(payload.error){dragStatus(payload.error);report(payload.error,true);return false;}
      // Native focus activation is asynchronous. Do not run a replacement confirmation
      // while WebView2 still considers the receiving document inactive.
      const ticket=++dropTicket;pendingDrop=null;dropNotice.hidden=true;
      for(let n=0;n<20&&!document.hasFocus();n++)await new Promise(r=>setTimeout(r,50));
      if(ticket!==dropTicket)return false;
      const file=new File([new Uint8Array(payload.bytes)],payload.name);
      if(!document.hasFocus()){
        pendingDrop=file;dragStatus(file.name+' を受け取りました。読込みボタンで開けます。');dropName.textContent=file.name+' を受け取りました。読込みボタンを押してください。';dropNotice.hidden=false;return false;
      }
      const loaded=await importFile(file);dragStatus(loaded?'':'読み込めませんでした、または置き換えを中止しました。');return loaded;
    },
    pasteRecord,
    getText(){return $('sgf').value;},
    getMove(){return frames[index].move;},
    previewAnalysis(result){if(scoreSession||insertion)return false;analysisPreview=result;draw();return true;},
    clearAnalysisPreview(){if(analysisPreview){analysisPreview=null;draw();}},
    playAnalysisMove(point,expected){
      if(insertion||scoreSession||exportBusy||!canLeave())throw Error('挿入・勝敗判定・未反映の入力を終了してください。');
      if(serialized()!==expected.sgf||index!==expected.index||JSON.stringify(route.slice(1).map((n,i)=>route[i].children.indexOf(n)))!==JSON.stringify(expected.path))throw Error('局面が変わりました。候補手を選び直してください。');
      R.play(frames[index],point); // Validate before changing mode or tool.
      if(!editing)throw Error('棋譜のロックを解除してから着手してください。');analysisPreview=null;tool='play';$('tool').value='play';canvas.style.touchAction='pan-y';$('tools').querySelector('summary').textContent='ツール';
      place(point);
    },
    analysisSnapshot(){if(insertion||scoreSession||!canLeave())throw Error('挿入・勝敗判定・未反映の入力を終了してください。');return {sgf:serialized(),size,komi:currentKomi(),index,path:route.slice(1).map((n,i)=>route[i].children.indexOf(n)),geometry:geometry()};},
    peekAnalysisSnapshot(){return {sgf:serialized(),size,komi:currentKomi(),index,path:route.slice(1).map((n,i)=>route[i].children.indexOf(n)),geometry:geometry()};},
    async analysisAt(target,expected){if(serialized()!==expected)throw Error('棋譜が変更されています。');if(!Number.isInteger(target)||target<0||target>=route.length)throw Error('局面番号が不正です。');await at(target);},
    async loadAnalysisSnapshot(saved){if(!load(saved.sgf,'解析付き棋譜.sgf'))return false;choices=new WeakMap();let n=root;for(const selected of saved.path){if(!n.children[selected])throw Error('保存された変化が不正です。');choices.set(n,selected);n=n.children[selected];}index=saved.index;rebuild();refresh();return true;},

    async loadSgf(text,name,move=100000,options={}){if(!load(text,name))return false;if(options.edited){dirty=true;editing=true;}const target=Math.max(0,Number(move)||0);let n=frames.findIndex(f=>f.move>=target);await at(n<0?route.length-1:n);return true;}
  });

  function stopAuto(){clearTimeout(autoTimer);autoTimer=null;autoPlaying=false;syncAuto();}
  function syncAuto(){const button=$('auto-play');if(!button)return;
    const blocked=!!(scoreSession||insertion||exportBusy||index>=route.length-1);
    if(blocked&&autoPlaying){clearTimeout(autoTimer);autoTimer=null;autoPlaying=false;}
    button.disabled=blocked;button.innerHTML=autoPlaying?'停止 <span aria-hidden="true">Ⅱ</span>':'自動<span aria-hidden="true">►</span>';
    button.setAttribute('aria-pressed',String(autoPlaying));button.title=autoPlaying?'自動再生を停止します':'現在の手数以降を自動で表示します';
  }
  function scheduleAuto(){clearTimeout(autoTimer);if(!autoPlaying)return;autoTimer=setTimeout(async()=>{
    if(!autoPlaying||document.hidden)return stopAuto();
    const before=index;let next=frames.findIndex((f,n)=>n>index&&f.move>frames[index].move);if(next<0)next=route.length-1;
    // Do not open a conflict dialog unattended during timed playback.
    if(issues.slice(0,next+1).some(Boolean))return stopAuto();
    await at(next);if(!autoPlaying)return;if(index===before||index>=route.length-1)return stopAuto();scheduleAuto();
  },Number($('auto-seconds').value)*1000);}
  function setupAuto(){
    const group=document.createElement('div');group.className='autoplay';group.innerHTML='<button type="button" id="auto-play" aria-pressed="false">自動<span aria-hidden="true">►</span></button><label><select id="auto-seconds" aria-label="自動再生の間隔" title="次の手を表示する間隔です">'+[1,2,3,4,5].map(n=>'<option value="'+n+'">'+n+'</option>').join('')+'</select>秒</label>';
    const nav=firstElement('.navigation'),actions=firstElement('.actions');nav.append(group);
    $('auto-play').onclick=()=>{if(autoPlaying)return stopAuto();if(!canLeave())return;autoPlaying=true;syncAuto();scheduleAuto();};
    $('auto-seconds').onchange=()=>{if(autoPlaying)scheduleAuto();};
    for(const type of ['pointerdown','click','keydown','input','change'])document.addEventListener(type,event=>{if(autoPlaying&&!group.contains(event.target))stopAuto();},true);
    document.addEventListener('visibilitychange',()=>{if(document.hidden)stopAuto();});window.addEventListener('pagehide',stopAuto);
    new ResizeObserver(()=>{const narrow=firstElement('.controls').clientWidth<400;const target=narrow?actions:nav;if(group.parentNode!==target){if(narrow)target.prepend(group);else target.append(group);}}).observe(firstElement('.controls'));
    syncAuto();
  }


  function setupToolWindow(){
    const tools=$('tools'),popup=firstElement('.tool-popup'),summary=tools.querySelector('summary');
    toolRoot=popup;
    let poll=null,restoring=false;
    function restore(){
      if(restoring)return;restoring=true;
      const win=toolWindow;toolWindow=null;clearInterval(poll);poll=null;
      tools.append(popup);popup.inert=false;tools.open=false;
      $('tool').value='play';$('tool').dispatchEvent(new Event('change'));
      popup.querySelectorAll('[data-tool]').forEach(button=>button.classList.remove('selected'));
      if(win&&!win.closed)win.close();
      restoring=false;
    }
    closeToolWindow=restore;
    async function openTools(event){
      event.preventDefault();
      if(toolOpening||scoreSession)return;
      if(toolWindow&&!toolWindow.closed){toolWindow.focus();return;}
      const rect=canvas.getBoundingClientRect();
      const left=Math.round(window.screenX+rect.right+16),top=Math.round(window.screenY+100);
      let win=null,pinned=false;
      toolOpening=true;
      try{
        const pip=window.top.documentPictureInPicture;
        if(pip){win=await pip.requestWindow({width:470,height:610});pinned=true;}
      }catch{}
      finally{toolOpening=false;}
      if(!win)win=window.open('','',`popup=yes,width=470,height=610,left=${left},top=${top},resizable=yes,scrollbars=yes`);
      if(!win){report('ツールの別窓を開けませんでした。このサイトのポップアップを許可して、もう一度「ツール」を押してください。',true);return;}
      toolWindow=win;
      const doc=win.document;doc.title=pinned?'碁盤のツール（最前面）':'碁盤のツール';doc.documentElement.dataset.toolWindow=pinned?'pip':'popup';doc.documentElement.lang='ja';
      const meta=doc.createElement('meta');meta.name='viewport';meta.content='width=device-width,initial-scale=1';doc.head.append(meta);
      for(const source of document.querySelectorAll('link[rel="stylesheet"]')){const link=doc.createElement('link');link.rel='stylesheet';link.href=source.href;doc.head.append(link);}
      const style=doc.createElement('style');style.textContent=`
        html,body{margin:0;min-width:0;background:#f0f7f7;color:#183c40}
        body{padding:10px}.controls{margin:0;padding:0;border:0;background:transparent;color:#183c40}
        .controls .tool-popup{position:static!important;width:100%;max-width:none;max-height:none;overflow:visible;border:0;box-shadow:none;padding:0;color:#183c40}
        .tool-popup .close-tools{position:sticky;top:0;float:right;background:white;z-index:2}
        .tool-popup input,.tool-popup textarea{max-width:100%;color:#183c40}
        .tool-table{grid-template-columns:repeat(2,minmax(0,190px));gap:8px}
        @media(max-width:410px){.tool-table{grid-template-columns:minmax(0,190px)}}`;
      doc.head.append(style);
      const wrapper=doc.createElement('div');wrapper.className='controls';doc.body.replaceChildren(wrapper);
      if(!pinned){const notice=doc.createElement('p');notice.textContent='この環境では最前面表示を利用できません。HTTPSのページを対応するPC版Chrome・Edgeで開いてください。';notice.style.cssText='font-size:12px;background:#fff2cc;color:#493400;padding:8px';wrapper.append(notice);}
      wrapper.append(popup);
      tools.open=true;summary.setAttribute('aria-haspopup','true');
      win.addEventListener('pagehide',restore,{once:true});
      poll=setInterval(()=>{if(!toolWindow||toolWindow.closed)restore();else popup.inert=!!scoreSession;},250);
      editRefresh();win.focus();
    }
    summary.addEventListener('click',openTools);
    popup.querySelector('.close-tools').addEventListener('click',restore);
    window.addEventListener('pagehide',restore);
  }

  setupExtra();if(!document.body.hasAttribute('data-standalone'))setupToolWindow();setupKomi();
  const boardBlock=document.createElement('section');boardBlock.className='board-block';boardBlock.setAttribute('aria-label','碁盤ブロック');
  const boardTop=firstElement('.topline');boardTop.before(boardBlock);
  for(const selector of ['.topline','#drop-status','.canvas-wrap','.players','.statusline','#comment-area'])boardBlock.append(firstElement(selector));
  window.addEventListener('workspace-layout',()=>{drawMoveStrip();draw();});
  setupAuto();new ResizeObserver(()=>draw()).observe(canvas);rebuild();refresh();recoveryReady=true;recoverySignature=serialized()+'\n'+$('sgf').value+'\n'+$('comment-edit').value+'\n'+JSON.stringify([...allElements('[data-prop]')].map(input=>input.value));
})();
