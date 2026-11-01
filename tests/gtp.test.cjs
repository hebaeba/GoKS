const test=require('node:test'),assert=require('node:assert/strict');
const {Bridge,parseInfo,positionCommands,analyzeCommand}=require('../web/gtp.js');
const info='info move D4 visits 8 winrate 0.65 scoreLead 2.5 prior 0.3 order 0 pv D4 E5 pass info move E4 order 1 visits 4 winrate 0.6 scoreLead 1.5 pv E4 rootInfo visits 13 winrate 0.63 scoreLead 2.1';
const query=id=>({id,boardXSize:9,boardYSize:9,initialStones:[],initialPlayer:'W',moves:[],rules:'japanese',komi:0.5,analysisPVLen:2,overrideSettings:{maxTime:1e20}});
test('GTP fields use decimal probabilities, root visits and bounded PV',()=>{const d=parseInfo(info,2);assert.equal(d.rootInfo.visits,13);assert.equal(d.rootInfo.winrate,.63);assert.deepEqual(d.moveInfos[0].pv,['D4','E5']);assert.equal(d.moveInfos[1].scoreLead,1.5);});
test('diagram stones, handicap, rules, captures-adjusted komi and passes are sent to GTP',()=>{const q={...query('a'),initialStones:[['B','D4'],['W','E5']],moves:[['B','pass']]};assert.deepEqual(positionCommands(q),['boardsize 9','clear_board','kata-set-rules japanese','komi 0.5','set_position B D4 W E5','play B pass','clear_cache']);q.initialStones=[['B','D4'],['B','F6']];q.initialHandicap=2;assert.match(positionCommands(q).join('\n'),/set_free_handicap D4 F6/);assert.match(analyzeCommand(q),/^kata-analyze W /);});
test('irregular shaded mask restricts both colors without removing outside stones',()=>{const q={...query('a'),allowMoves:['B','W'].map(player=>({player,moves:['D4','E5','pass']}))};const c=analyzeCommand(q);assert.match(c,/avoid B /);assert.match(c,/avoid W /);assert(!c.includes('D4'));assert(!c.includes('E5'));assert(!c.includes('pass'));assert(c.includes('A9'));});
function fixture(streamInfo=info){let events=[],stream=null;const commands=[];const raw=async(action,payload)=>{if(action==='poll')return{running:true,events:events.splice(0)};if(action==='send')for(const line of payload.commands){commands.push(line);const [id,...words]=line.split(' '),cmd=words[0];if(stream){events.push({type:'gtp',line:''});stream=null;}if(cmd==='kata-analyze'){stream=id;events.push({type:'gtp',line:'='+id},{type:'gtp',line:streamInfo});}else events.push({type:'gtp',line:'='+id+' '+({protocol_version:'2',name:'KataGo',version:'test',list_commands:'kata-analyze kata-set-rules set_position clear_cache stop'}[cmd]||'')},{type:'gtp',line:''});}return{};};const b=new Bridge(raw);return{b,commands};}
async function until(b,predicate){const deadline=Date.now()+3000;while(Date.now()<deadline){const r=await b.call('poll');for(const e of r.events)if(predicate(e))return e;await new Promise(r=>setTimeout(r,5));}throw Error('test timed out');}
test('GTP handshake, continuous stream, stop and next position retain request identity',async()=>{const {b,commands}=fixture();try{await b.call('send',{id:'v',action:'query_version'});assert.equal((await until(b,e=>e.data?.version)).data.version,'test');await b.call('send',query('first'));await until(b,e=>e.data?.id==='first'&&e.data.isDuringSearch);await b.call('send',{id:'cancel',action:'terminate',terminateId:'first'});await b.call('send',query('next'));await until(b,e=>e.data?.id==='next'&&e.data.isDuringSearch);assert(commands.some(c=>c.endsWith(' stop')));await b.call('send',{action:'terminate',terminateId:'next'});await until(b,e=>e.data?.id==='next'&&e.data.isDuringSearch===false);}finally{await b.call('stop');}});
test('timed whole-game positions finish and allow the next queued position',async()=>{const {b}=fixture();try{await b.call('send',{...query('timed'),overrideSettings:{maxTime:.1}});const e=await until(b,e=>e.data?.id==='timed'&&e.data.isDuringSearch===false);assert.equal(e.data.rootInfo.visits,13);await b.call('send',{...query('second'),overrideSettings:{maxTime:.1}});await until(b,e=>e.data?.id==='second'&&e.data.isDuringSearch===false);}finally{await b.call('stop');}});

test('explicit ownership query preserves current-position territory without contaminating ordinary analysis',async()=>{
 const ownership=Array(81).fill(.75),{b,commands}=fixture(info+' ownership '+ownership.join(' '));
 try{
  await b.call('send',{...query('estimate'),includeOwnership:true,overrideSettings:{maxTime:.1}});
  const result=await until(b,e=>e.data?.id==='estimate'&&e.data.isDuringSearch===false);
  assert.deepEqual(result.data.ownership,ownership);
  assert(commands.some(c=>c.includes('ownership true')));
  await b.call('send',{...query('normal'),overrideSettings:{maxTime:.1}});
  const normal=await until(b,e=>e.data?.id==='normal'&&e.data.isDuringSearch===false);
  assert.equal(normal.data.ownership,undefined);
 }finally{await b.call('stop');}
});
