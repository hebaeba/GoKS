//! Window placement is kept independently for normal and simple modes.
use std::{path::PathBuf,sync::Mutex};
use serde_json::{json,Value};
use tauri::{Manager,WebviewWindow,PhysicalPosition,PhysicalSize};
pub struct State(pub Mutex<Data>);
pub struct Data { path:PathBuf, saved:Value, simple:bool, ready:bool, restoring:bool }
fn slot(simple:bool)->&'static str {if simple{"simple"}else{"normal"}}
fn number(v:&Value,key:&str,fallback:f64)->f64 {v[key].as_f64().filter(|x|x.is_finite()).unwrap_or(fallback)}
fn geometry(w:f64,h:f64,x:f64,y:f64,aw:f64,ah:f64)->(f64,f64,f64,f64){
 let w=w.max(360.0).min(aw.max(1.0));let h=h.max(400.0).min(ah.max(1.0));
 (w,h,x.max(0.0).min((aw-w).max(0.0)),y.max(0.0).min((ah-h).max(0.0)))
}
impl State {
 pub fn load(path:PathBuf)->Self {
  let saved=std::fs::read(&path).ok().filter(|b|b.len()<65536).and_then(|b|serde_json::from_slice::<Value>(&b).ok()).filter(Value::is_object).unwrap_or_else(||json!({}));
  let simple=saved["mode"].as_str()==Some("simple");Self(Mutex::new(Data{path,saved,simple,ready:false,restoring:true}))
 }
}
pub fn capture(window:&WebviewWindow){
 let state=window.state::<State>();
 let Ok(mut d)=state.0.try_lock() else{return;};
 if !d.ready||d.restoring||window.is_minimized().unwrap_or(false){return;}
 let mode=slot(d.simple);let maximized=window.is_maximized().unwrap_or(false);
 if maximized {if d.saved[mode].is_object(){d.saved[mode]["maximized"]=json!(true);}return;}
 if let (Ok(size),Ok(pos),Ok(Some(m)),Ok(scale))=(window.inner_size(),window.outer_position(),window.current_monitor(),window.scale_factor()){
  let area=m.work_area();
  d.saved[mode]=json!({"width":size.width as f64/scale,"height":size.height as f64/scale,
   "x":(pos.x-area.position.x) as f64/scale,"y":(pos.y-area.position.y) as f64/scale,
   "monitor":m.name(),"maximized":false});
 }
}
fn restore(window:&WebviewWindow,value:&Value,simple:bool)->Result<(),String>{
 let monitors=window.available_monitors().map_err(|e|e.to_string())?;
 let wanted=value["monitor"].as_str();
 let monitor=monitors.into_iter().find(|m|wanted.is_some()&&m.name().map(|n|n.as_str())==wanted)
  .or(window.current_monitor().map_err(|e|e.to_string())?).or(window.primary_monitor().map_err(|e|e.to_string())?);
 let Some(m)=monitor else{return Ok(());};
 let scale=m.scale_factor();let area=m.work_area();
 window.unmaximize().map_err(|e|e.to_string())?;
 let outer=window.outer_size().map_err(|e|e.to_string())?;let inner=window.inner_size().map_err(|e|e.to_string())?;
 let previous_scale=window.scale_factor().map_err(|e|e.to_string())?;
 let border_w=outer.width.saturating_sub(inner.width) as f64/previous_scale*scale;let border_h=outer.height.saturating_sub(inner.height) as f64/previous_scale*scale;
 let aw=(area.size.width as f64-border_w).max(1.0)/scale;
 let ah=(area.size.height as f64-border_h).max(1.0)/scale;
 let default_h=(980.0-border_h/scale).min(ah);
 let default_w=if simple{default_h-60.0}else{(default_h+740.0).min(aw)};
 let w=number(value,"width",default_w);let h=number(value,"height",default_h);
 let (w,h,x,y)=geometry(w,h,number(value,"x",(aw-w)/2.0),number(value,"y",(ah-h)/2.0),aw,ah);
 window.set_min_size(Some(PhysicalSize::new((360.0*scale).min(area.size.width as f64) as u32,(400.0*scale).min(area.size.height as f64) as u32))).map_err(|e|e.to_string())?;
 window.set_position(PhysicalPosition::new(area.position.x+(x*scale).round() as i32,area.position.y+(y*scale).round() as i32)).map_err(|e|e.to_string())?;
 window.set_size(PhysicalSize::new((w*scale).round() as u32,(h*scale).round() as u32)).map_err(|e|e.to_string())?;
 if value["maximized"].as_bool()==Some(true){window.maximize().map_err(|e|e.to_string())?;}
 Ok(())
}
pub fn initialize(window:&WebviewWindow)->Result<(),String>{
 let state=window.state::<State>();let (value,simple)={let d=state.0.lock().map_err(|e|e.to_string())?;(d.saved[slot(d.simple)].clone(),d.simple)};
 restore(window,&value,simple)?;
 // Keep the last unmaximized rectangle even if the first restored state is maximized.
 let mut d=state.0.lock().map_err(|e|e.to_string())?;d.restoring=false;Ok(())
}
pub fn set_mode(window:&WebviewWindow,simple:bool,width:f64)->Result<(),String>{
 capture(window);
 let state=window.state::<State>();
 let (changed,value)={let mut d=state.0.lock().map_err(|e|e.to_string())?;let changed=d.simple!=simple;d.restoring=true;d.simple=simple;d.saved["mode"]=json!(slot(simple));(changed,d.saved[slot(simple)].clone())};
 let result=(||{
  if changed {restore(window,&value,simple)?;}
  if simple&&!window.is_maximized().map_err(|e|e.to_string())?{
   if !width.is_finite()||width<1.0{return Err("画面幅が不正です".to_string());}
   let scale=window.scale_factor().map_err(|e|e.to_string())?;let inner=window.inner_size().map_err(|e|e.to_string())?;
   let outer=window.outer_size().map_err(|e|e.to_string())?;let border=outer.width.saturating_sub(inner.width);
   let mut target=(width*scale).round().max(360.0*scale) as u32;
   if let Some(m)=window.current_monitor().map_err(|e|e.to_string())?{
    let area=m.work_area();target=target.min(area.size.width.saturating_sub(border));
    let pos=window.outer_position().map_err(|e|e.to_string())?;let x=pos.x.max(area.position.x).min((area.position.x+area.size.width as i32-(target+border) as i32).max(area.position.x));
    if pos.x!=x{window.set_position(PhysicalPosition::new(x,pos.y)).map_err(|e|e.to_string())?;}
   }
   if inner.width!=target{window.set_size(PhysicalSize::new(target,inner.height)).map_err(|e|e.to_string())?;}
  }Ok(())
 })();
 state.0.lock().map_err(|e|e.to_string())?.restoring=false;
 result
}
pub fn ready(window:&WebviewWindow,simple:bool,content_height:Option<f64>)->Result<(),String>{
 let mismatch={let state=window.state::<State>();let d=state.0.lock().map_err(|e|e.to_string())?;d.simple!=simple};
 if mismatch {set_mode(window,simple,window.inner_size().map_err(|e|e.to_string())?.width as f64/window.scale_factor().map_err(|e|e.to_string())?)?;}
 // On the very first normal launch, remove width-limited blank space below the square board.
 // Later launches retain the user's saved geometry, including maximized state.
 let first={let state=window.state::<State>();let d=state.0.lock().map_err(|e|e.to_string())?;!d.ready&&!d.saved[slot(simple)].is_object()};
 if first&&!simple {if let Some(height)=content_height.filter(|h|h.is_finite()&&*h>=400.0){
  let scale=window.scale_factor().map_err(|e|e.to_string())?;let inner=window.inner_size().map_err(|e|e.to_string())?;
  let target=(height*scale).ceil() as u32;if target+24<inner.height{window.set_size(PhysicalSize::new(inner.width,target)).map_err(|e|e.to_string())?;}
 }}
 {let state=window.state::<State>();let mut d=state.0.lock().map_err(|e|e.to_string())?;d.ready=true;d.restoring=false;}
 capture(window);window.show().map_err(|e|e.to_string())
}
pub fn save(window:&WebviewWindow){
 capture(window);let state=window.state::<State>();if let Ok(d)=state.0.lock(){
  if let Ok(bytes)=serde_json::to_vec_pretty(&d.saved){let _=std::fs::write(&d.path,bytes);}
 };
}
#[cfg(test)]mod tests{use super::*;
 #[test]fn changed_monitor_clamps_to_work_area(){assert_eq!(geometry(1800.0,1000.0,1500.0,-100.0,1200.0,700.0),(1200.0,700.0,0.0,0.0));}
 #[test]fn ordinary_size_and_position_are_retained(){assert_eq!(geometry(1100.0,800.0,30.0,20.0,1900.0,1000.0),(1100.0,800.0,30.0,20.0));}
 #[test]fn small_work_area_is_respected(){assert_eq!(geometry(100.0,100.0,0.0,0.0,300.0,350.0),(300.0,350.0,0.0,0.0));}
}
