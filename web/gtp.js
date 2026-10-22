/* KataGo GTP transport adapter. UI result format remains independent of the wire protocol. */
'use strict';
(function(root){
const vertex=(x,y,n)=>'ABCDEFGHJKLMNOPQRSTUVWXYZ'[x]+(n-y);
function parseInfo(line,pvLength=30){
 const t=line.trim().split(/\s+/),moves=[];let current=null,rootInfo=null;
 const arrays=new Set(['pv','pvVisits','pvEdgeVisits','movesOwnership','movesOwnershipStdev']);
 const field=/^[A-Za-z][A-Za-z0-9]*$/;
 for(let i=0;i<t.length;){const key=t[i++];
  if(key==='info'){current={};moves.push(current);continue;}
  if(key==='rootInfo'){current=rootInfo={};continue;}
  if(key==='ownership'||key==='ownershipStdev')break;
  if(!current)continue;
  if(arrays.has(key)){const values=[];while(i<t.length&&(key==='pv'?/^(?:[A-Z]\d+|pass|resign)$/i.test(t[i]):!field.test(t[i])))values.push(t[i++]);if(key==='pv')current.pv=values.slice(0,pvLength);continue;}
  const value=t[i++];if(value===undefined)break;current[key]=['move','isSymmetryOf'].includes(key)?value:Number(value);
 }
 if(!rootInfo||!Number.isFinite(rootInfo.winrate)||!Number.isFinite(rootInfo.scoreLead))return null;
 return {rootInfo,moveInfos:moves.filter(m=>m.move&&Number.isFinite(m.winrate)&&Number.isFinite(m.scoreLead)).sort((a,b)=>a.order-b.order)};
}
function positionCommands(q){
 const n=q.boardXSize;if(!Number.isInteger(n)||n<2||n>25||q.boardYSize!==n)throw Error('GTPでは正方形の盤面を指定してください。');
 const point=p=>{if(!/^(?:[A-HJ-Z]\d{1,2}|pass)$/i.test(p))throw Error('着点が不正です');return p;};
 const color=c=>{if(!['B','W'].includes(c))throw Error('手番が不正です');return c;};
 if(!['japanese','chinese'].includes(q.rules)||!Number.isFinite(q.komi))throw Error('ルール・コミが不正です');
 const out=['boardsize '+n,'clear_board','kata-set-rules '+q.rules,'komi '+q.komi];
 if(q.initialStones?.length){const stones=q.initialStones;
  if(q.initialHandicap>=2&&stones.length===q.initialHandicap&&stones.every(s=>s[0]==='B'))out.push('set_free_handicap '+stones.map(s=>point(s[1])).join(' '));
  else out.push('set_position '+stones.map(s=>color(s[0])+' '+point(s[1])).join(' '));
 }
 for(const s of q.moves||[])out.push('play '+color(s[0])+' '+point(s[1]));
 // Start every request with an empty search cache, so changing the time/region never reuses old visits.
 out.push('clear_cache');return out;
}
function analyzeCommand(q){
 const last=q.moves?.at(-1),turn=last?(last[0]==='B'?'W':'B'):(q.initialPlayer||'B');
 let cmd='kata-analyze '+turn+' 10 rootInfo true';
 for(const restriction of q.allowMoves||[]){
  if(!['B','W'].includes(restriction.player))throw Error('領域の手番が不正です');
  const allowed=new Set(restriction.moves.map(p=>p.toUpperCase())),avoid=[];
  for(let y=0;y<q.boardYSize;y++)for(let x=0;x<q.boardXSize;x++){const p=vertex(x,y,q.boardYSize);if(!allowed.has(p))avoid.push(p);}
  if(avoid.length)cmd+=' avoid '+restriction.player+' '+avoid.join(',')+' 1000000';
 }return cmd;
}
class Bridge{
 constructor(raw){this.kind='katago';this.raw=raw;this.seq=0;this.pending=new Map();this.events=[];this.queue=Promise.resolve();this.epoch=0;this.jobs=new Map();this.response=null;this.current=null;}
 reset(){this.epoch++;for(const p of this.pending.values()){clearTimeout(p.timeout);p.reject(Error('エンジンを停止しました'));}this.pending.clear();if(this.current)clearTimeout(this.current.timer);this.current=null;this.jobs.clear();this.response=null;this.events=[];this.queue=Promise.resolve();}
 commands(commands,stream=null){
  const lines=[],promises=[];
  for(const command of commands){const id=String(++this.seq);lines.push(id+' '+command);promises.push(new Promise((resolve,reject)=>{const p={id,command,resolve,reject,lines:[],stream};if(!/^kata-genmove_analyze\s/.test(command)){p.timeout=setTimeout(()=>{this.pending.delete(id);reject(Error('GTP応答がありません：'+command.split(' ')[0]));},stream?3600000:600000);p.timeout.unref?.();}this.pending.set(id,p);}));}
  this.raw('send',{commands:lines}).catch(e=>{for(const line of lines){const id=line.split(' ')[0],p=this.pending.get(id);if(p){clearTimeout(p.timeout);this.pending.delete(id);p.reject(e);}}});
  return Promise.all(promises);
 }
 line(line){
  const header=/^([=?])(\d+)(?:\s(.*))?$/.exec(line);
  if(header){const p=this.pending.get(header[2]);this.response=p||null;if(!p)return;p.failed=header[1]==='?';if(header[3])p.lines.push(header[3]);
   if(p.stream&&!p.failed){clearTimeout(p.timeout);p.stream.started=true;const seconds=p.stream.query.overrideSettings?.maxTime;
    if(Number.isFinite(seconds)&&seconds<1e10)p.stream.timer=setTimeout(()=>this.interrupt(p.stream),Math.max(100,seconds*1000));
   }return;
  }
  const p=this.response;
  if(!line.trim()){if(!p)return;this.response=null;clearTimeout(p.timeout);this.pending.delete(p.id);if(p.failed)p.reject(Error(p.command.split(' ')[0]+'：'+p.lines.join('\n')));else p.resolve(p.lines.join('\n'));return;}
  if(p?.stream&&/^(info |rootInfo )/.test(line)){const data=parseInfo(line,p.stream.query.analysisPVLen);if(data){p.stream.last=data;this.events.push({type:'result',data:{id:p.stream.query.id,...data,isDuringSearch:true}});}return;}
  if(p)p.lines.push(line);else this.events.push({type:'log',message:line});
 }
 interrupt(job){if(job.stopping)return;job.stopping=true;clearTimeout(job.timer);this.commands(['stop']).catch(e=>{if(this.current===job)this.events.push({type:'result',data:{id:job.query.id,error:e.message}});});}
 send(q){
  if(q.action==='terminate'||q.action==='terminate_all'){for(const job of this.jobs.values())if(q.action==='terminate_all'||job.query.id===q.terminateId){job.cancelled=true;if(job.started)this.interrupt(job);}return {accepted:true};}
  const epoch=this.epoch,job={query:q,cancelled:false,started:false};this.jobs.set(q.id,job);
  this.queue=this.queue.catch(()=>{}).then(async()=>{if(epoch!==this.epoch||job.cancelled){this.jobs.delete(q.id);return;}
   try{
    if(q.action==='query_version'){
     const values=await this.commands(['protocol_version','name','version','list_commands']);
     const available=new Set(values[3].split(/\s+/));const missing=['kata-analyze','kata-set-rules','set_position','clear_cache','stop'].filter(x=>!available.has(x));
     if(values[0].trim()!=='2'||(this.kind==='katago'&&missing.length))throw Error('対応するKataGo GTPが必要です。不足する命令：'+missing.join('、'));
     this.events.push({type:'result',data:{id:q.id,version:values[2],name:values[1],supportsAnalysis:this.kind==='katago'&&!missing.length,protocol:'GTP',commands:[...available]}});return;
    }
    if(q.action)throw Error('未対応のGTP操作です：'+q.action);
    if(this.kind!=='katago')throw Error('このエンジンの解析には未対応です。');
    this.current=job;
    await this.commands(positionCommands(q));if(epoch!==this.epoch||job.cancelled)return;
    await this.commands([analyzeCommand(q)],job);
    if(epoch!==this.epoch)return;
    this.events.push({type:'result',data:job.last?{id:q.id,...job.last,isDuringSearch:false}:{id:q.id,isDuringSearch:false,error:job.cancelled?'解析を停止しました':'解析結果を取得できませんでした。１局面の時間を長くしてください。'}});
   }catch(e){if(epoch===this.epoch)this.events.push({type:'result',data:{id:q.id,error:e.message,isDuringSearch:false}});}
   finally{clearTimeout(job.timer);this.jobs.delete(q.id);if(this.current===job)this.current=null;}
  });return {accepted:true};
 }
 async call(action,payload={}){
  if(action==='start'){this.reset();const r=await this.raw(action,payload);this.kind=r.meta?.kind||payload.kind||'katago';return r;}
  if(action==='stop'){this.reset();return this.raw(action,payload);}
  if(action==='send')return this.send(payload);
  if(action==='poll'){const r=await this.raw(action,payload);const other=[];for(const e of r.events||[]){if(e.type==='gtp')this.line(e.line);else other.push(e);}return {...r,events:[...other,...this.events.splice(0)]};}
  return this.raw(action,payload);
 }
}
const api={Bridge,parseInfo,positionCommands,analyzeCommand};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.KifuGTP=api;
})(typeof window!=='undefined'?window:globalThis);
