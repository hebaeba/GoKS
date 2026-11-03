/* Local board-image recognition. Noncommercial (LICENSE.txt), 2026 Eba. No external service. */
(function(global){'use strict';
function transform(corners,cols,rows){
 if(cols<2||rows<2||corners.length!==4)throw Error('範囲と四隅の交点を指定してください。');
 let sign=0;for(let i=0;i<4;i++){const a=corners[i],b=corners[(i+1)%4],c=corners[(i+2)%4],v=(b.x-a.x)*(c.y-b.y)-(b.y-a.y)*(c.x-b.x);if(!Number.isFinite(v)||Math.abs(v)<1||sign&&sign*v<0)throw Error('四隅を左上→右上→右下→左下の順で指定してください。');sign=v;}
 if(sign<0)throw Error('四隅の指定順を確認してください。');
 const uv=[[0,0],[cols-1,0],[cols-1,rows-1],[0,rows-1]],m=[];
 corners.forEach(({x,y},i)=>{const[u,v]=uv[i];m.push([u,v,1,0,0,0,-x*u,-x*v,x],[0,0,0,u,v,1,-y*u,-y*v,y]);});
 for(let i=0;i<8;i++){let pivot=i;for(let j=i+1;j<8;j++)if(Math.abs(m[j][i])>Math.abs(m[pivot][i]))pivot=j;[m[i],m[pivot]]=[m[pivot],m[i]];const d=m[i][i];if(Math.abs(d)<1e-9)throw Error('四隅を離して指定してください。');for(let k=i;k<9;k++)m[i][k]/=d;for(let j=0;j<8;j++)if(j!==i){const a=m[j][i];for(let k=i;k<9;k++)m[j][k]-=a*m[i][k];}}
 const h=m.map(r=>r[8]);return (u,v)=>{const d=h[6]*u+h[7]*v+1;return {x:(h[0]*u+h[1]*v+h[2])/d,y:(h[3]*u+h[4]*v+h[5])/d};};
}
function median(values){if(!values.length)return 0;values.sort((a,b)=>a-b);return values[Math.floor(values.length/2)];}
function recognize(image,corners,cols,rows,{black=90,white=16,offset='auto'}={}){
 const map=transform(corners,cols,rows),{width,height,data}=image;
 const upper=Math.hypot(corners[1].x-corners[0].x,corners[1].y-corners[0].y),lower=Math.hypot(corners[2].x-corners[3].x,corners[2].y-corners[3].y);const shift=offset==='auto'?(upper/lower<.85?-.25:0):Number(offset);
 function pixel(x,y){const p=map(x,y+shift),ix=Math.round(p.x),iy=Math.round(p.y);if(ix<0||ix>=width||iy<0||iy>=height)return null;const k=(iy*width+ix)*4,r=data[k],g=data[k+1],b=data[k+2];return {l:.2126*r+.7152*g+.0722*b,s:Math.max(r,g,b)-Math.min(r,g,b)};}
 const board=[],confidence=[],stats=[];
 for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){
  const center=[],surround=[],edge=[];
  for(let dy=-.3;dy<=.301;dy+=.1)for(let dx=-.3;dx<=.301;dx+=.1)if(Math.abs(dx)>.07&&Math.abs(dy)>.07&&dx*dx+dy*dy<.12){const p=pixel(x+dx,y+dy);if(p)center.push(p);}
  for(const dx of [-.55,.55])for(const dy of [-.55,.55]){const p=pixel(x+dx,y+dy);if(p)surround.push(p);}
  for(let a=0;a<24;a++){const t=(a+.5)*Math.PI/12;if(Math.abs(Math.sin(t))<.18||Math.abs(Math.cos(t))<.18)continue;const p=pixel(x+.46*Math.cos(t),y+.46*Math.sin(t));if(p)edge.push(p);}
  if(center.length<8)throw Error('交点が画像の外にあります。四隅を指定し直してください。');
  const lum=median(center.map(p=>p.l)),bg=median(surround.map(p=>p.l)),sat=median(center.map(p=>p.s)),bgSat=median(surround.map(p=>p.s));
  const dark=center.filter(p=>p.l<black).length/center.length,outline=edge.length?edge.filter(p=>p.l<lum-45).length/edge.length:0;
  const delta=lum-bg,neutral=bgSat-sat;
  let stone=0,certainty=1;
  if(dark>.55&&lum<bg-18){stone=1;certainty=Math.min(1,(dark-.4)*2);}
  else if(lum>135&&((delta>white&&neutral>5)||(delta>white+14)||(sat<40&&outline>.4))){stone=2;certainty=Math.min(1,Math.max(delta/(white+25),outline));}
  else if(dark>.2||delta>white-5)certainty=.35;
  board.push(stone);confidence.push(certainty);stats.push({lum,bg,sat,bgSat,dark,outline,delta});
 }
 return {board,confidence,stats};
}
function toSgf({size,left,top,cols,rows,board,turn='B',komi=0,capturedBlack=0,capturedWhite=0,handicap=0}){
 if(!Number.isInteger(size)||size<4||size>19||![left,top,cols,rows].every(Number.isInteger)||left<0||top<0||cols<2||rows<2||left+cols>size||top+rows>size||board.length!==cols*rows||board.some(v=>![0,1,2].includes(v))||!['B','W'].includes(turn)||!Number.isFinite(komi)||Math.abs(komi)>100)throw Error('取り込み範囲・石の配置・コミを確認してください。');
 if(![capturedBlack,capturedWhite].every(n=>Number.isInteger(n)&&n>=0&&n<=9999))throw Error('取られた石は0〜9999の整数で入力してください。');
 if(!Number.isInteger(handicap)||handicap<0||handicap>9)throw Error('置き石は0〜9の整数で入力してください。');
 const at=(x,y)=>String.fromCharCode(97+x,97+y),stones=c=>board.flatMap((v,i)=>v===c?['['+at(left+i%cols,top+Math.floor(i/cols))+']']:[]).join('');
 return '(;GM[1]FF[4]CA[UTF-8]SZ['+size+']KM['+komi+']HA['+handicap+']PL['+turn+']GN[画像から取り込んだ局面]'+(board.includes(1)?'AB'+stones(1):'')+(board.includes(2)?'AW'+stones(2):'')+'XIGIMAGE[1]XIGCAPB['+capturedBlack+']XIGCAPW['+capturedWhite+']'+(cols<size||rows<size?'XIGPARTIAL[1]':'')+')';
}
const api={transform,recognize,toSgf};if(typeof module!=='undefined')module.exports=api;else global.GoImageBoard=api;
})(typeof globalThis!=='undefined'?globalThis:this);
