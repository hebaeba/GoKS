/* Select width follows the displayed text, not the longest option or a flex row.
   Keep 3px padding plus an explicit 18px affordance for the dropdown arrow. */
(()=>{'use strict';
 const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');
 function sync(){
  const komi=document.getElementById('komi-input');if(komi){const value=komi.value||'0';komi.style.setProperty('--komi-number-ch',Math.max(3.5,value.length-(value.includes('.')?0.5:0)));}
  document.querySelectorAll('#jump,#gif-start,#gif-end').forEach(el=>el.style.setProperty('--number-ch',Math.max(3,String(el.value||'').length)));
  document.querySelectorAll('select:not([multiple]):not([size])').forEach(el=>{
   const s=getComputedStyle(el);ctx.font=s.font || (s.fontSize+' '+s.fontFamily);
   const text=el.selectedOptions[0]?.textContent||'';
   el.style.setProperty('--field-text-width',Math.ceil(ctx.measureText(text).width+1)+'px');
  });
 }
 let frame;function schedule(){cancelAnimationFrame(frame);frame=requestAnimationFrame(sync);}
 document.addEventListener('change',schedule);document.addEventListener('input',schedule);window.addEventListener('kifu-position-change',schedule);
 window.addEventListener('resize',schedule);
 window.addEventListener('DOMContentLoaded',schedule);
 new MutationObserver(schedule).observe(document.documentElement,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['selected','hidden','open']});
 document.fonts?.ready.then(schedule);
 schedule();
})();
