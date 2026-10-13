'use strict';
const fs=require('node:fs'),path=require('node:path'),{spawn}=require('node:child_process');
function validateFile(kind,file,windows=process.platform==='win32'){
 const patterns={exe:/\.exe$/i,model:/\.(bin|txt)(\.gz)?$/i,config:/\.cfg$/i};
 if(!patterns[kind])throw Error('ファイルの種類が不正です。');
 if((kind!=='exe'||windows)&&!patterns[kind].test(file))throw Error(({exe:'エンジンは .exe',model:'モデルは .bin.gz / .bin / .txt.gz / .txt',config:'設定は .cfg'})[kind]+' を選択してください。');
 if(!fs.existsSync(file)||!fs.statSync(file).isFile())throw Error('ファイルが見つかりません：'+file);
}
let choosing=false;
async function pick(kind){
 if(!['exe','model','config'].includes(kind))throw Error('ファイルの種類が不正です。');
 if(process.platform!=='win32')throw Error('選択ボタンはWindows用です。この環境ではパスを直接入力してください。');
 if(choosing)throw Error('ファイル選択の窓を先に閉じてください。');choosing=true;
 try{return await new Promise((resolve,reject)=>{
  const script=fs.readFileSync(path.join(__dirname,'select-file.ps1'),'utf8');
  // The script is fixed, and kind is from the whitelist above. No user path is inserted into PowerShell code.
  const command='& {\n'+script+'\n} -Kind '+kind;
  const child=spawn('powershell.exe',['-NoLogo','-NoProfile','-STA','-EncodedCommand',Buffer.from(command,'utf16le').toString('base64')],{windowsHide:true,shell:false});let out='',err='';
  child.stdout.on('data',d=>out+=d.toString('utf8'));child.stderr.on('data',d=>err+=d.toString('utf8'));
  child.on('error',e=>reject(Error('選択窓を開けません：'+e.message+'。パスを直接入力することもできます。')));
  child.on('close',code=>{try{if(code!==0)throw Error('選択窓を開けません：'+err.slice(-3000));const file=out.replace(/^\uFEFF/,'').trim();if(file)validateFile(kind,file);resolve({path:file||null});}catch(e){reject(e);}});
 });}finally{choosing=false;}
}
// Read the ordinary Windows PE import table (delay-loaded/runtime libraries are not covered).
function imports(file){
 const b=fs.readFileSync(file);if(b.length<64||b.readUInt16LE(0)!==0x5a4d)return [];
 const pe=b.readUInt32LE(60);if(pe+24>b.length||b.readUInt32LE(pe)!==0x4550)return [];
 const sections=b.readUInt16LE(pe+6),opt=pe+24,len=b.readUInt16LE(pe+20);if(opt+len>b.length)return [];
 const magic=b.readUInt16LE(opt),dd=opt+(magic===0x20b?112:magic===0x10b?96:len);
 if(dd+16>opt+len)return [];
 const rva=b.readUInt32LE(dd+8);if(!rva)return [];
 function offset(r){for(let n=0;n<sections;n++){const s=opt+len+40*n;if(s+40>b.length)break;const va=b.readUInt32LE(s+12),sz=b.readUInt32LE(s+16),ptr=b.readUInt32LE(s+20);if(r>=va&&r<va+sz&&ptr+r-va<b.length)return ptr+r-va;}return null;}
 let at=offset(rva);if(at===null)return [];const names=[];
 for(let i=0;i<512&&at+20<=b.length;i++,at+=20){const name=b.readUInt32LE(at+12);if(!name)break;const p=offset(name);if(p===null)continue;const end=b.indexOf(0,p);if(end<0||end-p>260)continue;const dll=b.toString('ascii',p,end);if(/^[\w.+-]+\.dll$/i.test(dll))names.push(dll);}
 return names;
}
function missingDlls(exe){
 const dir=path.dirname(exe),win=process.env.SystemRoot||'C:\\Windows';const search=[dir,path.join(win,'System32'),win,...(process.env.PATH||'').split(path.delimiter)];const seen=new Set(),missing=new Set(),todo=[exe];
 while(todo.length&&seen.size<200){const f=todo.pop();if(seen.has(f.toLowerCase()))continue;seen.add(f.toLowerCase());for(const dll of imports(f)){if(/^(api-ms-|ext-ms-)/i.test(dll))continue;const found=search.map(d=>path.join(d,dll)).find(p=>fs.existsSync(p));if(!found)missing.add(dll);else if(path.dirname(found).toLowerCase()===dir.toLowerCase())todo.push(found);}}
 return [...missing];
}
function exitMessage(code,signal){const u=Number.isInteger(code)?code>>>0:0;const hint=u===0xc0000135?'必要なDLLが見つかりません。KataGoの配布ZIPをDLLも含めて展開してください。':u===0xc000007b?'実行ファイルまたはDLLの形式が合いません。32bit／64bitの組合せを確認してください。':u===0xc000001d?'このCPUでは実行できない命令です。CPUに対応するKataGoを選択してください。':'';return 'KataGoが終了しました（'+(code??signal)+(u?' / 0x'+u.toString(16).toUpperCase():'')+'）'+(hint?'\n'+hint:'');}
module.exports={validateFile,pick,imports,missingDlls,exitMessage};
