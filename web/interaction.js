/* Space is a global analysis command except during text/value entry. */
(()=>{'use strict';
 function blocksAnalysisSpace(target){
  if(!target)return false;
  if(target.isContentEditable||target.closest?.('textarea,select,[contenteditable="true"],dialog'))return true;
  if(target.tagName==='INPUT')return !['checkbox','radio','range','button','submit','reset'].includes(target.type);
  return false;
 }
 window.KifuInteraction={blocksAnalysisSpace};
 document.addEventListener('pointerdown',()=>document.body.classList.add('pointer-focus'),true);
 document.addEventListener('keydown',e=>{if(e.key==='Tab'||e.key.startsWith('Arrow'))document.body.classList.remove('pointer-focus');},true);
})();
