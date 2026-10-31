/* Live match deltas are provisional: opposing engines can disagree. */
(()=>{'use strict';
 const $=id=>document.getElementById(id),panel=document.createElement('details');panel.id='match-ranking';
 panel.innerHTML='<summary title="対局中の着手前後の評価差です。AI同士では異なるAIの評価差を含みます。確定的な悪手判定には対局後の全局解析を使ってください。">目数／勝率低下ランキング（暫定）</summary><div class="match-ranking-sort"><label>並び順 <select id="match-ranking-metric"><option value="winrate">勝率低下</option><option value="score">目数低下</option></select></label></div><div class="match-ranking-columns"></div>';
 $('match-sgf').closest('details').before(panel);
 const tables={};for(const color of ['B','W']){const table=document.createElement('table');table.innerHTML='<caption>'+(color==='B'?'● 黒':'○ 白')+'</caption><thead><tr><th>順位</th><th>手数</th><th>目数</th><th>勝率</th></tr></thead><tbody></tbody>';tables[color]=table.querySelector('tbody');panel.querySelector('.match-ranking-columns').append(table);}
 let entries=new Map();
 function keys(s){let node=GoSgf.parse(s.sgf).root;const pick=p=>Object.fromEntries(Object.entries(p).filter(([k])=>['SZ','KM','HA','RU','B','W','AB','AW','AE','PL','KO','XIGFORCE','XIGPENDING'].includes(k)));const history=[pick(node.props)],out=[JSON.stringify(history)];for(const c of s.path){node=node.children[c];if(!node)break;history.push(pick(node.props));out.push(JSON.stringify(history));}return out;}
 function render(){const snapshot=IndependentGo.peekAnalysisSnapshot(),items=keys(snapshot).flatMap((key,index)=>entries.has(key)?[{...entries.get(key),index}]:[]),metric=$('match-ranking-metric').value,rows=KifuAnalysis.worstMoves(snapshot,items,metric);
 for(const color of ['B','W']){const body=tables[color];body.replaceChildren();for(const [rank,r] of rows.filter(r=>r.color===color).entries()){const tr=document.createElement('tr');for(const value of [String(rank+1)+'.',String(r.move),r.loss.toFixed(1),r.winrateLoss.toFixed(1)]){const td=document.createElement('td');td.textContent=value;tr.append(td);}body.append(tr);}if(!body.children.length){const tr=document.createElement('tr'),td=document.createElement('td');td.colSpan=4;td.textContent='評価待ち';tr.append(td);body.append(tr);}}
 }
 window.addEventListener('kifu-match-start',()=>{entries.clear();panel.open=false;render();});
 window.addEventListener('kifu-match-ready',()=>{panel.open=true;render();});
 window.addEventListener('kifu-match-evaluation',e=>{const {snapshot,index,move,result}=e.detail,key=keys(snapshot)[index];if(key)entries.set(key,{index,move,result});render();});
 window.addEventListener('kifu-position-change',render);
 window.addEventListener('kifu-record-replaced',()=>{entries.clear();panel.open=false;render();});
 $('match-ranking-metric').onchange=render;render();
})();
