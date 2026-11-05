/* Japanese byo-yomi. Pure elapsed-time accounting shared by tests and the match. */
(function(root){'use strict';
function create(minutes,periods,seconds){
 if(!Number.isFinite(minutes)||minutes<0||minutes>1440||!Number.isInteger(periods)||periods<0||periods>99||!Number.isFinite(seconds)||seconds<1||seconds>600||(minutes===0&&periods===0))throw Error('Invalid clock settings');
 return {main:minutes*60000,periods,periodMs:seconds*1000,left:seconds*1000,expired:false};
}
function spend(c,elapsed){
 if(c.expired)return c;let dt=Math.max(0,elapsed);
 if(c.main>0){const used=Math.min(c.main,dt);c.main-=used;dt-=used;if(c.main>0)return c;}
 if(c.periods===0){c.expired=true;c.left=0;return c;}
 while(dt>=c.left){dt-=c.left;c.periods--;if(!c.periods){c.expired=true;c.left=0;return c;}c.left=c.periodMs;}
 c.left-=dt;return c;
}
function played(c){if(!c.expired&&c.main===0&&c.periods)c.left=c.periodMs;}
const api={create,spend,played};if(typeof module==='object'&&module.exports)module.exports=api;else root.KifuClockCore=api;
})(globalThis);
