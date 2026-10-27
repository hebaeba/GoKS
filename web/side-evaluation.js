/* PC sidebar: Black-perspective evaluations. Missing positions are never interpolated. */
(()=>{'use strict';
 let data=null,panel=null,matchRecords=new Map();
 function keys(snapshot){let node=GoSgf.parse(snapshot.sgf).root,history=[];const relevant=p=>Object.fromEntries(Object.entries(p).filter(([k])=>['SZ','KM','HA','RU','B','W','AB','AW','AE','PL','KO','XIGFORCE','XIGPENDING'].includes(k)));history.push(relevant(node.props));const out=[JSON.stringify([snapshot.size,snapshot.komi,history])];for(const choice of snapshot.path){node=node.children[choice];if(!node)break;history.push(relevant(node.props));out.push(JSON.stringify([snapshot.size,snapshot.komi,history]));}return out;}
 window.addEventListener('kifu-match-evaluation',e=>{const {snapshot,index,move,result}=e.detail;const key=keys(snapshot)[index];if(key)matchRecords.set(key,{index,move,result});render();});
 window.addEventListener('kifu-match-start',()=>{matchRecords.clear();render();});
 window.addEventListener('kifu-record-replaced',()=>{matchRecords.clear();data=null;render();});
 window.addEventListener('kifu-position-change',render);
 const ns='http://www.w3.org/2000/svg',green='#00ee00',magenta='#ed00ed';
 window.addEventListener('kifu-evaluation-data',e=>{data=e.detail;render();});
 function mount(){const side=document.getElementById('board-sidebar');if(!side)return;
  panel=document.createElement('section');panel.id='side-evaluation';panel.setAttribute('aria-label','黒白の形勢と全局グラフ');
  panel.innerHTML='<div class="side-win-labels"><span id="side-black-rate"></span><span id="side-white-rate"></span></div><div id="side-win-bar" aria-label="現在局面の黒白勝率"><span class="black-share"></span><span class="white-share"></span></div><div class="side-eval-legend"><span class="win-key">勝率（黒）</span><span class="score-key">目数差（黒）</span></div><svg id="side-eval-graph" role="img" aria-label="手数ごとの黒の勝率と目数差。クリックするとその局面へ移動"></svg>';
  side.append(panel);render();new ResizeObserver(render).observe(panel);
 }
 function render(){if(!panel)return;const svg=panel.querySelector('svg');svg.replaceChildren();svg.onclick=null;
  const width=Math.max(240,panel.clientWidth),height=300,left=44,right=width-33,top=10,bottom=270;
  svg.setAttribute('viewBox',`0 0 ${width} ${height}`);
  const add=(tag,attrs,text)=>{const el=document.createElementNS(ns,tag);for(const [k,v]of Object.entries(attrs))el.setAttribute(k,v);if(text!==undefined)el.textContent=text;svg.append(el);return el;};
  const snapshot=IndependentGo.peekAnalysisSnapshot();
  const matched=keys(snapshot).flatMap((key,index)=>matchRecords.has(key)?[{...matchRecords.get(key),index}]:[]);
  const same=data?.snapshot&&KifuAnalysis.identity(data.snapshot)===KifuAnalysis.identity(snapshot);
  const source=window.KifuMatch?.locked?matched:same&&data.results.length?data.results:matched;
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
  for(const t of [0,.5,1]){const y=yw(t);add('line',{x1:left,x2:right,y1:y,y2:y,stroke:'#ced8d2','stroke-dasharray':'3 3'});add('text',{x:left-4,y:y+4,'text-anchor':'end',fill:'#324c42','font-size':12},Math.round(t*100)+'%');add('text',{x:right+4,y:y+4,fill:'#324c42','font-size':12},String(Math.round((t*2-1)*extent)));}
  const step=max<=10?5:max<=50?25:50*Math.max(1,Math.ceil(max/200));
  for(let m=0;m<=max;m+=step){add('text',{x:x(m),y:height-4,'text-anchor':m===0?'start':'middle',fill:'#324c42','font-size':12},m+'手');}
  if(max%step&&max%step>step*.5)add('text',{x:right,y:height-4,'text-anchor':'end',fill:'#324c42','font-size':12},max+'手');
  if(!records.length)return;
  const index=snapshot.index,cursor=route[index];if(cursor)add('line',{class:'eval-cursor',x1:x(cursor.move),x2:x(cursor.move),y1:top,y2:bottom,stroke:'#728b80','stroke-width':1});
  for(const [metric,color,y]of [['winrate',green,yw],['scoreLead',magenta,ys]]){
   let d='';for(let i=0;i<records.length;i++){const item=records[i],prev=records[i-1],next=records[i+1],connected=prev&&item.index===prev.index+1&&item.move===prev.move+1,following=next&&next.index===item.index+1&&next.move===item.move+1;
    d+=(connected?' L':' M')+x(item.move)+' '+y(item.result.rootInfo[metric]);
    // An isolated result is a short stroke, never a circular marker or a bridge across missing data.
    if(!connected&&!following)d+=' m -3 0 l 6 0';
   }
   add('path',{'data-metric':metric,d,fill:'none',stroke:color,'stroke-width':metric==='winrate'?2.5:1.8,'stroke-linejoin':'round'});
  }
  svg.onclick=e=>{const rect=svg.getBoundingClientRect(),px=(e.clientX-rect.left)*width/rect.width;if(px<left||px>right)return;const target=Math.round((px-left)/(right-left)*max);const pos=route.find(p=>p.move===target);if(pos)go(pos.index);};
 }
 if(document.readyState!=='complete')document.addEventListener('DOMContentLoaded',mount);else mount();
})();
