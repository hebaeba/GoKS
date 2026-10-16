/* KataGo protocol mapping and portable analysis records. MIT, 2026 Eba. */
(function(global){'use strict';
const R=typeof module!=='undefined'?require('./engine.js'):global.GoRules;
const S=typeof module!=='undefined'?require('./sgf.js'):global.GoSgf;
const letters='ABCDEFGHJKLMNOPQRST';
function gtp(p,size){return p===null?'pass':letters[p%size]+(size-Math.floor(p/size));}
function point(move,size){if(/^pass$/i.test(move))return null;const m=/^([A-HJ-T])(\d{1,2})$/.exec(move);if(!m)throw Error('候補手の座標が不正です');const x=letters.indexOf(m[1]),y=size-Number(m[2]);if(x<0||x>=size||y<0||y>=size)throw Error('候補手が盤外です');return y*size+x;}
// Prefix identities exclude sibling variations: adding a variation preserves shared results.
function positionKeys(snapshot){
 let node=S.parse(snapshot.sgf).root;const props=[node.props],keys=[JSON.stringify([snapshot.size,snapshot.komi,props])];
 for(const choice of snapshot.path){node=node.children[choice];if(!node)throw Error('変化の経路が不正です');props.push(node.props);keys.push(JSON.stringify([snapshot.size,snapshot.komi,props]));}
 return keys;
}
function rebaseResults(previous,next,results){
 const oldKeys=positionKeys(previous),newKeys=positionKeys(next),byKey=new Map([...results].map(([i,v])=>[oldKeys[i],v]));
 return new Map(newKeys.flatMap((key,i)=>byKey.has(key)?[[i,{...byKey.get(key),index:i}]]:[]));
}
function identity(snapshot){return JSON.stringify([snapshot.sgf,snapshot.path]);}
function effectiveRules(ru){const s=String(ru||'').toLowerCase();if(/japan|日本/.test(s))return 'japanese';if(/chinese|中国/.test(s))return 'chinese';if(!s)return null;return null;}
function stones(state){return state.board.flatMap((c,p)=>c?[[c===1?'B':'W',gtp(p,state.size)]]:[]);}
function plan(snapshot,rules,visits,all){
 const options=typeof visits==='object'&&visits?visits:null,infinite=options?.infinite===true,pvLength=options?.pvLength??20;
 if(!Number.isInteger(pvLength)||pvLength<1||pvLength>30)throw Error('読み筋の表示手数は1〜30手で指定してください。');
 if(infinite&&all)throw Error('全局解析には有限の時間を指定してください。無限は現在局面の解析用です。');
 const seconds=options?(infinite?1:Number(options.seconds)):null;
 if(seconds!==null){if(!Number.isFinite(seconds)||seconds<0.1||seconds>600)throw Error('解析時間は0.1〜600秒で指定してください。');visits=100;}
 if(!['japanese','chinese'].includes(rules))throw Error('解析ルールを選択してください。');
 if(!Number.isInteger(visits)||visits<1||visits>100000)throw Error('探索回数は1〜100000で指定してください。');
 if(!Number.isFinite(snapshot.komi)||Math.abs(snapshot.komi)>400||snapshot.komi*2%1!==0)throw Error('解析できるコミは−400〜400の0.5刻みです。');
 const parsed=S.parse(snapshot.sgf);const km=parsed.root.props.KM?.[0];const expected=km!==undefined&&km.trim()!==''&&Number.isFinite(Number(km))?Number(km):Number(parsed.root.props.HA?.[0])>=2?0.5:0;if(expected!==snapshot.komi)throw Error('棋譜と解析条件のコミが一致しません。');if(parsed.size!==snapshot.size)throw Error('盤サイズが一致しません。');
 let node=parsed.root;const route=[node];for(const childIndex of snapshot.path){if(!Number.isInteger(childIndex)||!node.children[childIndex])throw Error('変化の経路が不正です。');node=node.children[childIndex];route.push(node);}
 if(!Number.isInteger(snapshot.index)||!route[snapshot.index])throw Error('現在局面が不正です。');
 if(all&&route.length>2000)throw Error('全局解析は2000局面以内で指定してください。');
 let state=R.position(snapshot.size),base=state,moves=[],initialPlayer='B',reset=false;const positions=[];
 for(let i=0;i<(all?route.length:snapshot.index+1);i++){
  const props=route[i].props;
  if(props.XIGFORCE||props.XIGPENDING)throw Error('強制着手を含む棋譜は解析できません。重複着手などを修正してください。');
  state=R.apply(state,props,i===0);
  const setup=['AB','AW','AE'].some(k=>props[k]);
  const explicitTurn=props.PL&&(!i||!props.B&&!props.W);
  if(i===0&&!props.B&&!props.W||setup||explicitTurn){base=R.copy(state);moves=[];initialPlayer=state.turn===1?'B':'W';if(i>0)reset=true;}
  else if(props.B||props.W){const c=props.B?'B':'W';if(!moves.length)initialPlayer=c;moves.push([c,gtp(R.coordinate(props[c][0],snapshot.size,true),snapshot.size)]);if(props.PL&&props.PL[0]!== (c==='B'?'W':'B')){base=R.copy(state);moves=[];initialPlayer=state.turn===1?'B':'W';reset=true;}}
  if(all||i===snapshot.index)positions.push({index:i,move:state.move,turn:state.turn===1?'B':'W',reset,request:{boardXSize:snapshot.size,boardYSize:snapshot.size,initialStones:stones(base),initialPlayer,moves:moves.map(m=>m.slice()),komi:snapshot.komi,rules,maxVisits:visits,analysisPVLen:pvLength,includeOwnership:false,reportDuringSearchEvery:1}});
 }
 const chosen=all?positions.filter((p,i)=>i===0||p.move!==positions[i-1].move||p.reset!==positions[i-1].reset):[positions[0]];
 if(all&&positions.some(p=>p.reset))throw Error('途中で配置石・手番を変更した棋譜の全局解析には未対応です。現在局面は配置図として解析できます。');
 if(seconds!==null)for(const p of chosen){p.request.maxVisits=1000000000;p.request.overrideSettings={maxTime:infinite?1e20:seconds,maxPlayouts:1000000000};p.request.reportDuringSearchEvery=infinite?0.5:Math.max(0.1,Math.min(1,seconds/2));}
 return chosen;
}
function normalizedResult(data,size){
 const root=data.rootInfo;if(!root||!Number.isFinite(root.winrate)||root.winrate<0||root.winrate>1||!Number.isFinite(root.scoreLead)||!Number.isFinite(root.visits)||root.visits<0)throw Error('解析結果の数値が不正です。');
 const moveInfos=(data.moveInfos||[]).map(m=>{point(m.move,size);if(!Number.isFinite(m.winrate)||m.winrate<0||m.winrate>1||!Number.isFinite(m.scoreLead)||!Number.isFinite(m.visits))throw Error('候補手の数値が不正です。');return {move:m.move,winrate:m.winrate,scoreLead:m.scoreLead,visits:m.visits,order:Number.isFinite(m.order)?m.order:999,pv:Array.isArray(m.pv)?m.pv.slice(0,30).map(v=>{point(v,size);return v;}):[]};}).sort((a,b)=>a.order-b.order).slice(0,size*size+1);
 return {rootInfo:{winrate:root.winrate,scoreLead:root.scoreLead,visits:root.visits,currentPlayer:root.currentPlayer},moveInfos,isDuringSearch:!!data.isDuringSearch};
}
function validateArchive(data){
 if(!data||data.format!=='kifu-katago-analysis'||data.version!==1||data.perspective!=='BLACK')throw Error('このツールの解析保存ファイルではありません。');
 if(!data.snapshot||typeof data.snapshot.sgf!=='string'||!Array.isArray(data.snapshot.path))throw Error('保存された棋譜が不正です。');
 const positions=plan(data.snapshot,data.rules,100,false);void positions;
 if(!Array.isArray(data.results)||data.results.length>2000)throw Error('解析件数が不正です。');
 let node=S.parse(data.snapshot.sgf).root;const route=[node];for(const x of data.snapshot.path){node=node.children[x];route.push(node);}
 const states=[];let state=R.position(data.snapshot.size);for(let i=0;i<route.length;i++){state=R.apply(state,route[i].props,i===0);states.push({move:state.move,turn:state.turn===1?'B':'W'});}const seen=new Set();data.results=data.results.map(item=>{if(!Number.isInteger(item.index)||!route[item.index]||seen.has(item.index))throw Error('解析の局面番号が不正です。');seen.add(item.index);const local=states[item.index];return {index:item.index,move:local.move,turn:local.turn,reset:local.reset,result:normalizedResult(item.result,data.snapshot.size),time:typeof item.time==='string'?item.time:'',seconds:Number.isFinite(item.seconds)&&item.seconds>=0.1&&item.seconds<=600?item.seconds:null};});
 return data;
}

function positionAt(snapshot){
 let node=S.parse(snapshot.sgf).root,state=R.position(snapshot.size);
 const route=[node];for(const i of snapshot.path){node=node.children[i];if(!node)throw Error('変化の経路が不正です');route.push(node);}
 for(let i=0;i<=snapshot.index;i++)state=R.apply(state,route[i].props,i===0);
 let next=null;for(let i=snapshot.index+1;i<route.length;i++){const p=route[i].props;if(p.AB||p.AW||p.AE)break;const c=p.B?'B':p.W?'W':null;if(c){next={color:c,move:gtp(R.coordinate(p[c][0],snapshot.size,true),snapshot.size)};break;}}
 return {state,next};
}
function preview(snapshot,pv,count){
 let state=positionAt(snapshot).state;const labels=new Map();let applied=0,error='';
 for(const move of pv.slice(0,count)){try{const p=point(move,snapshot.size);state=R.play(state,p);applied++;for(const q of labels.keys())if(!state.board[q])labels.delete(q);if(p!==null)labels.set(p,applied);}catch(e){error=e.message;break;}}
 return {state,labels,applied,error};
}
function shortVisits(n){return n>=1000000?(n/1000000).toFixed(1)+'m':n>=1000?(n/1000).toFixed(1)+'k':String(n);}
function candidateColor(m,best,turn,rank){if(rank===0)return '#087ea4';const loss=Math.max(0,(best.scoreLead-m.scoreLead)*(turn===2?-1:1));return loss<=0.5?'#bce4a2':loss<=2?'#f4e684':'#f5b47a';}
function worstMoves(snapshot,items,metric='score'){
 const byIndex=new Map(items.map(x=>[x.index,x])),out=[];let node=S.parse(snapshot.sgf).root,move=0;
 for(let i=0;i<snapshot.path.length;i++){
  node=node.children[snapshot.path[i]];if(!node)break;
  const color=node.props.B?'B':node.props.W?'W':null;if(!color)continue;move++;
  if(node.props.AB||node.props.AW||node.props.AE||node.props.XIGFORCE)continue;
  const before=byIndex.get(i),after=byIndex.get(i+1);if(!before||!after)continue;
  const a=before.result.rootInfo,b=after.result.rootInfo,sign=color==='B'?1:-1;
  if(!Number.isFinite(a.scoreLead)||!Number.isFinite(b.scoreLead))continue;
  const loss=(a.scoreLead-b.scoreLead)*sign,winrateLoss=(a.winrate-b.winrate)*sign*100;if((metric==='winrate'?winrateLoss:loss)<=0)continue;
  out.push({index:i+1,move:after.move??move,color,point:gtp(R.coordinate(node.props[color][0],snapshot.size,true),snapshot.size),loss,winrateLoss:(a.winrate-b.winrate)*sign*100});
 }
 return out.sort((a,b)=>(metric==='winrate'?b.winrateLoss-a.winrateLoss:b.loss-a.loss)||a.move-b.move);
}
const api={worstMoves,positionKeys,rebaseResults,shortVisits,candidateColor,positionAt,preview,gtp,point,identity,effectiveRules,plan,normalizedResult,validateArchive};if(typeof module!=='undefined')module.exports=api;else global.KifuAnalysis=api;
})(globalThis);
