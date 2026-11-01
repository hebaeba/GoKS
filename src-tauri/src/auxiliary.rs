use serde_json::{json,Value};
use tauri::{Manager,WebviewWindow,AppHandle,WebviewWindowBuilder,WebviewUrl};
fn label(kind:&str)->Result<&'static str,String>{match kind{"image"=>Ok("aux-image"),"score"=>Ok("aux-score"),"estimate"=>Ok("aux-estimate"),"panel"=>Ok("aux-panel"),_=>Err("補助窓の種類が不正です".into())}}
fn deliver(window:&WebviewWindow,message:Value)->Result<(),String>{
 window.eval(format!("window.dispatchEvent(new CustomEvent('kifu-aux',{{detail:{}}}));",message)).map_err(|e|e.to_string())
}
#[tauri::command]
pub async fn auxiliary(app:AppHandle,window:WebviewWindow,action:String,kind:String,payload:Value)->Result<Value,String>{
 let target=label(&kind)?;
 if window.label()!="main" && window.label()!=target{return Err("補助窓へのアクセスが不正です".into());}
 match action.as_str(){
 "open"=>{
  if window.label()!="main"{return Err("本体から開いてください".into());}
  let id=payload["id"].as_str().ok_or("補助窓の識別子がありません")?;
  if id.is_empty()||id.len()>80||!id.chars().all(|c|c.is_ascii_alphanumeric()||c=='-'){return Err("補助窓の識別子が不正です".into());}
  let width=payload["width"].as_f64().unwrap_or(960.0).clamp(400.0,1400.0);
  let height=payload["height"].as_f64().unwrap_or(820.0).clamp(320.0,1000.0);
  let url=format!("auxiliary.html?kind={}&id={}",kind,id);
  if let Some(w)=app.get_webview_window(target){
    w.eval(format!("location.replace({});",serde_json::to_string(&url).map_err(|e|e.to_string())?)).map_err(|e|e.to_string())?;
    let _=w.unminimize();let _=w.show();w.set_focus().map_err(|e|e.to_string())?;
    return Ok(json!({"existing":true}));
  }
  let w=WebviewWindowBuilder::new(&app,target,WebviewUrl::App(url.into()))
    .title(if kind=="image"{"画像から局面を取り込む"}else if kind=="estimate"{"推定値"}else if kind=="panel"{"詳細メニュー"}else{"地合い計算"})
    .inner_size(width,height).min_inner_size(400.0,320.0).resizable(true)
    .maximizable(true).minimizable(true).decorations(true).always_on_top(kind=="score")
    .build().map_err(|e|e.to_string())?;
  let owner=app.clone();let k=kind.clone();let session=id.to_string();
  w.on_window_event(move|event|{if matches!(event,tauri::WindowEvent::Destroyed){if let Some(main)=owner.get_webview_window("main"){let _=deliver(&main,json!({"kind":k,"id":session,"type":"closed"}));}}});
  w.set_focus().map_err(|e|e.to_string())?;Ok(json!({"opened":true}))
 },
 "owner-focus"=>{if let Some(w)=app.get_webview_window("main"){let _=w.unminimize();w.set_focus().map_err(|e|e.to_string())?;}Ok(json!({}))},
 "close"=>{if let Some(w)=app.get_webview_window(target){w.destroy().map_err(|e|e.to_string())?;}Ok(json!({}))},
 "focus"=>{if let Some(w)=app.get_webview_window(target){let _=w.unminimize();w.set_focus().map_err(|e|e.to_string())?;}Ok(json!({}))},
 "send"=>{
  let destination=if window.label()=="main"{target}else{"main"};
  let w=app.get_webview_window(destination).ok_or("相手の窓が閉じられました")?;
  if window.label()!="main"&&payload["type"].as_str()==Some("image-import"){let _=w.unminimize();let _=w.set_focus();}
  deliver(&w,json!({"kind":kind,"id":payload["id"],"type":payload["type"],"data":payload["data"]}))?;Ok(json!({}))
 },_=>Err("補助窓の操作が不正です".into())}
}
