/* Match-only estimate display; never sends extra searches to the playing engines. */
(()=>{'use strict';
const $=id=>document.getElementById(id),values={};let timer=null,popup=null,channel=null,nativeOpen=false,revision=0,loadedRecord=false;
const button=document.createElement('button');button.id='estimate-open';button.textContent='推定値';button.disabled=true;button.title='対局中のAIが推定した黒白の領域を別窓で表示します';$('score').after(button);
function enabled(){return ['playing','paused'].includes(window.KifuMatch?.phase)&&Object.values(KifuMatch.players||{}).some(p=>!p.human);}
function data(){const snap=IndependentGo.peekAnalysisSnapshot();return {revision:++revision,enabled:enabled(),phase:KifuMatch.phase,currentMove:KifuAnalysis.positionAt(snap).state.move,options:Object.entries(KifuMatch.players||{}).filter(([,p])=>!p.human).map(([color,p])=>({color,name:p.name})),values:enabled()?values:{}};}
function canScore(){try{return KifuEstimateCore.canScore(IndependentGo.peekAnalysisSnapshot(),GoSgf,window.KifuMatch?.phase,loadedRecord);}catch{return false;}}
function publish(){timer=null;const state=data();KifuAuxiliary.updateEstimate(state);if(popup&&!popup.closed)channel?.postMessage({type:'state',data:state});}
function sync(){button.disabled=!enabled();$('score').disabled=!canScore();if($('match-score'))$('match-score').disabled=$('score').disabled;clearTimeout(timer);timer=setTimeout(publish,0);}
function clear(){delete values.B;delete values.W;sync();}
button.onclick=async()=>{if(!enabled())return;try{if(KifuAuxiliary.available()){nativeOpen=true;await KifuAuxiliary.openEstimate(data());return;}if(popup&&!popup.closed){popup.focus();publish();return;}channel?.close();const id=crypto.randomUUID();channel=new BroadcastChannel('kifu-estimate-'+id);channel.onmessage=e=>{if(e.data?.type==='ready')publish();};popup=window.open('estimate.html?channel='+encodeURIComponent(id),'estimate-'+id,'popup,width=760,height=840,resizable=yes,scrollbars=yes');if(!popup)throw Error('別窓を開けませんでした。ポップアップを許可してください。');}catch(e){nativeOpen=false;await KifuDialogs.confirm(e.message||String(e),{accept:'閉じる'});}};
window.addEventListener('kifu-aux',e=>{if(e.detail.kind==='estimate'&&e.detail.type==='closed')nativeOpen=false;});
window.KifuEstimate={canScore,requested:()=>nativeOpen||!!(popup&&!popup.closed),accept(context,line){if(!enabled()||context.token!==KifuMatch.epoch)return;const parsed=KifuEstimateCore.parse(line,context.snapshot.size);if(!parsed)return;const s=KifuAnalysis.positionAt(context.snapshot).state;values[context.color]={...parsed,size:context.snapshot.size,board:Array.from(s.board),move:s.move,last:s.last?.point??null,name:context.name,komi:context.snapshot.komi};if(!timer)timer=setTimeout(publish,150);}};
window.addEventListener('kifu-match-state',sync);window.addEventListener('kifu-match-start',()=>{loadedRecord=false;clear();});window.addEventListener('kifu-match-takeback',clear);window.addEventListener('kifu-record-replaced',e=>{loadedRecord=e.detail?.source==='load';clear();});
window.addEventListener('kifu-position-change',()=>{const move=KifuAnalysis.positionAt(IndependentGo.peekAnalysisSnapshot()).state.move;if(Object.values(values).some(v=>v.move>move)){delete values.B;delete values.W;}sync();});
window.addEventListener('pagehide',()=>{clearTimeout(timer);popup?.close();channel?.close();});sync();
})();
