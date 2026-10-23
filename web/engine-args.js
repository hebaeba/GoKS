/* Option/value lines, with compatibility for old one-argument-per-line paths. */
(function(root){
 function parse(text){
  return String(text).split(/\r?\n/).flatMap(line=>{
   line=line.trim();if(!line)return [];
   if(!line.startsWith('-'))return [line.replace(/^"([^"]*)"$/, '$1')];
   const result=[];let token='',quote=null,active=false;
   for(const c of line){
    if(quote){if(c===quote)quote=null;else token+=c;active=true;}
    else if(c==='"'||c==="'"){quote=c;active=true;}
    else if(/\s/.test(c)){if(active){result.push(token);token='';active=false;}}
    else{token+=c;active=true;}
   }
   if(quote)throw Error('追加引数の引用符を閉じてください。');
   if(active)result.push(token);return result;
  });
 }
 const api={parse};if(typeof module!=='undefined')module.exports=api;else root.KifuEngineArgs=api;
})(globalThis);
