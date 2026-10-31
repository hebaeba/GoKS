/* Ownership output is BLACK-relative, matching the engine's enforced configuration. */
(function(root){'use strict';
function parse(line,size){
 const tokens=String(line).trim().split(/\s+/),start=tokens.indexOf('ownership');if(start<0)return null;
 const ownership=tokens.slice(start+1,start+1+size*size).map(Number);
 if(ownership.length!==size*size||ownership.some(v=>!Number.isFinite(v)||Math.abs(v)>1))return null;
 const ri=tokens.indexOf('rootInfo');if(ri<0)return null;
 const number=key=>{const i=tokens.indexOf(key,ri+1);return i>=0?Number(tokens[i+1]):NaN;};
 const scoreLead=number('scoreLead'),winrate=number('winrate');if(!Number.isFinite(scoreLead)||!Number.isFinite(winrate)||winrate<0||winrate>1)return null;
 return {ownership,scoreLead,winrate};
}
function canScore(snapshot,S,phase='idle',loadedRecord=false){
 if(['starting','playing','paused','stopping'].includes(phase))return false;
 if(loadedRecord)return true;
 if(snapshot.index!==snapshot.path.length)return false;
 let node=S.parse(snapshot.sgf).root;const result=node.props.RE?.[0]||'';
 if(/\+(?:R|Resign|T|Time|F|Forfeit)$/i.test(result))return false;
 const route=[node];for(const i of snapshot.path){node=node.children[i];if(!node)return false;route.push(node);}
 if(/^(?:[BW]\+\d+(?:\.\d+)?|0|Draw|Jigo)$/i.test(result))return true;
 const a=route.at(-2)?.props,b=route.at(-1)?.props;
 return !!(a&&b&&((a.B?.[0]===''&&b.W?.[0]==='')||(a.W?.[0]===''&&b.B?.[0]==='')));
}
const api={parse,canScore};if(typeof module!=='undefined')module.exports=api;else root.KifuEstimateCore=api;
})(globalThis);
