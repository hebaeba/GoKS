/* Match policy and standard SGF serialization; values from GTP use BLACK perspective. */
(function(root){'use strict';
function parseMove(text){let evaluation=null,move=null;for(const line of text.trim().split(/\r?\n/)){const m=/^play\s+(pass|resign|[A-HJ-Z]\d{1,2})\s*$/i.exec(line);if(m)move=m[1];if(/^(info |rootInfo )/.test(line)){const part=line.includes('rootInfo ')?line.slice(line.indexOf('rootInfo ')):line.split(/\s+info /)[0];const number=k=>{const x=new RegExp('(?:^|\\s)'+k+'\\s+([-+0-9.eE]+)').exec(part);return x?Number(x[1]):NaN;};const winrate=number('winrate'),scoreLead=number('scoreLead');if(Number.isFinite(winrate)&&winrate>=0&&winrate<=1&&Number.isFinite(scoreLead))evaluation={winrate,scoreLead};}}
 if(!move)throw Error('KataGoから着手を取得できませんでした。');return {move,evaluation};}
function view(e,color){return {winrate:color==='W'?1-e.winrate:e.winrate,scoreLead:color==='W'?-e.scoreLead:e.scoreLead};}
function streak(previous,e,color,threshold){return e&&view(e,color).winrate<=threshold+1e-12?previous+1:0;}
function sgf(snapshot,S){const parsed=S.parse(snapshot.sgf);let node=parsed.root;const first={props:{...node.props,CA:['UTF-8']},children:[]};let tail=first;for(let i=0;i<snapshot.index;i++){node=node.children[snapshot.path[i]];if(!node)throw Error('対局の経路が不正です');const copy={props:{...node.props},children:[]};tail.children=[copy];tail=copy;}return S.write(first);}
const api={parseMove,view,streak,sgf};if(typeof module!=='undefined')module.exports=api;else root.KifuMatchCore=api;
})(globalThis);
