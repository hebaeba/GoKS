#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
use std::{sync::{Arc,Mutex},path::PathBuf};
use tauri::Manager;
use serde_json::{Value,json};
use kifu_katago_backend::Engine;
use kifu_lan_server::Share;
struct Desktop{black:Arc<Mutex<Engine>>,white:Arc<Mutex<Engine>>,engine:Arc<Mutex<Engine>>,share:Arc<Mutex<Option<Share>>>,default:PathBuf}
#[tauri::command]
async fn engine_call(action:String,payload:Value,state:tauri::State<'_,Desktop>)->Result<Value,String>{
 if action=="defaults" {
  let base=std::env::current_exe().map_err(|e|e.to_string())?.parent().ok_or("実行場所を取得できません")?.join("engines/eigen");
  let missing:Vec<String>=["katago.exe","model.bin.gz","default_gtp.cfg","z.dll","zip.dll","libssl-3-x64.dll","libcrypto-3-x64.dll"].iter().filter(|n|!base.join(n).is_file()).map(|n|n.to_string()).collect();
  return Ok(json!({"name":"KataGo Eigen（CPU）","exe":base.join("katago.exe"),"model":base.join("model.bin.gz"),"config":base.join("default_gtp.cfg"),"missing":missing}));
 }
 let engine=match payload["session"].as_str(){None=>state.engine.clone(),Some("black")=>state.black.clone(),Some("white")=>state.white.clone(),_=>return Err("対局セッションが不正です".into())};tauri::async_runtime::spawn_blocking(move||engine.lock().map_err(|_|"エンジンの状態を取得できません".to_string())?.call(&action,&payload)).await.map_err(|e|e.to_string())?
}
#[tauri::command]
async fn mobile_share(action:String,payload:Value,state:tauri::State<'_,Desktop>)->Result<Value,String>{
 let share=state.share.clone();let default=state.default.clone();
 tauri::async_runtime::spawn_blocking(move||{let mut guard=share.lock().map_err(|_|"共有状態を取得できません")?;match action.as_str(){
 "start"=>{if guard.is_some(){return Err("すでにスマホ接続を開始しています".into());}let ip=payload["ip"].as_str().unwrap_or("");let server=Share::start(ip,47832,payload["config"].clone(),default)?;let url=server.url.clone();*guard=Some(server);Ok(json!({"url":url}))},
 "stop"=>{*guard=None;Ok(json!({"stopped":true}))},_=>Err("操作が不正です".into())}}).await.map_err(|e|e.to_string())?
}
#[tauri::command]
async fn desktop_save(name:String,bytes:Vec<u8>)->Result<Value,String>{
 if bytes.len()>64*1024*1024{return Err("保存ファイルは64MB以内にしてください".into());}
 tauri::async_runtime::spawn_blocking(move||{
 #[cfg(windows)]{let filename=std::path::Path::new(&name).file_name().and_then(|v|v.to_str()).unwrap_or("kifu.sgf");if let Some(path)=rfd::FileDialog::new().set_file_name(filename).save_file(){std::fs::write(path,bytes).map_err(|e|e.to_string())?;Ok(json!({"saved":true}))}else{Ok(json!({"saved":false}))}}
 #[cfg(not(windows))]{let _=(name,bytes);Err("この保存機能はWindows向けです".into())}
 }).await.map_err(|e|e.to_string())?
}
#[derive(Default)]
struct SimpleWindow(Mutex<Option<(u32,bool,tauri::PhysicalPosition<i32>)>>);
#[tauri::command]
fn desktop_simple_window(window:tauri::WebviewWindow,simple:bool,width:f64,state:tauri::State<'_,SimpleWindow>)->Result<(),String>{
 let mut saved=state.0.lock().map_err(|_|"画面サイズを記憶できません")?;
 let current=window.inner_size().map_err(|e|e.to_string())?;
 if simple {
  if !width.is_finite() || width<1.0 {return Err("画面幅が不正です".into());}
  if saved.is_none(){
   let maximized=window.is_maximized().map_err(|e|e.to_string())?;
   *saved=Some((current.width,maximized,window.outer_position().map_err(|e|e.to_string())?));
   if maximized {window.unmaximize().map_err(|e|e.to_string())?;}
  }
  let scale=window.scale_factor().map_err(|e|e.to_string())?;
  let outer=window.outer_size().map_err(|e|e.to_string())?;
  let inner=window.inner_size().map_err(|e|e.to_string())?;
  let border=outer.width.saturating_sub(inner.width);
  let mut target=(width*scale).round().max(360.0) as u32;
  if let Some(monitor)=window.current_monitor().map_err(|e|e.to_string())?{
   target=target.min(monitor.size().width.saturating_sub(border+20));
   let pos=window.outer_position().map_err(|e|e.to_string())?;
   let left=monitor.position().x;let right=left+monitor.size().width as i32;
   let x=pos.x.max(left).min((right-(target+border) as i32).max(left));
   if x!=pos.x{window.set_position(tauri::PhysicalPosition::new(x,pos.y)).map_err(|e|e.to_string())?;}
  }
  if inner.width!=target || inner.height!=current.height {window.set_size(tauri::PhysicalSize::new(target,current.height)).map_err(|e|e.to_string())?;}
 } else if let Some((normal_width,maximized,position))=*saved {
  window.set_size(tauri::PhysicalSize::new(normal_width,current.height)).map_err(|e|e.to_string())?;
  window.set_position(position).map_err(|e|e.to_string())?;
  if maximized {window.maximize().map_err(|e|e.to_string())?;}
  *saved=None;
 }
 Ok(())
}
#[tauri::command]
fn desktop_close(app:tauri::AppHandle){app.exit(0);}
#[tauri::command]
async fn desktop_print(window:tauri::WebviewWindow)->Result<(),String>{window.print().map_err(|e|e.to_string())}
fn main(){
 let app=tauri::Builder::default().manage(SimpleWindow::default()).on_window_event(|window,event|{
 if window.label()=="main" {if let tauri::WindowEvent::CloseRequested{api,..}=event{
  api.prevent_close();if let Some(view)=window.get_webview_window("main"){let _=view.eval("window.KifuDialogs?.requestClose()");}return;
 }}

 if window.label()!="main"{return;}
 let Some(webview)=window.get_webview_window("main") else{return;};
 // Combined WebviewWindow drag notifications are delivered through WindowEvent.
 let phase=match event {
  tauri::WindowEvent::DragDrop(tauri::DragDropEvent::Enter{..})=>Some("enter"),
  tauri::WindowEvent::DragDrop(tauri::DragDropEvent::Leave)=>Some("leave"),
  tauri::WindowEvent::DragDrop(tauri::DragDropEvent::Drop{..})=>Some("drop"),
  _=>None,
 };
 if let Some(phase)=phase{let _=webview.eval(format!("window.KifuImageImport?.nativeDrag({0}) || window.IndependentGo?.nativeDrag({0});",json!(phase)));}
 // Activate the destination during an external record drag, without permanent
 // always-on-top. This also makes a later replacement confirmation interactive.
 let activate=match event {
  tauri::WindowEvent::DragDrop(tauri::DragDropEvent::Enter{paths,..})|
  tauri::WindowEvent::DragDrop(tauri::DragDropEvent::Drop{paths,..})=>
    paths.len()==1 && paths[0].extension().and_then(|v|v.to_str()).map(|v|["sgf","ngf","ugf","ugi","gib","mgt","png","jpg","jpeg","webp"].contains(&v.to_ascii_lowercase().as_str())).unwrap_or(false),
  _=>false,
 };
 if activate {if let Some(window)=webview.get_webview_window("main"){let _=window.unminimize();let _=window.show();let _=window.set_focus();}let _=webview.set_focus();}

 if let tauri::WindowEvent::DragDrop(tauri::DragDropEvent::Drop{paths,position})=event{
  let paths=paths.clone();let x=position.x;let y=position.y;let view=webview.clone();
  std::thread::spawn(move||{
   let result=(||->Result<Value,String>{
    if paths.len()!=1{return Err("ファイルは１つずつ読み込んでください".into());}
    let path=&paths[0];let ext=path.extension().and_then(|v|v.to_str()).unwrap_or("").to_ascii_lowercase();
    if !["sgf","ngf","ugf","ugi","gib","mgt","png","jpg","jpeg","webp"].contains(&ext.as_str()){return Err("対応する棋譜または画像ファイルをドロップしてください".into());}
    if !path.is_file(){return Err("棋譜ファイルを指定してください".into());}
    let limit=if ["png","jpg","jpeg","webp"].contains(&ext.as_str()){25*1024*1024}else{2*1024*1024};
    use std::io::Read;let file=std::fs::File::open(path).map_err(|e|e.to_string())?;let mut bytes=Vec::new();file.take(limit+1).read_to_end(&mut bytes).map_err(|e|e.to_string())?;
    if bytes.len() as u64>limit{return Err("棋譜は2MB、画像は25MB以内にしてください".into());}
    Ok(json!({"name":path.file_name().and_then(|v|v.to_str()).unwrap_or("kifu.sgf"),"bytes":bytes,"x":x,"y":y}))
   })();
   let payload=result.unwrap_or_else(|error|json!({"error":error,"x":x,"y":y}));
   let _=view.eval(format!("(()=>{{const p={0};window.KifuImageImport?.nativeDrop(p) || window.IndependentGo?.nativeDrop(p);}})();",payload));
  });
 }
 }).setup(|app|{
 // Account for Windows decorations in physical pixels; keep the initial outer height <= 980.
 if let Some(window)=app.get_webview_window("main"){
   if let (Ok(outer),Ok(inner),Ok(Some(monitor)))=(window.outer_size(),window.inner_size(),window.current_monitor()){
     let border_h=outer.height.saturating_sub(inner.height);
     let border_w=outer.width.saturating_sub(inner.width);
     let target_h=980u32.min(monitor.size().height.saturating_sub(80));
     let target_w=outer.width.min(monitor.size().width.saturating_sub(40));
     let _=window.set_min_size(Some(tauri::PhysicalSize::new(360u32,500u32)));
     let _=window.set_size(tauri::PhysicalSize::new(target_w.saturating_sub(border_w),target_h.saturating_sub(border_h)));
     let _=window.center();
   }
 }

 let dir=app.path().app_config_dir()?;std::fs::create_dir_all(&dir)?;let cfg=dir.join("default_gtp.cfg");if !cfg.exists(){std::fs::write(&cfg,include_str!("../../config/default_gtp.cfg"))?;}
 app.manage(Desktop{black:Arc::new(Mutex::new(Engine::new(cfg.clone()))),white:Arc::new(Mutex::new(Engine::new(cfg.clone()))),engine:Arc::new(Mutex::new(Engine::new(cfg.clone()))),share:Arc::new(Mutex::new(None)),default:cfg});Ok(())
 }).invoke_handler(tauri::generate_handler![engine_call,mobile_share,desktop_save,desktop_print,desktop_close,desktop_simple_window]).build(tauri::generate_context!()).expect("棋譜編集ツールを起動できませんでした");
 app.run(|handle,event|{if let tauri::RunEvent::Exit=event{if let Some(state)=handle.try_state::<Desktop>(){for engine in [&state.engine,&state.black,&state.white]{if let Ok(mut engine)=engine.lock(){engine.stop();}}if let Ok(mut share)=state.share.lock(){*share=None;}}}});
}
