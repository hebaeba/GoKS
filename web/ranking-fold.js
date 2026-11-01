/* Shared display limit; complete rankings remain available and exportable. */
(()=>{'use strict';
const states=new WeakMap();let serial=0;
function apply(body){
 let state=states.get(body);
 if(!state){const button=document.createElement('button');button.type='button';button.className='ranking-more';
 if(!body.id)body.id='ranking-rows-'+(++serial);button.setAttribute('aria-controls',body.id);
 state={button,expanded:false};states.set(body,state);body.closest('table').after(button);
 button.onclick=()=>{state.expanded=!state.expanded;apply(body);};
 }
 const count=body.rows.length;
 state.button.hidden=count<=10;
 state.button.textContent=state.expanded?'11位以下を畳む':'11位以下を表示（'+Math.max(0,count-10)+'件）';
 state.button.setAttribute('aria-expanded',String(state.expanded));
 [...body.rows].forEach((row,i)=>row.hidden=i>=10&&!state.expanded);
}
window.KifuRanking={apply};
})();
