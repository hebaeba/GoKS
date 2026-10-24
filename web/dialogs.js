/* Shared in-app confirmation. No native confirm/alert dialogs. */
(()=>{'use strict';let busy=false;const checks=[];
async function confirm(message,{title='確認',accept='続ける'}={}){
 if(busy)return false;busy=true;
 try{return await new Promise(resolve=>{const d=document.createElement('dialog');d.id='app-confirm-dialog';d.setAttribute('aria-labelledby','app-confirm-title');
 const h=document.createElement('h2');h.id='app-confirm-title';h.textContent=title;const p=document.createElement('p');p.textContent=message;
 const row=document.createElement('div');row.className='dialog-actions';const cancel=document.createElement('button'),ok=document.createElement('button');cancel.textContent='キャンセル';cancel.autofocus=true;ok.textContent=accept;cancel.onclick=()=>d.close('cancel');ok.onclick=()=>d.close('accept');row.append(cancel,ok);d.append(h,p,row);document.body.append(d);
 d.addEventListener('close',()=>{const result=d.returnValue==='accept';d.remove();resolve(result);},{once:true});d.showModal();});}finally{busy=false;}
}
let closing=false;
window.KifuDialogs={confirm,addExitCheck(fn){checks.push(fn)},async requestClose(){if(closing||busy)return;closing=true;try{if(checks.some(fn=>fn())&&!await confirm('保存していない棋譜・入力・解析結果、または進行中の処理があります。保存せずに終了しますか？',{title:'GoKifuStudioを終了',accept:'終了する'}))return;await window.__TAURI_INTERNALS__.invoke('desktop_close');}finally{closing=false;}}};
window.addEventListener('keydown',async e=>{
 if(!window.__TAURI_INTERNALS__||!(e.key==='F5'||((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='r')))return;
 e.preventDefault();if(busy||closing)return;
 if(checks.some(fn=>fn())&&!await confirm('保存していない変更や進行中の処理があります。画面を再読み込みしますか？',{title:'再読み込み',accept:'再読み込み'}))return;
 location.reload();
},true);
})();
