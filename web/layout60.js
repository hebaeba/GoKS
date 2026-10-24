(()=>{
 const pane=document.querySelector('.board-panel'),wrap=document.querySelector('.canvas-wrap'),canvas=document.getElementById('board'),grid=document.querySelector('.workspace');
 let frame;function fit(){
  if(document.body.classList.contains("simple-mode"))return;
  if(!matchMedia('(min-width:900px) and (pointer:fine)').matches){wrap.style.removeProperty('--fit-board-size');return;}
  const block=document.querySelector('.board-block'),controls=document.querySelector('.controls');
  const other=block.getBoundingClientRect().height-canvas.getBoundingClientRect().height+controls.getBoundingClientRect().height+6;
  const size=Math.floor(Math.max(240,Math.min(block.clientWidth-12,grid.clientHeight-other-2)));
  if(wrap.style.getPropertyValue('--fit-board-size')!==size+'px')wrap.style.setProperty('--fit-board-size',size+'px');
 }
 function schedule(){cancelAnimationFrame(frame);frame=requestAnimationFrame(fit);}
 const ro=new ResizeObserver(schedule);[pane,grid,document.querySelector('.controls'),document.querySelector('#comment-area')].forEach(e=>e&&ro.observe(e));
 window.addEventListener('resize',schedule);window.addEventListener('kifu-position-change',schedule);document.fonts?.ready.then(schedule);schedule();
})();
