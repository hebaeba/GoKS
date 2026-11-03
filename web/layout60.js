/* Desktop panel widths are independent of the square board and remembered per device. */
(()=>{'use strict';
 const pane=document.querySelector('.board-panel'),wrap=document.querySelector('.canvas-wrap'),grid=document.querySelector('.workspace');
 let frame,leftWidth=330,rightWidth=null;try{const v=JSON.parse(localStorage.getItem('gokifu-panel-widths')||'null');if(v){leftWidth=Math.max(280,Math.min(620,v.left||330));rightWidth=v.right?Math.max(340,Math.min(800,v.right)):null;}}catch{}
 function defaultRight(){const tabs=document.querySelector('.workspace-tabs');const buttons=tabs?[...tabs.querySelectorAll('button')].filter(e=>!e.hidden):[];return Math.ceil(Math.max(420,buttons.reduce((n,e)=>n+e.getBoundingClientRect().width,0)+buttons.length*8+28));}
 function fit(){
  if(document.body.classList.contains('simple-mode')){positionHandles();return;}
  const block=document.querySelector('.board-block'),desktop=true;
  const other=['.board-heading','#normal-info','#normal-slider'].reduce((n,s)=>n+(block.querySelector(s)?.getBoundingClientRect().height||0),0)+18;
  const available=desktop?grid.clientHeight-other:innerHeight-other-30,shown=true;
  let left=Math.min(leftWidth,Math.max(280,grid.clientWidth-360)),right=shown?Math.min(rightWidth||defaultRight(),Math.max(340,grid.clientWidth-left-220)):0;
  const width=Math.max(240,grid.clientWidth-left-20-(right?right+8:0));
  const size=Math.floor(Math.max(80,Math.min(width,available)));
  if(desktop){const spare=Math.max(0,grid.clientWidth-left-20-(right?right+8:0)-size);left+=spare;}
  grid.style.setProperty('--side-width',left+'px');grid.style.setProperty('--right-width',right+'px');grid.style.setProperty('--normal-board-size',size+'px');
  if(wrap.style.getPropertyValue('--fit-board-size')!==size+'px')wrap.style.setProperty('--fit-board-size',size+'px');
  positionHandles();
 }
 function schedule(){cancelAnimationFrame(frame);frame=requestAnimationFrame(fit);}
 const handles=[];
 function save(){try{localStorage.setItem('gokifu-panel-widths',JSON.stringify({left:leftWidth,right:rightWidth}));}catch{}}
 function positionHandles(){for(const h of handles){const target=document.querySelector(h.dataset.side==='left'?'#board-sidebar':'.inspector'),rect=target?.getBoundingClientRect(),show=innerWidth>=900&&!document.body.classList.contains('simple-mode')&&target?.getClientRects().length&&(h.dataset.side==='left'||innerWidth>1100&&!document.body.classList.contains('inspector-collapsed'));h.hidden=!show;if(show){h.style.left=(h.dataset.side==='left'?rect.right:rect.left-7)+'px';h.style.top=rect.top+'px';h.style.height=rect.height+'px';h.setAttribute('aria-valuenow',Math.round(rect.width));}}}
 function resize(side,value){if(side==='left')leftWidth=Math.max(280,Math.min(620,value));else rightWidth=Math.max(340,Math.min(800,value));fit();}
 function setup(){for(const side of ['left','right']){const h=document.createElement('div');h.className='panel-width-handle';h.dataset.side=side;h.tabIndex=0;h.role='separator';h.setAttribute('aria-orientation','vertical');h.setAttribute('aria-label',(side==='left'?'左':'右')+'パネルの幅');h.title='ドラッグで幅を調整／ダブルクリックで標準幅に戻す';document.body.append(h);handles.push(h);
 h.onpointerdown=e=>{if(e.button!==0)return;e.preventDefault();const start=e.clientX,initial=document.querySelector(side==='left'?'#board-sidebar':'.inspector').getBoundingClientRect().width;h.setPointerCapture(e.pointerId);h.classList.add('dragging');h.onpointermove=e=>resize(side,initial+(e.clientX-start)*(side==='left'?1:-1));const stop=()=>{h.onpointermove=null;h.classList.remove('dragging');save();};h.onpointerup=stop;h.onpointercancel=stop;};
 h.ondblclick=()=>{if(side==='left')leftWidth=330;else rightWidth=null;save();schedule();};h.onkeydown=e=>{if(!['ArrowLeft','ArrowRight','Home'].includes(e.key))return;e.preventDefault();if(e.key==='Home'){if(side==='left')leftWidth=330;else rightWidth=null;}else resize(side,(side==='left'?leftWidth:rightWidth||defaultRight())+(e.key==='ArrowRight'?10:-10)*(side==='left'?1:-1));save();schedule();};}schedule();}
 const ro=new ResizeObserver(schedule);[pane,grid].forEach(e=>ro.observe(e));
 window.addEventListener('resize',schedule);window.addEventListener('workspace-layout',schedule);window.addEventListener('kifu-position-change',schedule);document.fonts?.ready.then(schedule);document.addEventListener('DOMContentLoaded',setup);schedule();
})();
