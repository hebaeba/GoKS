/* Unsaved-content policy: empty default diagrams contain nothing to discard. */
(function(root){'use strict';
function hasContent(node){
 if(!node)return false;
 if(node.children?.length)return true;
 return Object.entries(node.props||{}).some(([key,values])=>{
  if(['GM','FF','CA','AP','SZ'].includes(key))return false;
  if(!values?.some(value=>String(value).trim()!==''))return false;
  if(['KM','HA'].includes(key)&&values.length===1&&Number(values[0])===0)return false;
  return true;
 });
}
const api={hasContent};if(typeof module==='object'&&module.exports)module.exports=api;else root.KifuRecordState=api;
})(typeof globalThis!=='undefined'?globalThis:this);
