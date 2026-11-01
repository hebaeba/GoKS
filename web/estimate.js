/* Estimates use the analysis engine, never a playing engine's mixed history. */
(()=>{'use strict';
const $=id=>document.getElementById(id);let loaded=false,busy=false,revision=0,epoch=0,popup=null,channel=null,nativeOpen=false;
let value=null,message='',positionKey='';
const button=document.createElement('button');button.id='estimate-open';button.textContent='推定値';button.title='解析用エンジンで現在局面を推定します。対局中は双方の思考を停止して中断します';$('score').after(button);
function enabled(){return loaded||['playing','paused','finished'].includes(window.KifuMatch?.phase);}
function canScore(){try{return KifuEstimateCore.canScore(IndependentGo.peekAnalysisSnapshot(),GoSgf,window.KifuMatch?.phase,loaded);}catch{return false;}}
function data(){const snap=IndependentGo.peekAnalysisSnapshot();return {revision:++revision,enabled:enabled(),phase:KifuMatch.phase,currentMove:KifuAnalysis.positionAt(snap).state.move,options:[{color:'analysis',name:KifuAnalysisControl.runningName()}],values:value?{analysis:value}:{},message,busy};}
function publish(){const state=data();KifuAuxiliary.updateEstimate(state);if(popup&&!popup.closed)channel?.postMessage({type:'state',data:state});}
function sync(){button.disabled=!enabled()||busy||document.body.classList.contains('scoring-mode');$('score').disabled=!canScore();if($('match-score'))$('match-score').disabled=$('score').disabled;publish();}
async function openWindow(){
 if(KifuAuxiliary.available()){nativeOpen=true;await KifuAuxiliary.openEstimate(data());return;}
 if(popup&&!popup.closed){popup.focus();publish();return;}
 channel?.close();const id=crypto.randomUUID();channel=new BroadcastChannel('kifu-estimate-'+id);
 channel.onmessage=e=>{if(e.data?.type==='ready')publish();if(e.data?.type==='closed')cancel();};
 popup=window.open('estimate.html?channel='+id,'estimate-'+id,'popup,width=760,height=840,resizable=yes,scrollbars=yes');
 if(!popup)throw Error('別窓を開けません。ポップアップを許可してください。');
}
function cancel(){epoch++;busy=false;KifuAnalysisControl.stopEstimate().catch(()=>{});window.dispatchEvent(new Event('kifu-estimate-state'));}
async function estimate(){
 if(!enabled()||busy)return;
 const token=++epoch;busy=true;window.dispatchEvent(new Event('kifu-estimate-state'));value=null;message='対局の思考を停止しています…';sync();
 try{
  await KifuMatch.pauseForEstimate();if(token!==epoch)return;
  const snapshot=IndependentGo.peekAnalysisSnapshot();positionKey=JSON.stringify([KifuAnalysis.identity(snapshot),snapshot.index]);const state=KifuAnalysis.positionAt(snapshot).state;
  message='解析用エンジンで推定しています…';await openWindow();sync();
  await KifuAnalysisControl.estimate(snapshot,result=>{
   if(token!==epoch)return;
   value={size:snapshot.size,board:Array.from(state.board),last:state.last?.point??null,move:state.move,komi:snapshot.komi,name:KifuAnalysisControl.runningName(),ownership:result.ownership,scoreLead:result.rootInfo.scoreLead};
   message='推定中…';publish();
  });
  if(token===epoch){message='推定完了'+(KifuMatch.phase==='paused'?'。対局は中断中です。「再開」で続けられます。':'');}
 }catch(error){if(token===epoch){message=error.message||String(error);if(!nativeOpen&&(!popup||popup.closed))await KifuDialogs.confirm(message,{accept:'閉じる'});}}
 finally{if(token===epoch){busy=false;window.dispatchEvent(new Event('kifu-estimate-state'));sync();}}
}
button.onclick=estimate;
window.KifuEstimate={canScore,requested:()=>false,accept(){},get busy(){return busy;}};
window.addEventListener('kifu-aux',e=>{if(e.detail.kind==='estimate'&&e.detail.type==='closed'){nativeOpen=false;cancel();sync();}});
window.addEventListener('kifu-match-state',sync);
window.addEventListener('kifu-match-start',()=>{loaded=false;cancel();value=null;message='局面が変わりました。推定値ボタンで再計算してください。';sync();});
window.addEventListener('kifu-record-replaced',e=>{loaded=e.detail?.source==='load';cancel();value=null;message='棋譜が変わりました。推定値ボタンで計算してください。';sync();});
window.addEventListener('kifu-position-change',()=>{if((value||busy)&&JSON.stringify([KifuAnalysis.identity(IndependentGo.peekAnalysisSnapshot()),IndependentGo.peekAnalysisSnapshot().index])!==positionKey){cancel();value=null;message='局面が変わりました。推定値ボタンで再計算してください。';}sync();});
window.addEventListener('pagehide',()=>{cancel();popup?.close();channel?.close();});sync();
})();
