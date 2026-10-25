/* Shared shortcut guard: protect text/value entry, not board controls. */
(()=>{'use strict';
 function blocksShortcuts(target){
  if(!target)return false;
  if(target.isContentEditable||target.closest?.('textarea,select,[contenteditable="true"],dialog'))return true;
  if(target.tagName==='INPUT')return !['checkbox','radio','range','button','submit','reset'].includes(target.type);
  return false;
 }
 window.KifuInteraction={blocksShortcuts,blocksAnalysisSpace:blocksShortcuts};
 document.addEventListener('pointerdown',()=>document.body.classList.add('pointer-focus'),true);
 document.addEventListener('change',e=>{if(e.target.matches?.('select')&&document.body.classList.contains('pointer-focus'))e.target.blur();});
 document.addEventListener('keydown',e=>{if(e.key==='Tab'||e.key.startsWith('Arrow'))document.body.classList.remove('pointer-focus');},true);
})();
