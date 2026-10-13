#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
use std::{sync::{Arc,Mutex},path::PathBuf};
use tauri::Manager;
use serde_json::{Value,json};
use kifu_katago_backend::Engine;
use kifu_lan_server::Share;
struct Desktop{engine:Arc<Mutex<Engine>>,share:Arc<Mutex<Option<Share>>>,default:PathBuf}
#[tauri::command]
async fn engine_call(action:String,payload:Value,state:tauri::State<'_,Desktop>)->Result<Value,String>{
 let engine=state.engine.clone();tauri::async_runtime::spawn_blocking(move||engine.lock().map_err(|_|"エンジンの状態を取得できません".to_string())?.call(&action,&payload)).await.map_err(|e|e.to_string())?
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
fn main(){
 let app=tauri::Builder::default().setup(|app|{
 let dir=app.path().app_config_dir()?;std::fs::create_dir_all(&dir)?;let cfg=dir.join("analysis_cpu.cfg");if !cfg.exists(){std::fs::write(&cfg,include_str!("../../config/analysis_cpu.cfg"))?;}
 app.manage(Desktop{engine:Arc::new(Mutex::new(Engine::new(cfg.clone()))),share:Arc::new(Mutex::new(None)),default:cfg});Ok(())
 }).invoke_handler(tauri::generate_handler![engine_call,mobile_share,desktop_save]).build(tauri::generate_context!()).expect("棋譜編集ツールを起動できませんでした");
 app.run(|handle,event|{if let tauri::RunEvent::Exit=event{if let Some(state)=handle.try_state::<Desktop>(){if let Ok(mut engine)=state.engine.lock(){engine.stop();}if let Ok(mut share)=state.share.lock(){*share=None;}}}});
}
