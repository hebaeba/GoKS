/* Pure elapsed-time accounting. The match, never the display window, owns clocks. */
(function(root){'use strict';
const finite=(x,min,max)=>Number.isFinite(x)&&x>=min&&x<=max;
function create(minutes,periods,seconds){
 if(!finite(minutes,0,1440)||!Number.isInteger(periods)||!finite(periods,0,99)||!finite(seconds,1,600)||(minutes===0&&periods===0))throw Error('Invalid clock settings');
 return {system:'byoyomi',main:minutes*60000,periods,periodMs:seconds*1000,left:seconds*1000,expired:false,spent:0};
}
function createSystem(system,options){
 const {minutes,increment=5,blockMinutes=10,moves=15,periods=5,seconds=30}=options;
 if(system==='byoyomi')return create(minutes,periods,seconds);
 if(!['absolute','fischer','canadian'].includes(system)||!finite(minutes,system==='canadian'?0:0.01,1440))throw Error('Invalid clock settings');
 if(system==='fischer'&&!finite(increment,0,600))throw Error('Invalid increment');
 if(system==='canadian'&&(!finite(blockMinutes,0.01,1440)||!Number.isInteger(moves)||!finite(moves,1,999)))throw Error('Invalid Canadian settings');
 return {system,main:minutes*60000,left:system==='canadian'?blockMinutes*60000:0,blockMs:blockMinutes*60000,movesLeft:moves,quota:moves,incrementMs:increment*1000,expired:false,spent:0};
}
function spend(c,elapsed){
 if(c.expired)return c;let dt=Math.max(0,elapsed);c.spent=(c.spent||0)+dt;
 if(c.system==='absolute'||c.system==='fischer'){c.main=Math.max(0,c.main-dt);if(!c.main)c.expired=true;return c;}
 if(c.main>0){const used=Math.min(c.main,dt);c.main-=used;dt-=used;if(c.main>0)return c;}
 if(c.system==='canadian'){c.left=Math.max(0,c.left-dt);if(!c.left)c.expired=true;return c;}
 if(c.periods===0){c.expired=true;c.left=0;return c;}
 while(dt>=c.left){dt-=c.left;c.periods--;if(!c.periods){c.expired=true;c.left=0;return c;}c.left=c.periodMs;}
 c.left-=dt;return c;
}
function played(c){
 if(c.expired)return;
 if(c.system==='fischer'){c.main+=c.incrementMs;return;}
 if(c.system==='canadian'){if(c.main===0&&--c.movesLeft===0){c.left=c.blockMs;c.movesLeft=c.quota;}return;}
 if(c.system!=='absolute'&&c.main===0&&c.periods)c.left=c.periodMs;
}
// Discard bonuses/quota progress from undone moves, without refunding thinking time.
function rewind(current,before){
 if(!before||!['fischer','canadian'].includes(current.system))return current;
 const restored={...before};spend(restored,Math.max(0,(current.spent||0)-(before.spent||0)));return restored;
}
const api={create,createSystem,spend,played,rewind};if(typeof module==='object'&&module.exports)module.exports=api;else root.KifuClockCore=api;
})(globalThis);
