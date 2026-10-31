/* PC sidebar: Black-perspective evaluations. Missing positions are never interpolated. */
(()=>{'use strict';
 let data=null,panel=null,matchRecords=new Map(),matchKind=null;
 function keys(snapshot){let node=GoSgf.parse(snapshot.sgf).root,history=[];const relevant=p=>Object.fromEntries(Object.entries(p).filter(([k])=>['SZ','KM','HA','RU','B','W','AB','AW','AE','PL','KO','XIGFORCE','XIGPENDING'].includes(k)));history.push(relevant(node.props));const out=[JSON.stringify([snapshot.size,snapshot.komi,history])];for(const choice of snapshot.path){node=node.children[choice];if(!node)break;history.push(relevant(node.props));out.push(JSON.stringify([snapshot.size,snapshot.komi,history]));}return out;}
 window.addEventListener('kifu-match-evaluation',e=>{const {snapshot,index,move,result,color}=e.detail;const key=keys(snapshot)[index];if(key)matchRecords.set(key,{index,move,result,color});render();});
 window.addEventListener('kifu-match-start',e=>{matchRecords.clear();data=null;matchKind=e.detail&&!e.detail.blackHuman&&!e.detail.whiteHuman?'ai':'human';if(panel)panel.querySelector('#graph-visible').checked=matchKind==='ai';render();});
 window.addEventListener('kifu-record-replaced',()=>{matchRecords.clear();data=null;matchKind=null;if(panel)panel.querySelector('#graph-visible').checked=true;render();});
 window.addEventListener('kifu-position-change',render);
 const ns='http://www.w3.org/2000/svg',green='#00ee00',magenta='#ed00ed';
 window.addEventListener('kifu-evaluation-data',e=>{data=e.detail;render();});
 function mount(){const side=document.getElementById('board-sidebar');if(!side)return;
  panel=document.createElement('section');panel.id='side-evaluation';panel.setAttribute('aria-label','黒白の形勢と全局グラフ');
  panel.innerHTML='<div class="graph-content"><div class="side-win-labels"><span id="side-black-rate"></span><span id="side-white-rate"></span></div><div id="side-win-bar" aria-label="現在局面の黒白勝率"><span class="black-share"></span><span class="white-share"></span></div></div><div class="side-eval-legend"><span id="graph-win-label" class="win-key">勝率（黒）</span><label class="graph-toggle">グラフ表示 <input id="graph-visible" type="checkbox" checked></label><span id="graph-score-label" class="score-key">目数差（黒）</span></div><svg id="side-eval-graph" role="img" aria-label="手数ごとの黒の勝率と目数差。クリックするとその局面へ移動"></svg>';
  side.append(panel);panel.querySelector('#graph-visible').onchange=render;render();new ResizeObserver(render).observe(panel);
 }
 function render(){if(!panel)return;panel.querySelector('.graph-content').hidden=!panel.querySelector('#graph-visible').checked;const svg=panel.querySelector('svg');svg.toggleAttribute('hidden',!panel.querySelector('#graph-visible').checked);svg.replaceChildren();svg.onclick=null;
  const width=Math.max(240,panel.clientWidth),height=300,left=44,right=width-33,top=10,bottom=270;
  svg.setAttribute('viewBox',`0 0 ${width} ${height}`);
  const add=(tag,attrs,text)=>{const el=document.createElementNS(ns,tag);for(const [k,v]of Object.entries(attrs))el.setAttribute(k,v);if(text!==undefined)el.textContent=text;svg.append(el);return el;};
  const snapshot=IndependentGo.peekAnalysisSnapshot();
  const matched=keys(snapshot).flatMap((key,index)=>matchRecords.has(key)?[{...matchRecords.get(key),index}]:[]);
  const same=data?.snapshot&&KifuAnalysis.identity(data.snapshot)===KifuAnalysis.identity(snapshot);
  const source=window.KifuMatch?.locked?matched:same&&data.results.length?data.results:matched;
  const dual=matchKind==='ai'&&source===matched;panel.querySelector('#graph-win-label').textContent=dual?'勝率（黒・白）':'勝率（黒）';panel.querySelector('#graph-win-label').title=dual?'黒線：黒番AIの黒勝率／白線：白番AIの白勝率':'';panel.querySelector('#graph-score-label').textContent=dual?'目数差（各側）':source===matched&&matched.some(p=>p.color==='W')?'目数差（白）':'目数差（黒）';panel.querySelector('#graph-score-label').title=dual?'実線：黒番AIの黒視点／破線：白番AIの白視点':'';svg.setAttribute('aria-label',dual?'各AIから見た自分の勝率と目数差':'黒視点の勝率と目数差');
  const records=source.filter(p=>Number.isFinite(p.result?.rootInfo?.winrate)&&Number.isFinite(p.result?.rootInfo?.scoreLead)).sort((a,b)=>a.index-b.index);
  const go=async index=>{if(window.KifuMatch?.locked)return;try{await IndependentGo.analysisAt(index,snapshot.sgf);}catch{}};
  const current=records.find(p=>p.index===snapshot.index),bar=panel.querySelector('#side-win-bar');
  bar.classList.toggle('empty',!current);
  const b=current?Math.max(0,Math.min(1,current.result.rootInfo.winrate)):0;
  panel.querySelector('.black-share').style.width=current?b*100+'%':'0';panel.querySelector('.white-share').style.width=current?(1-b)*100+'%':'0';
  panel.querySelector('#side-black-rate').textContent=current?'黒 '+(b*100).toFixed(1)+'%':'';
  panel.querySelector('#side-white-rate').textContent=current?'白 '+((1-b)*100).toFixed(1)+'%':'';
  bar.setAttribute('aria-label',current?`黒勝率 ${(b*100).toFixed(1)}%、白勝率 ${((1-b)*100).toFixed(1)}%`:'現在局面は未解析');
  let route=[],move=0;
  if(snapshot)try{let node=GoSgf.parse(snapshot.sgf).root;route.push({index:0,move:node.props.B||node.props.W?++move:move});for(const choice of snapshot.path){node=node.children[choice];if(!node)break;if(node.props.B||node.props.W)move++;route.push({index:route.length,move});}}catch{}
  const max=Math.max(1,move,...records.map(p=>p.move)),extent=Math.max(10,Math.ceil(Math.max(0,...records.map(p=>Math.abs(p.result.rootInfo.scoreLead)))/10)*10);
  const x=m=>left+(right-left)*m/max,yw=v=>bottom-(bottom-top)*v,ys=v=>yw((v+extent)/(extent*2));
  for(const t of [0,.5,1]){const y=yw(t);add('line',{x1:left,x2:right,y1:y,y2:y,class:t===.5?'eval-midline':'eval-gridline',stroke:t===.5?'#d4e0d8':'#84978d','stroke-width':t===.5?1.5:1,'stroke-dasharray':t===.5?'none':'3 3'});add('text',{x:left-4,y:y+4,'text-anchor':'end',fill:'#edf3ef','font-size':12},Math.round(t*100)+'%');add('text',{x:right+4,y:y+4,fill:'#edf3ef','font-size':12},String(Math.round((t*2-1)*extent)));}
  for(let m=0;m<=max;m+=25){for(const y of [top,bottom])add('line',{class:'eval-tick','data-move':m,x1:x(m),x2:x(m),y1:y-4,y2:y+4,stroke:'#d4e0d8','stroke-width':1});}
  const step=max<=10?5:max<=50?25:50*Math.max(1,Math.ceil(max/200));
  for(let m=0;m<=max;m+=step){add('text',{x:x(m),y:height-4,'text-anchor':m===0?'start':'middle',fill:'#edf3ef','font-size':12},m+'手');}
  if(max%step&&max%step>step*.5)add('text',{x:right,y:height-4,'text-anchor':'end',fill:'#edf3ef','font-size':12},max+'手');
  if(!records.length)return;
  const index=snapshot.index,cursor=route[index];if(cursor)add('line',{class:'eval-cursor',x1:x(cursor.move),x2:x(cursor.move),y1:top,y2:bottom,stroke:'#b0c6ba','stroke-width':1});
  const series=dual?[
   {metric:'winrate',color:'#000',side:'B',y:yw},
   {metric:'winrate',color:'#fff',side:'W',y:v=>yw(1-v)},
   {metric:'scoreLead',color:magenta,side:'B',y:ys},
   {metric:'scoreLead',color:magenta,side:'W',y:v=>ys(-v),dash:'5 4'}
  ]:[{metric:'winrate',color:green,y:yw},{metric:'scoreLead',color:magenta,y:(v,p)=>ys(source===matched&&p.color==='W'?-v:v)}];
  for(const {metric,color,side,y,dash} of series){
   const points=side?records.filter(p=>p.color===side):records;
   const adjacent=(a,b)=>a&&b&&b.index-a.index===(side||source===matched&&matchKind==='human'?2:1)&&b.move-a.move===(side||source===matched&&matchKind==='human'?2:1);
   let d='';for(let i=0;i<points.length;i++){const item=points[i],connected=adjacent(points[i-1],item),following=adjacent(item,points[i+1]);
    d+=(connected?' L':' M')+x(item.move)+' '+y(item.result.rootInfo[metric],item);
    if(!connected&&!following)d+=' m -3 0 l 6 0';
   }
   add('path',{'data-metric':metric,'data-side':side||'',d,fill:'none',stroke:color,'stroke-width':metric==='winrate'?2.5:1.8,'stroke-dasharray':dash||'none','stroke-linejoin':'round'});
  }
  svg.onclick=e=>{const rect=svg.getBoundingClientRect(),px=(e.clientX-rect.left)*width/rect.width;if(px<left||px>right)return;const target=Math.round((px-left)/(right-left)*max);const pos=route.find(p=>p.move===target);if(pos)go(pos.index);};
 }
 if(document.readyState!=='complete')document.addEventListener('DOMContentLoaded',mount);else mount();
})();
