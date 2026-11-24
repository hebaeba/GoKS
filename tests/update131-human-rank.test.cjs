const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../web/match.js'),'utf8');
const ranks=source.slice(source.indexOf('const humanRanks='),source.indexOf('// Human clocks'));
const method=source.slice(source.indexOf(' async applyHumanRank('),source.indexOf(' async sync(q)'));
const {humanRanks,Session}=Function('log',ranks+';return {humanRanks,Session:class {'+method+'}}')(()=>{});
test('Both sides can use each of the 29 human ranks independently',async()=>{
 const sent=[];
 for(const [side,rank] of [['black','rank_20k'],['white','rank_9d'],['black','rank_1d']]){
  const worker=new Session();worker.session=side;
  worker.command=async ([cmd])=>{sent.push([side,cmd]);return cmd==='kata-get-models'?['[{"usesHumanSLProfile":false},{"usesHumanSLProfile":true}]']:[''];};
  await worker.applyHumanRank(rank,'list_commands\nkata-get-models\nkata-set-param');
  assert.deepEqual(sent.at(-1),[side,'kata-set-param humanSLProfile '+rank]);
 }
 assert.equal(humanRanks.size,29);assert.equal(humanRanks.get('rank_1d'),'初段');
 assert.match(source,/humanRank:\$\('match-'\+side\+'-human-rank'\)\.value/);
 assert.match(source,/w\.start\(p\.config,.*?,p\.humanRank\)/);
});
test('CFG default and unsupported engines never receive a rank override',async()=>{
 const worker=new Session(),commands=[];
 worker.command=async ([cmd])=>{commands.push(cmd);return ['[{"usesHumanSLProfile":false}]'];};
 await worker.applyHumanRank('','');assert.equal(commands.length,0);
 await assert.rejects(worker.applyHumanRank('rank_1d','kata-set-param'),/確認できません/);
 await assert.rejects(worker.applyHumanRank('rank_1d','kata-get-models'),/読み込まれていません/);
 await assert.rejects(worker.applyHumanRank('rank_0d','kata-get-models'),/選び直し/);
 assert.deepEqual(commands,['kata-get-models']);
});
