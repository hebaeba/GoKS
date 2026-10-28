/* Match policy and standard SGF serialization; values from GTP use BLACK perspective. */
(function(root){'use strict';
function parseMove(text){let evaluation=null,move=null;for(const line of text.trim().split(/\r?\n/)){const m=/^play\s+(pass|resign|[A-HJ-Z]\d{1,2})\s*$/i.exec(line);if(m)move=m[1];if(/^(info |rootInfo )/.test(line)){const part=line.includes('rootInfo ')?line.slice(line.indexOf('rootInfo ')):line.split(/\s+info /)[0];const number=k=>{const x=new RegExp('(?:^|\\s)'+k+'\\s+([-+0-9.eE]+)').exec(part);return x?Number(x[1]):NaN;};const winrate=number('winrate'),scoreLead=number('scoreLead');if(Number.isFinite(winrate)&&winrate>=0&&winrate<=1&&Number.isFinite(scoreLead))evaluation={winrate,scoreLead};}}
 if(!move)throw Error('KataGoから着手を取得できませんでした。');return {move,evaluation};}
function view(e,color){return {winrate:color==='W'?1-e.winrate:e.winrate,scoreLead:color==='W'?-e.scoreLead:e.scoreLead};}
function streak(previous,e,color,threshold){return e&&view(e,color).winrate<=threshold+1e-12?previous+1:0;}
function sgf(snapshot,S){const parsed=S.parse(snapshot.sgf);let node=parsed.root;const first={props:{...node.props,CA:['UTF-8']},children:[]};let tail=first;for(let i=0;i<snapshot.index;i++){node=node.children[snapshot.path[i]];if(!node)throw Error('対局の経路が不正です');const copy={props:{...node.props},children:[]};tail.children=[copy];tail=copy;}return S.write(first);}
const UNLIMITED_VISITS=1125899906842624; // KataGo default: 2^50, used when cfg omits the limit.
function limits(seconds,visits=0){
 if(!Number.isFinite(seconds)||seconds<0||(seconds!==0&&seconds<0.1))throw Error('時間は0.1秒以上で入力するか、無制限を選んでください。');
 if(!Number.isSafeInteger(visits)||visits<0||visits>1000000000)throw Error('訪問数は1〜1000000000の整数で入力してください。');
 // GTP: positive overtime with zero stones disables the clock; 0 0 0 means zero absolute time.
 // Keep time/visit limits in search parameters, independently of the GTP game clock.
 return ['time_settings 0 1 0','kata-set-param maxVisits '+(visits===0?UNLIMITED_VISITS:visits),'kata-set-param maxPlayouts '+UNLIMITED_VISITS,'kata-set-param maxTime '+(seconds===0?1e20:seconds)];
}
function resignationStreak(previous,e,color,policy,nextMove){
 return nextMove<=policy.minMoves?0:streak(previous,e,color,policy.threshold);
}
function engineSettings(policy,seconds,visits,size){
 const o={allowResignation:policy.handicap?policy.allowHandicap:policy.enabled,maxTime:seconds||1e20,maxVisits:visits||UNLIMITED_VISITS,maxPlayouts:UNLIMITED_VISITS,resignMinMovesPerBoardArea:0};
 if(!policy.handicap){o.resignThreshold=2*policy.threshold-1;o.resignConsecTurns=policy.turns;}
 // The GUI gates allowResignation by actual played moves. KataGo retains its own handicap guard.
 return o;
}
const api={engineSettings,UNLIMITED_VISITS,limits,parseMove,view,streak,resignationStreak,sgf};if(typeof module!=='undefined')module.exports=api;else root.KifuMatchCore=api;
})(globalThis);
