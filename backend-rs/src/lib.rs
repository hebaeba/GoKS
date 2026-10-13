use serde_json::{json, Value};
use std::{fs, io::{BufRead, BufReader, Write}, path::{Path, PathBuf}, process::{Child, Command, Stdio}, sync::mpsc::{sync_channel, Receiver}, thread};

pub struct Engine { child: Option<Child>, receiver: Option<Receiver<Value>>, meta: Value, default_config: PathBuf }
impl Engine {
    pub fn new(default_config: PathBuf) -> Self { Self { child: None, receiver: None, meta: Value::Null, default_config } }
    pub fn stop(&mut self) -> Value { if let Some(mut child)=self.child.take(){let _=child.kill();let _=child.wait();}self.receiver=None;json!({"running":false}) }
    fn file(payload:&Value,key:&str,label:&str)->Result<PathBuf,String>{
        let text=payload[key].as_str().filter(|s|!s.trim().is_empty()).ok_or_else(||format!("{}を指定してください",label))?;
        let p=Path::new(text);if !p.is_file(){return Err(format!("{}が見つかりません：{}",label,text));}fs::canonicalize(p).map_err(|e|e.to_string())
    }
    fn pick(payload:&Value)->Result<Value,String>{
        let kind=payload["kind"].as_str().unwrap_or("");if !["exe","model","config"].contains(&kind){return Err("ファイルの種類が不正です".into());}
        #[cfg(windows)]{
            use std::os::windows::process::CommandExt;
            let script=format!("& {{\n{}\n}} -Kind {}",include_str!("../../backend/select-file.ps1"),kind);
            let out=Command::new("powershell.exe").args(["-NoLogo","-NoProfile","-STA","-Command",&script]).creation_flags(0x08000000).output().map_err(|e|format!("選択窓を開けません：{}",e))?;
            if !out.status.success(){return Err(format!("選択窓を開けません：{}",String::from_utf8_lossy(&out.stderr)));}
            let text=String::from_utf8_lossy(&out.stdout).trim().trim_start_matches('\u{feff}').to_string();
            if text.is_empty(){return Ok(json!({"path":null}));}
            Self::validate_extension(kind,Path::new(&text))?;if !Path::new(&text).is_file(){return Err("ファイルが見つかりません".into());}return Ok(json!({"path":text}));
        }
        #[cfg(not(windows))]Err("選択ボタンはWindows用です。パスを直接入力してください。".into())
    }
    fn validate_extension(kind:&str,path:&Path)->Result<(),String>{
        let text=path.to_string_lossy().to_lowercase();
        let valid=match kind{"exe"=>!cfg!(windows)||text.ends_with(".exe"),"model"=>[".bin.gz",".bin",".txt.gz",".txt"].iter().any(|e|text.ends_with(e)),"config"=>text.ends_with(".cfg"),_=>false};
        if valid{Ok(())}else{Err(format!("{} の拡張子が対応していません（exe / bin.gz・bin・txt.gz・txt / cfg）",kind))}
    }
    pub fn start(&mut self,payload:&Value)->Result<Value,String>{
        let exe=Self::file(payload,"exe","実行ファイル")?;let model=Self::file(payload,"model","モデル")?;
        let cfg=if payload["config"].as_str().unwrap_or("").trim().is_empty(){self.default_config.clone()}else{Self::file(payload,"config","設定ファイル")?};
        for (kind,file) in [("exe",&exe),("model",&model),("config",&cfg)]{Self::validate_extension(kind,file)?;}
        let config_text=fs::read_to_string(&cfg).map_err(|e|e.to_string())?;
        let model_meta=fs::metadata(&model).map_err(|e|e.to_string())?;
        self.stop();
        let mut cmd=Command::new(&exe);cmd.args(["analysis","-model"]).arg(&model).arg("-config").arg(&cfg).args(["-override-config","reportAnalysisWinratesAs=BLACK"]).current_dir(exe.parent().unwrap()).stdin(Stdio::piped()).stdout(Stdio::piped()).stderr(Stdio::piped());
        #[cfg(windows)]{use std::os::windows::process::CommandExt;cmd.creation_flags(0x08000000);}
        let mut child=cmd.spawn().map_err(|e|format!("KataGoを起動できません：{}",e))?;
        let stdout=child.stdout.take().unwrap();let stderr=child.stderr.take().unwrap();let (tx,rx)=sync_channel(5000);let errtx=tx.clone();
        thread::spawn(move||{for line in BufReader::new(stdout).lines(){let Ok(line)=line else {break};if line.len()>4*1024*1024{let _=tx.send(json!({"type":"log","message":"解析応答が長すぎます"}));break;}let event=match serde_json::from_str::<Value>(&line){Ok(data)=>json!({"type":"result","data":data}),Err(_)=>json!({"type":"log","message":line.chars().take(1000).collect::<String>()})};if tx.send(event).is_err(){break;}}});
        thread::spawn(move||{for line in BufReader::new(stderr).lines(){let Ok(line)=line else{break};if errtx.send(json!({"type":"log","message":line.chars().take(4000).collect::<String>()})).is_err(){break;}}});
        self.meta=json!({"engine":exe.file_name().unwrap().to_string_lossy(),"model":model.file_name().unwrap().to_string_lossy(),"modelBytes":model_meta.len(),"modelModifiedUnix":model_meta.modified().ok().and_then(|t|t.duration_since(std::time::UNIX_EPOCH).ok()).map(|d|d.as_secs()),"config":cfg.file_name().unwrap().to_string_lossy(),"configText":config_text.chars().take(100000).collect::<String>(),"perspective":"BLACK"});
        self.receiver=Some(rx);self.child=Some(child);Ok(json!({"running":true,"meta":self.meta}))
    }
    pub fn send(&mut self,query:&Value)->Result<Value,String>{
        let id=query["id"].as_str().ok_or("解析IDが不正です")?;if id.len()>160{return Err("解析IDが長すぎます".into());}
        if let Some(action)=query["action"].as_str(){if !["query_version","query_models","terminate","terminate_all"].contains(&action){return Err("未対応の操作です".into());}}
        let line=serde_json::to_string(query).map_err(|e|e.to_string())?;if line.len()>2*1024*1024{return Err("リクエストが大きすぎます".into());}
        let input=self.child.as_mut().and_then(|c|c.stdin.as_mut()).ok_or("KataGoを起動してください")?;
        writeln!(input,"{}",line).and_then(|_|input.flush()).map_err(|e|e.to_string())?;Ok(json!({"accepted":true}))
    }
    pub fn poll(&mut self)->Result<Value,String>{
        let mut events:Vec<Value>=self.receiver.as_ref().map(|rx|rx.try_iter().take(512).collect()).unwrap_or_default();
        if let Some(child)=self.child.as_mut(){if let Some(status)=child.try_wait().map_err(|e|e.to_string())?{events.push(json!({"type":"exit","message":format!("KataGoが終了しました（{}）",status)}));self.child=None;}}
        Ok(json!({"running":self.child.is_some(),"events":events,"logs":[],"meta":self.meta}))
    }
    pub fn call(&mut self,action:&str,payload:&Value)->Result<Value,String>{match action{"pick"=>Self::pick(payload),"start"=>self.start(payload),"stop"=>Ok(self.stop()),"send"=>self.send(payload),"poll"=>self.poll(),_=>Err("操作が不正です".into())}}
}
impl Drop for Engine { fn drop(&mut self){self.stop();} }
#[cfg(test)] mod tests {use super::*;#[test]fn invalid_inputs(){let mut e=Engine::new(PathBuf::from("missing.cfg"));assert!(e.start(&json!({})).is_err());assert!(e.send(&json!({"id":"x"})).is_err());assert!(e.call("unknown",&Value::Null).is_err());assert_eq!(e.poll().unwrap()["running"],false);}}
