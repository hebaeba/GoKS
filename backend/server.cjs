/* Local-only development launcher; same Engine protocol as the native Tauri backend. */
'use strict';
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');const {Engine}=require('./engine.cjs');
const root=path.resolve(__dirname,'../web'),engine=new Engine(),token=crypto.randomBytes(32).toString('hex');let origin;
const types={'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.txt':'text/plain; charset=utf-8','.sgf':'application/x-go-sgf'};
const server=http.createServer(async(req,res)=>{
 res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
 if(req.headers.host!==new URL(origin).host||(req.headers.origin&&req.headers.origin!==origin)){res.writeHead(403);return res.end('Forbidden');}
 const url=new URL(req.url,origin);
 if(url.pathname==='/api/engine'){
  if(req.method!=='POST'||req.headers['x-kifu-token']!==token){res.writeHead(403);return res.end('Forbidden');}
  try{let size=0;const chunks=[];for await(const chunk of req){size+=chunk.length;if(size>3*1024*1024)throw Error('リクエストが大きすぎます');chunks.push(chunk);}const {action,payload}=JSON.parse(Buffer.concat(chunks));const result=await engine.call(action,payload);res.setHeader('Content-Type','application/json');res.end(JSON.stringify({ok:true,result}));}catch(e){res.writeHead(400,{'Content-Type':'application/json'});res.end(JSON.stringify({ok:false,error:e.message}));}return;
 }
 if(req.method!=='GET'){res.writeHead(405);return res.end();}
 try{const rel=decodeURIComponent(url.pathname).replace(/^\/+/, '')||'index.html',file=path.resolve(root,rel);if(!file.startsWith(root+path.sep))throw Error('path');let content=await fs.promises.readFile(file);if(rel==='index.html')content=Buffer.from(content.toString().replace('</head>','<meta name="kifu-local-token" content="'+token+'"></head>'));res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream'});res.end(content);}catch{res.writeHead(404);res.end('Not found');}
});
server.listen(process.env.KIFU_PORT!==undefined?Number(process.env.KIFU_PORT):47831,'127.0.0.1',()=>{origin='http://127.0.0.1:'+server.address().port;console.log('棋譜編集ツール：'+origin);console.log('この画面を閉じるとKataGoも終了します。終了はCtrl+C。');if(process.platform==='win32'&&process.env.KIFU_NO_OPEN!=='1')require('node:child_process').spawn('rundll32.exe',['url.dll,FileProtocolHandler',origin],{windowsHide:true});});
server.on('error',e=>{console.error('起動できません：'+e.message+'。同じツールを開いていないか確認してください。');process.exitCode=1;});
function close(){engine.stop();server.close(()=>process.exit());setTimeout(()=>process.exit(),1000).unref();}process.on('SIGINT',close);process.on('SIGTERM',close);process.on('exit',()=>engine.stop());
