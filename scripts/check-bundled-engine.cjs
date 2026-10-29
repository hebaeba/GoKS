// Windows CI: all three bundles must be complete. Exercise Eigen on the hosted CPU runner.
// AVX2 and OpenCL performance/startup require suitable hardware on the target PC.
const path=require('node:path'),{Engine}=require('../backend/engine.cjs'),{Bridge}=require('../web/gtp.js'),{bundledEngines}=require('../backend/bundled-engines.cjs');
if(process.platform!=='win32'){console.error('This check requires Windows.');process.exit(1);}
(async()=>{const bundle=bundledEngines(path.resolve(__dirname,'../dist/engines/katago'));for(const p of bundle.profiles)if(p.missing.length)throw Error(p.name+': '+p.missing.join(', '));
 const engine=new Engine(),bridge=new Bridge((a,p)=>engine.call(a,p));let polling=false,failure=null;
 const timer=setInterval(async()=>{if(polling)return;polling=true;try{const r=await bridge.call('poll');for(const e of r.events||[])if(e.type==='exit')throw Error(e.message);}catch(e){failure=e;bridge.reset();}finally{polling=false;}},30);
 const timeout=setTimeout(()=>{failure=Error('KataGo smoke test timed out');bridge.reset();engine.stop();},120000);
 try{await bridge.call('start',bundle);const [name]=await bridge.commands(['name','protocol_version']);if(!/KataGo/i.test(name))throw Error('Not KataGo');await bridge.commands(['boardsize 9','clear_board','komi 6.5','time_settings 0 1 0','kata-set-param maxTime 0.2','kata-set-param maxVisits 50']);const [move]=await bridge.commands(['kata-genmove_analyze B 10 rootInfo true']);if(!/play (?:[A-HJ-Z]\d+|pass)/i.test(move))throw Error('No move: '+move);if(failure)throw failure;console.log('PASS: three bundles complete; real Eigen GTP startup and timed genmove');}
 finally{clearTimeout(timeout);clearInterval(timer);await bridge.call('stop');}
})().catch(e=>{console.error(e);process.exitCode=1;});
