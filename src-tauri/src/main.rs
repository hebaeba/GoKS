#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
use std::{sync::{Arc,Mutex},path::PathBuf};
use tauri::Manager;
mod window_state;
mod save_name;
mod auxiliary;
mod fonts;
use serde_json::{Value,json};
use kifu_katago_backend::Engine;
use kifu_lan_server::Share;
struct Desktop{black:Arc<Mutex<Engine>>,white:Arc<Mutex<Engine>>,engine:Arc<Mutex<Engine>>,share:Arc<Mutex<Option<Share>>>,default:PathBuf}
#[tauri::command]
async fn engine_call(action:String,mut payload:Value,state:tauri::State<'_,Desktop>)->Result<Value,String>{
 if action=="defaults" {
  let base=std::env::current_exe().map_err(|e|e.to_string())?.parent().ok_or("実行場所を取得できません")?.join("engines/katago");
  let mut profiles:Vec<Value>=serde_json::from_str(include_str!("../../engines/manifest.json")).map_err(|e|e.to_string())?;
  for p in &mut profiles{
   let mut missing=Vec::<String>::new();
   for key in ["exe","model","config"]{let relative=p[key].as_str().ok_or("内蔵エンジン定義が不正です")?.to_string();let file=base.join(&relative);if !file.is_file(){missing.push(relative.clone());}p[key]=json!(format!("./engines/katago/{}",relative.replace('\\',"/")));}
   p["kind"]=json!("katago");p["workdir"]=json!("./engines/katago");p["missing"]=json!(missing);
  }
  let mut defaults=profiles.first().cloned().ok_or("内蔵エンジンがありません")?;defaults["profiles"]=json!(profiles);return Ok(defaults);
 }
 if action=="start" {
  let exe=std::env::current_exe().map_err(|e|e.to_string())?;
  let base=exe.parent().ok_or("実行場所を取得できません")?;
  for key in ["exe","model","config","workdir"] {
   if let Some(value)=payload[key].as_str().filter(|s|!s.is_empty()) {
    let path=PathBuf::from(value);if path.is_relative(){payload[key]=json!(base.join(path));}
   }
  }
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
async fn desktop_save(name:String,bytes:Vec<u8>,language:Option<String>)->Result<Value,String>{
 if bytes.len()>64*1024*1024{return Err("保存ファイルは64MB以内にしてください".into());}
 tauri::async_runtime::spawn_blocking(move||{
 #[cfg(windows)]{let (initial,kind)=save_name::parts(&name);let exe=std::env::current_exe().map_err(|e|e.to_string())?;let directory=exe.parent().ok_or("保存先フォルダーを取得できません")?;let mut dialog=rfd::FileDialog::new().set_directory(directory).set_file_name(initial);if let Some((label,extension))=kind{dialog=dialog.add_filter(save_name::label(label,extension,language.as_deref()),&[extension]);}if let Some(path)=dialog.save_file(){std::fs::write(path,bytes).map_err(|e|e.to_string())?;Ok(json!({"saved":true}))}else{Ok(json!({"saved":false}))}}
 #[cfg(not(windows))]{let _=(name,bytes,language);Err("この保存機能はWindows向けです".into())}
 }).await.map_err(|e|e.to_string())?
}
#[tauri::command]
fn desktop_simple_window(window:tauri::WebviewWindow,simple:bool,width:f64)->Result<Value,String>{
 window_state::set_mode(&window,simple,width)?;
 let size=window.inner_size().map_err(|e|e.to_string())?;
 let scale=window.scale_factor().map_err(|e|e.to_string())?;
 Ok(json!({"width":size.width as f64/scale,"height":size.height as f64/scale}))
}
#[tauri::command]
fn desktop_ready(window:tauri::WebviewWindow,simple:bool,content_height:Option<f64>)->Result<(),String>{window_state::ready(&window,simple,content_height)}
#[tauri::command]
fn desktop_close(app:tauri::AppHandle){if let Some(w)=app.get_webview_window("main"){window_state::save(&w);}app.exit(0);}
#[tauri::command]
async fn desktop_print(window:tauri::WebviewWindow)->Result<(),String>{window.print().map_err(|e|e.to_string())}
fn main(){
 let app=tauri::Builder::default().on_window_event(|window,event|{
 if window.label()=="main" {if let tauri::WindowEvent::CloseRequested{api,..}=event{
  api.prevent_close();if let Some(view)=window.get_webview_window("main"){let _=view.eval("window.KifuDialogs?.requestClose()");}return;
 }}

 if !["main","aux-image"].contains(&window.label()){return;}
 let Some(webview)=window.get_webview_window(window.label()) else{return;};
 if window.label()=="main" && matches!(event,tauri::WindowEvent::Resized(_)|tauri::WindowEvent::Moved(_)|tauri::WindowEvent::ScaleFactorChanged{..}) && webview.try_state::<window_state::State>().is_some(){window_state::capture(&webview);}
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
 if activate {if let Some(window)=webview.get_webview_window(window.label()){let _=window.unminimize();let _=window.show();let _=window.set_focus();}let _=webview.set_focus();}

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
 let state_dir=app.path().app_config_dir()?;std::fs::create_dir_all(&state_dir)?;
 app.manage(window_state::State::load(state_dir.join("window-layout.json")));
 if let Some(window)=app.get_webview_window("main"){
  if let Err(error)=window_state::initialize(&window){eprintln!("Window restoration: {error}");}
  // Recovery for a failed frontend: never leave an invisible process indefinitely.
  let fallback=window.clone();std::thread::spawn(move||{std::thread::sleep(std::time::Duration::from_secs(5));if !fallback.is_visible().unwrap_or(true){let _=fallback.show();}});
 }
 let dir=app.path().app_config_dir()?;std::fs::create_dir_all(&dir)?;let cfg=dir.join("default_gtp.cfg");if !cfg.exists(){std::fs::write(&cfg,include_str!("../../config/default_gtp.cfg"))?;}
 app.manage(Desktop{black:Arc::new(Mutex::new(Engine::new(cfg.clone()))),white:Arc::new(Mutex::new(Engine::new(cfg.clone()))),engine:Arc::new(Mutex::new(Engine::new(cfg.clone()))),share:Arc::new(Mutex::new(None)),default:cfg});Ok(())
 }).invoke_handler(tauri::generate_handler![fonts::desktop_fonts,auxiliary::auxiliary,engine_call,mobile_share,desktop_save,desktop_print,desktop_close,desktop_simple_window,desktop_ready]).build(tauri::generate_context!()).expect("棋譜編集ツールを起動できませんでした");
 app.run(|handle,event|{if let tauri::RunEvent::Exit=event{if let Some(state)=handle.try_state::<Desktop>(){for engine in [&state.engine,&state.black,&state.white]{if let Ok(mut engine)=engine.lock(){engine.stop();}}if let Ok(mut share)=state.share.lock(){*share=None;}}}});
}
