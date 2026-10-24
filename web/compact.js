/* Compact presentation; existing controls and event handlers are preserved. */
(()=>{'use strict';const $=id=>document.getElementById(id),q=s=>document.querySelector(s);
function info(label,nodes,parent){const d=document.createElement('details');d.className='compact-info';const s=document.createElement('summary');s.textContent='ⓘ';s.title=label;s.setAttribute('aria-label',label);d.append(s);const content=document.createElement('div');content.className='compact-info-content';d.append(content);for(const n of nodes.filter(Boolean))content.append(n);parent.append(d);return d;}
function row(className){const x=document.createElement('div');x.className=className;return x;}
// Side-by-side ranking, with one shared heading and bounded list height.
const rank=$('analysis-worst'),rh=row('compact-heading');rank.prepend(rh);rh.append(rank.querySelector('h3'),q('.worst-metric'));q('.worst-metric').firstChild.textContent='';$('worst-metric').setAttribute('aria-label','ワーストランキングの順位基準');info('順位の基準と評価の注意',[$('worst-note')],rh);
const ranks=row('compact-rank-columns');rank.append(ranks);rank.querySelectorAll('.worst-side').forEach(n=>{ranks.append(n);n.querySelector('h4').textContent=n.querySelector('h4').textContent.includes('黒')?'● 黒':'○ 白';});
// The full-game start action remains visible beside its time setting.
const batch=$('analysis-batch'),bh=row('compact-heading');batch.prepend(bh);bh.append(batch.querySelector('h3'),q('.analysis-batch-settings'),$('analysis-metric'));$('analysis-metric').title='グラフに表示する評価';info('全局解析の対象と時間設定',[...batch.querySelectorAll(':scope > p')],bh);q('.analysis-graph-heading').hidden=true;
const details=document.createElement('details');details.id='compact-analysis-details';details.innerHTML='<summary>解析の詳細</summary>';details.append($('analysis-run-info'));$('analysis-worst').after(details);
const files=q('.analysis-files'),saveNote=files.nextElementSibling;$('batch-progress').after(files);info('解析結果の保存について',saveNote?.matches('p.analysis-note')?[saveNote]:[],files);
const summary=$('candidate-list').querySelector('summary');info('候補手の色と実戦手の表示',[q('.analysis-legend')],q('.analysis-primary'));
// Explanations stay available by click/tap, not only hover.
info('候補手の表示設定について',[...$('candidate-settings').querySelectorAll(':scope > p.analysis-note')],$('candidate-settings'));
const candidateDetail=document.createElement('details');candidateDetail.className='compact-explanation';candidateDetail.innerHTML='<summary>読み筋・表示の詳細</summary>';candidateDetail.append($('candidate-count-note'),$('analysis-pv'));q('.candidate-block').append(candidateDetail);
const setting=$('engine-settings');info('エンジンの設定について',[...setting.querySelectorAll(':scope > p.analysis-note'),q('.engine-running-details')?.nextElementSibling].filter(n=>n?.matches('.analysis-note')),setting);
for(const kind of ['exe','model','config']){const input=$('engine-'+kind),label=setting.querySelector('label[for="'+input.id+'"]'),line=input.closest('.engine-path-row');if(label){label.textContent={exe:'エンジン',model:'モデル',config:'設定CFG'}[kind];line.prepend(label);}$('engine-pick-'+kind).textContent='…';$('engine-pick-'+kind).setAttribute('aria-label',{exe:'エンジン',model:'モデル',config:'設定ファイル'}[kind]+'を端末内から選択');}
const toolHelp=document.createElement('div');for(const n of document.querySelectorAll('.tool-description')){const b=n.closest('button');if(b&&!b.title)b.title=n.textContent;const p=document.createElement('p');p.textContent=(b?.querySelector('span')?.textContent||'')+'：'+n.textContent;toolHelp.append(p);n.hidden=true;}info('ツールの操作とドラッグ対応',[toolHelp],$('pane-tools'));
const jump=q('.jump'),position=q('.position-settings');const placeJump=()=>{(matchMedia('(min-width:1100px)').matches?q('.navigation'):position).append(jump);};window.addEventListener('resize',placeJump);placeJump();
// Short labels leave descriptive names available on hover and for accessibility.
const pv=$('analysis-pv-length').closest('label');pv.firstChild.textContent='読み筋 ';$('analysis-pv-length').setAttribute('aria-label','読み筋の表示手数');
document.querySelectorAll('.compact-info').forEach(d=>d.addEventListener('toggle',()=>{if(d.open)document.querySelectorAll('.compact-info[open]').forEach(other=>{if(other!==d&&!other.contains(d))other.open=false;});}));
document.addEventListener('keydown',e=>{if(e.key==='Escape')document.querySelectorAll('.compact-info[open]').forEach(d=>d.open=false);});
})();
