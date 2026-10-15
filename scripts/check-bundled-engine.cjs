// Runs on the Windows build machine, against the actual packaged engine.
const {spawn}=require('node:child_process'),path=require('node:path'),readline=require('node:readline');
const base=path.resolve(__dirname,'../dist/engines/eigen');
if(process.platform!=='win32'){console.error('This check requires Windows.');process.exit(1);}
const child=spawn(path.join(base,'katago.exe'),['analysis','-model',path.join(base,'model.bin.gz'),'-config',path.join(base,'analysis_example.cfg'),'-override-config','reportAnalysisWinratesAs=BLACK'],{cwd:base,windowsHide:true});
let version=false,answer=false,logs='',done=false;
const timeout=setTimeout(()=>finish('KataGo startup/analysis timed out: '+logs),90000);
function finish(error){if(done)return;done=true;clearTimeout(timeout);child.kill();if(error){console.error(error);process.exitCode=1;}else console.log('PASS: bundled Eigen version handshake and real 9x9 analysis');}
child.on('error',e=>finish(e.message));child.stdin.on('error',e=>finish(e.message));child.stderr.on('data',x=>{logs=(logs+x).slice(-6000);});child.on('exit',(code)=>{if(!done)finish('KataGo exited '+code+' '+logs);});
const lines=readline.createInterface({input:child.stdout});lines.on('line',line=>{let d;try{d=JSON.parse(line);}catch{return;}if(d.error)return finish(d.error);if(d.id==='version'&&d.version){version=true;child.stdin.write(JSON.stringify({id:'smoke',boardXSize:9,boardYSize:9,initialStones:[],moves:[],rules:'japanese',komi:0,maxVisits:10,overrideSettings:{maxTime:1}})+'\n');}if(d.id==='smoke'&&d.rootInfo&&Number.isFinite(d.rootInfo.scoreLead)&&d.isDuringSearch===false){answer=true;if(version&&answer)finish();}});
child.stdin.write(JSON.stringify({id:'version',action:'query_version'})+'\n');
