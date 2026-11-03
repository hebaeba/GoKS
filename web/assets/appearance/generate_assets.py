from pathlib import Path
import math, random, wave, struct, json
OUT=Path(__file__).resolve().parent
THEMES={
 "warm":{"name":"木肌 / Warm wood","board":"#E7C47B","grain":"#B98C45","background":"#EDF3F0","panel":"#F8FBF9","text":"#203A34","accent":"#215E50","graph":"#495650","winrate":"#69F044","score":"#F36BE8"},
 "paper":{"name":"白灰 / Paper","board":"#E8E7DF","grain":"#CBC9BD","background":"#F0F1F2","panel":"#FFFFFF","text":"#1F2933","accent":"#285E71","graph":"#F4F5F6","winrate":"#16763C","score":"#9D237D"},
 "night":{"name":"夜 / Night","board":"#B49B71","grain":"#88724E","background":"#202A2B","panel":"#2D393A","text":"#F0F5F3","accent":"#397E6A","graph":"#1B2528","winrate":"#7AED6B","score":"#F488E7"}}
for key,t in THEMES.items():
 rng=random.Random(100)
 paths=''
 for i in range(20):
  x=i*32+rng.uniform(-9,9)
  paths+=f'<path d="M{x:.2f} 0 C{x+12:.2f} 220 {x-12:.2f} 420 {x:.2f} 640"/>'
 svg=f'<svg xmlns="http://www.w3.org/2000/svg" width="640" height="640" viewBox="0 0 640 640"><rect width="640" height="640" fill="{t["board"]}"/><g fill="none" stroke="{t["grain"]}" stroke-width="1" opacity="0.16">{paths}</g></svg>'
 (OUT/f'board-{key}.svg').write_text(svg,encoding='utf-8')
(OUT/'themes.json').write_text(json.dumps({'format':'GoKifuStudio-theme-prototype-1','note':'Preview palette; requires application integration.','themes':THEMES},ensure_ascii=False,indent=2),encoding='utf-8')
for name,freq,duration,seed in [('stone-soft',1250,0.16,1),('stone-clear',1800,0.13,2),('stone-low',820,0.20,3)]:
 rng=random.Random(seed);rate=44100;data=[]
 for i in range(int(rate*duration)):
  t=i/rate
  attack=min(1,t/.0015)
  tone=(math.sin(2*math.pi*freq*t)*.50+math.sin(2*math.pi*freq*1.73*t)*.24)*math.exp(-t/0.025)
  noise=(rng.random()*2-1)*.30*math.exp(-t/.006)
  data.append((tone+noise)*attack*min(1,(duration-t)/.01))
 peak=max(map(abs,data));pcm=b''.join(struct.pack('<h',round(v/peak*.70*32767)) for v in data)
 with wave.open(str(OUT/f'{name}.wav'),'wb') as f:f.setparams((1,2,rate,0,'NONE','not compressed'));f.writeframes(pcm)
