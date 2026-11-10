'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..'),read=file=>fs.readFileSync(path.join(root,file),'utf8');
const A=require('../web/analysis-core.js');
test('Update127: both analysis and editor offer a clear-shading button, with one shared action',()=>{
 const analysis=read('web/analysis.js'),board=read('web/app.js');
 assert.match(analysis,/id="analysis-clear-shading"/);
 assert.match(analysis,/\$\('analysis-clear-shading'\)\.onclick=\(\)=>window\.dispatchEvent\(new Event\('kifu-clear-shading'\)\)/);
 assert.match(board,/clearShading\.textContent='網掛けを全消去'/);
 assert.match(board,/window\.addEventListener\('kifu-clear-shading',async \(\)=>/);
});
test('Update127: current-node DD only removed through undoable transaction; other data preserved',()=>{
 const code=read('web/app.js');
 assert.match(code,/const node=route\[index\]/);
 assert.match(code,/const success=transaction\(\(\)=>\{delete node\.props\.DD;\}/);
 assert.match(code,/if\(!\(await canLeave\(\)\)\)return/);
 assert.match(code,/if\(scoreSession\|\|insertion\|\|exportBusy\|\|window\.KifuMatch\?\.locked\)/);
 assert.match(code,/if\(success&&previous\)regionOnly\.dispatchEvent\(new Event\('change'/);
});
test('Update127: ranking shows worst moves, not best moves, with existing metric switching',()=>{
 const studio=read('web/studio.js'),match=read('web/match-ranking.js'),en=read('web/i18n-en.js');
 assert.match(studio,/悪手ランキング（勝率／目数差）/);
 assert.match(match,/悪手ランキング（勝率／目数差・暫定）/);
 assert.match(en,/"悪手ランキング（勝率／目数差）": "Mistake Ranking/);
 const s={sgf:'(;SZ[9];B[aa];W[bb];B[cc])',size:9,path:[0,0,0],index:3};
 const item=(index,score,win=.5)=>({index,move:index,result:{rootInfo:{scoreLead:score,winrate:win}}});
 assert.deepEqual(A.worstMoves(s,[item(0,2),item(1,-3),item(2,4),item(3,-4)]).map(x=>x.loss),[8,7,5]);
 assert.deepEqual(A.worstMoves(s,[item(0,0),item(1,2),item(2,0),item(3,1)],'score').map(x=>x.move),[]);
});
test('Update127: manual and release baseline reflect change; prior engine UI remains',()=>{
 const doc=read('Manual.html'),refine=read('web/refine.js'),app=read('web/analysis.js');
 assert.match(doc,/Clear All Shading/);assert.match(doc,/網掛けを全消去/);
 assert.match(refine,/tools\.prepend\(setup,downloads\)/);assert.match(app,/CPU版エンジンを自動セットアップ/);
 assert.match(read('web/window-assets.json'),/"update": 128/);
});
