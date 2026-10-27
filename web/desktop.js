/* Optional desktop hosting and LAN client adapter. No network listener by default. */
(()=>{'use strict';
const native=()=>window.__TAURI_INTERNALS__?.invoke,remote=!!document.querySelector('meta[name="kifu-remote"]');
if(remote){let token=new URLSearchParams(location.hash.slice(1)).get('token');if(token){sessionStorage.setItem('kifu-lan-token',token);history.replaceState(null,'',location.pathname);}token||=sessionStorage.getItem('kifu-lan-token');let client=sessionStorage.getItem('kifu-lan-client');if(!client){client=Array.from(crypto.getRandomValues(new Uint8Array(16)),v=>v.toString(16).padStart(2,'0')).join('');sessionStorage.setItem('kifu-lan-client',client);}
window.KifuRemote={async call(action,payload={}){if(!token)throw Error('PCに表示した専用URLから開いてください。');const res=await fetch('/api/engine',{method:'POST',headers:{'Content-Type':'application/json','X-Kifu-Token':token,'X-Kifu-Client':client},body:JSON.stringify({action,payload}),keepalive:action==='stop'});if(!res.ok&&res.status===403)throw Error('接続URLが無効です。PCで共有を再開してください。');const data=await res.json();if(!data.ok)throw Error(data.error||'接続エラー');return data.result;}};
}
window.addEventListener('DOMContentLoaded',()=>{
 const pane=document.getElementById('pane-analysis');if(!pane)return;
 if(remote){const hint=document.createElement('p');hint.className='analysis-warning';hint.textContent='スマホ接続の連続解析は60秒ごとに更新します。スマホ接続：PCで指定したエンジンを使います。同じWi-Fi内で、PCのアプリを開いたまま使用してください。';pane.prepend(hint);document.getElementById('engine-settings').hidden=true;document.getElementById('engine-connect').textContent='PCのエンジンに接続';document.getElementById('engine-disconnect').textContent='切断';document.getElementById('analysis-custom').max='60';return;}
 // PC-only edition: the LAN sharing UI is no longer offered.

});
})();
