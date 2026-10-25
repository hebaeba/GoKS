(()=>{
 const pane=document.querySelector('.board-panel'),wrap=document.querySelector('.canvas-wrap'),grid=document.querySelector('.workspace');
 let frame;function fit(){
  if(document.body.classList.contains('simple-mode'))return;
  const block=document.querySelector('.board-block'),desktop=matchMedia('(min-width:900px) and (pointer:fine)').matches;
  const other=['.board-heading','#normal-info','#normal-slider'].reduce((n,s)=>n+(block.querySelector(s)?.getBoundingClientRect().height||0),0)+18;
  const available=desktop?grid.clientHeight-other:innerHeight-other-30;
  const size=Math.floor(Math.max(160,Math.min(block.clientWidth-12,available)));
  if(wrap.style.getPropertyValue('--fit-board-size')!==size+'px')wrap.style.setProperty('--fit-board-size',size+'px');
 }
 function schedule(){cancelAnimationFrame(frame);frame=requestAnimationFrame(fit);}
 const ro=new ResizeObserver(schedule);[pane,grid].forEach(e=>ro.observe(e));
 window.addEventListener('resize',schedule);window.addEventListener('workspace-layout',schedule);window.addEventListener('kifu-position-change',schedule);document.fonts?.ready.then(schedule);schedule();
})();
