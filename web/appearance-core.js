/* Appearance preferences: bounded input, no changes to records or engine settings. */
(function(root){'use strict';
 const sizes={small:[12,14,12,16,24,28],normal:[14,16,12,18,26,30],large:[16,18,14,20,28,32],xlarge:[18,20,16,22,30,34]};
 const themes={warm:{board:'#ebc365',background:'#edf3f0',panel:'#f8fbf9',text:'#203a34',graph:'#4b5650',graphText:'#edf3ef',win:'#00ee00',score:'#ed00ed'},paper:{board:'#e8e7df',background:'#f0f1f2',panel:'#ffffff',text:'#1f2933',graph:'#f4f5f6',graphText:'#26352e',win:'#16763c',score:'#9d237d'},night:{board:'#b49b71',background:'#202a2b',panel:'#2d393a',text:'#f0f5f3',graph:'#1b2528',graphText:'#edf3ef',win:'#7aed6b',score:'#f488e7'}};
 const defaults=()=>({version:1,ja:{size:'normal',font:'system-ui'},en:{size:'normal',font:'system-ui'},theme:'warm',...themes.warm,texture:'grain',boardImage:'',stone:'gradient',blackPreset:'classic',whitePreset:'classic',blackImage:'',whiteImage:'',boardText:1,lineWidth:2.5,lineStyle:'solid',sound:'soft',volume:35,moves:true,navigation:false,autoplay:false,soundData:'',soundName:''});
 function clean(value){const d=defaults(),v=value&&typeof value==='object'?value:{};if(v.theme&&v.theme!=='warm'&&!v.texture)d.texture='plain';for(const lang of ['ja','en']){const p=v[lang]||{};d[lang]={size:sizes[p.size]?p.size:'normal',font:typeof p.font==='string'&&!/^url\(/i.test(p.font)&&p.font.length>0&&p.font.length<=80&&!/[\x00-\x1f<>]/.test(p.font)?p.font:'system-ui'};}
 for(const k of ['board','background','panel','text','graph','graphText','win','score'])if(/^#[0-9a-f]{6}$/i.test(v[k]))d[k]=v[k];
 for(const [k,allowed]of Object.entries({theme:Object.keys(themes),texture:['plain','grain','image'],stone:['gradient','flat','image'],blackPreset:['classic','soft','gloss','custom'],whitePreset:['classic','soft','gloss','custom'],sound:['soft','clear','low','custom'],lineStyle:['solid','dash']}))if(allowed.includes(v[k]))d[k]=v[k];
 for(const [k,min,max]of [['boardText',.8,1.2],['lineWidth',1,4],['volume',0,100]])if(Number.isFinite(v[k]))d[k]=Math.max(min,Math.min(max,v[k]));
 for(const k of ['moves','navigation','autoplay'])if(typeof v[k]==='boolean')d[k]=v[k];
 for(const k of ['boardImage','blackImage','whiteImage'])if(typeof v[k]==='string'&&v[k].length<800000&&/^data:image\/(png|jpeg|webp);base64,/.test(v[k]))d[k]=v[k];
 for(const k of ['boardImage','blackImage','whiteImage'])if(d[k]&&typeof v[k+'Name']==='string')d[k+'Name']=v[k+'Name'].slice(0,255);
 for(const side of ['black','white'])if(!v[side+'Preset']&&v[side+'Image'])d[side+'Preset']='custom';
 if(typeof v.soundData==='string'&&v.soundData.length<1500000&&/^data:audio\/(wav|x-wav|wave);base64,/.test(v.soundData))d.soundData=v.soundData;if(d.soundData&&typeof v.soundName==='string')d.soundName=v.soundName.slice(0,255);return d;}
 // Reset only controls belonging to the selected tab. Other tabs, including
 // imported media, retain their current values. Text is language-specific.
 const resetFields={
  board:['theme','board','background','panel','text','texture','boardImage','boardImageName','stone','blackPreset','whitePreset','blackImage','whiteImage','blackImageName','whiteImageName'],
  graph:['graph','graphText','win','score','lineWidth','lineStyle'],
  audio:['sound','volume','moves','navigation','autoplay','soundData','soundName']
 };
 function resetSection(value,section,language='ja'){
  const result=clean(value),standard=defaults();
  if(section==='text'){const lang=language==='en'?'en':'ja';result[lang]={...standard[lang]};result.boardText=standard.boardText;}
  else for(const key of resetFields[section]||[]){
   if(Object.prototype.hasOwnProperty.call(standard,key))result[key]=standard[key];else delete result[key];
  }
  return result;
 }
 // Labels use measured boxes and reserve both endpoints. Keep 25-move ruler ticks separately.
 function labels(max,left,right,measure){max=Math.max(1,max);const result=[{move:0,x:left,anchor:'start'}];const endWidth=measure(String(max));let edge=left+measure('0');
 const step=max<=10?5:max<=50?25:50*Math.max(1,Math.ceil(max/300));
 for(let m=step;m<max;m+=step){const x=left+(right-left)*m/max,half=measure(String(m))/2;if(x-half>=edge+10&&x+half<=right-endWidth-10){result.push({move:m,x,anchor:'middle'});edge=x+half;}}
 if(right-endWidth>=edge+10)result.push({move:max,x:right,anchor:'end'});return result;}
 const api={sizes,themes,defaults,clean,resetSection,labels};if(typeof module!=='undefined')module.exports=api;else root.KifuAppearanceCore=api;
})(typeof window==='undefined'?globalThis:window);
