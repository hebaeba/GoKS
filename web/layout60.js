/* Update121: nonresizable side panels. The square board alone fits the available PC window. */
(()=>{'use strict';
 const pane=document.querySelector('.board-panel'),wrap=document.querySelector('.canvas-wrap'),grid=document.querySelector('.workspace');
 const LEFT_WIDTH=400,RIGHT_WIDTH=500;
 let frame;
 function fit(){
  if(document.body.classList.contains('simple-mode'))return;
  if(!grid.clientWidth||!grid.clientHeight)return;
  const block=document.querySelector('.board-block');
  const other=['.board-heading','#normal-info','#normal-slider'].reduce((n,s)=>n+(block.querySelector(s)?.getBoundingClientRect().height||0),0)+18;
  const available=Math.max(80,grid.clientHeight-other);
  // Never modify panel widths to consume spare pixels: it can create line wraps
  // and feedback loops when the native window is resized during a mode change.
  const horizontal=Math.max(80,grid.clientWidth-LEFT_WIDTH-RIGHT_WIDTH-28);
  const size=Math.floor(Math.max(80,Math.min(horizontal,available)));
  grid.style.setProperty('--side-width',LEFT_WIDTH+'px');
  grid.style.setProperty('--right-width',RIGHT_WIDTH+'px');
  grid.style.setProperty('--normal-board-size',size+'px');
  if(wrap.style.getPropertyValue('--fit-board-size')!==size+'px')wrap.style.setProperty('--fit-board-size',size+'px');
 }
 function schedule(){cancelAnimationFrame(frame);frame=requestAnimationFrame(fit);}
 const ro=new ResizeObserver(schedule);[pane,grid].forEach(e=>ro.observe(e));
 window.KifuLayout={fit};window.addEventListener('resize',fit);window.addEventListener('workspace-layout',fit);window.addEventListener('kifu-position-change',schedule);
 document.fonts?.ready.then(schedule);schedule();
})();
