const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const web=path.resolve(__dirname,'../web');const read=name=>fs.readFileSync(path.join(web,name),'utf8');

test('both simple and normal display commit immediately without a two-second wait',()=>{
 const src=read('simple-window-menu.js');
 assert.doesNotMatch(src,/normalTransition|finishNormal\(|setTimeout\(\(\)=>finishNormal|modeRevision/);
 const snippet=src.match(/ function setMode\(value\)\{[\s\S]*?\n \}/)?.[0];assert.ok(snippet);
 const calls=[];const ctx={requestedMode:false,simple:false,applyMode(v){calls.push(['render',v]);ctx.simple=v;},resizeNative(v,force){calls.push(['window',v,force]);}};
 vm.runInNewContext(''+snippet+'; this.switchMode=setMode;',ctx);
 ctx.switchMode(true);assert.equal(ctx.simple,true);ctx.switchMode(false);assert.equal(ctx.simple,false);
 ctx.switchMode(true);ctx.switchMode(false);ctx.switchMode(true);
 assert.deepEqual(calls.filter(c=>c[0]==='render').map(c=>c[1]),[true,false,true,false,true]);
 assert.equal(calls.filter(c=>c[0]==='window').length,5);
});

test('fixed panels preserve their widths across normal layout fits and old stored preferences',()=>{
 const src=read('layout60.js');assert.doesNotMatch(src,/panel-width-handle|gokifu-panel-widths|onpointermove|ondblclick/);
 const attrs={};const css={getPropertyValue:k=>attrs[k]||'',setProperty:(k,v)=>attrs[k]=v};
 const grid={clientWidth:1256,clientHeight:720,style:css};const wrap={style:css};const pane={};const block={querySelector:s=>({getBoundingClientRect(){return{height:({'#normal-info':26,'#normal-slider':18,'.board-heading':28})[s]||0}}})};
 const objects={'.board-panel':pane,'.canvas-wrap':wrap,'.workspace':grid,'.board-block':block};const listeners={};let simple=false;
 const context={document:{body:{classList:{contains:x=>simple&&x==='simple-mode'}},querySelector:s=>objects[s],fonts:null},window:{addEventListener:(type,fn)=>listeners[type]=fn},ResizeObserver:class{observe(){}},requestAnimationFrame:cb=>{cb();return 1},cancelAnimationFrame(){}};
 vm.runInNewContext(src,context);
 const f=context.window.KifuLayout.fit;
 assert.equal(attrs['--side-width'],'400px');assert.equal(attrs['--right-width'],'500px');assert.equal(attrs['--normal-board-size'],'328px');
 grid.clientWidth=1550;f();assert.equal(attrs['--side-width'],'400px');assert.equal(attrs['--right-width'],'500px');assert.equal(attrs['--normal-board-size'],'622px');
 simple=true;grid.clientWidth=600;f();assert.equal(attrs['--normal-board-size'],'622px','simple mode does not overwrite normal board fit');
 simple=false;grid.clientWidth=1256;f();assert.equal(attrs['--normal-board-size'],'328px');
 assert.doesNotMatch(read('sidebar.css'),/\.panel-width-handle\{/);
 assert.match(read('sidebar.css'),/--side-width:400px/);assert.match(read('sidebar.css'),/--right-width:500px/);
 assert.match(read('index.html'),/simple-window-menu\.js\?v=121/);
});
