use std::{net::{IpAddr,Ipv4Addr},sync::{Arc,atomic::{AtomicBool,Ordering}},thread,time::{Duration,Instant},path::PathBuf};
use serde_json::{Value,json};
use tiny_http::{Server,Response,Header,Method,Request};
use include_dir::{include_dir,Dir};
use kifu_katago_backend::Engine;
static WEB:Dir=include_dir!("$CARGO_MANIFEST_DIR/../web");
pub struct Share {stop:Arc<AtomicBool>,thread:Option<thread::JoinHandle<()>>,pub url:String}
impl Drop for Share{fn drop(&mut self){self.stop.store(true,Ordering::Relaxed);if let Some(t)=self.thread.take(){let _=t.join();}}}
fn reply(req:Request,status:u16,body:Vec<u8>,mime:&str){let mut r=Response::from_data(body).with_status_code(status);for (k,v) in [("Content-Type",mime),("Cache-Control","no-store"),("X-Content-Type-Options","nosniff"),("Referrer-Policy","no-referrer"),("X-Frame-Options","DENY")]{r.add_header(Header::from_bytes(k,v).unwrap());}let _=req.respond(r);}
fn header(req:&Request,name:&str)->String{req.headers().iter().find(|h|h.field.as_str().as_str().eq_ignore_ascii_case(name)).map(|h|h.value.to_string()).unwrap_or_default()}
fn json_reply(req:Request,result:Result<Value,String>){let (status,body)=match result{Ok(v)=>(200,json!({"ok":true,"result":v})),Err(e)=>(400,json!({"ok":false,"error":e}))};reply(req,status,body.to_string().into_bytes(),"application/json; charset=utf-8");}
pub fn check_query(v:&Value)->Result<(),String>{
 let commands=v["commands"].as_array().ok_or("GTP命令が不正です")?;
 if commands.is_empty()||commands.len()>2005{return Err("GTP命令数が不正です".into());}
 for value in commands{let text=value.as_str().ok_or("GTP命令が不正です")?;
 if text.len()>32000||text.contains(['\r','\n','\0']){return Err("GTP命令が不正です".into());}
 let mut words=text.split_whitespace();let id=words.next().unwrap_or("");let cmd=words.next().unwrap_or("");
 if id.is_empty()||!id.bytes().all(|b|b.is_ascii_digit())||!["protocol_version","name","version","list_commands","boardsize","clear_board","kata-set-rules","komi","set_position","set_free_handicap","play","clear_cache","kata-analyze","stop"].contains(&cmd){return Err("許可されていないGTP命令です".into());}
 if cmd=="boardsize"&&!matches!(words.next().and_then(|s|s.parse::<u32>().ok()),Some(4..=19)){return Err("盤サイズが不正です".into());}
 }Ok(())
}
impl Share{
 pub fn start(ip:&str,port:u16,approved:Value,default:PathBuf)->Result<Self,String>{
 let addr:Ipv4Addr=ip.parse().map_err(|_|"PCのIPv4アドレスを入力してください")?;if !addr.is_private()&&!addr.is_loopback(){return Err("自宅LAN内のIPv4アドレスを指定してください".into());}
 let server=Server::http((IpAddr::V4(addr),port)).map_err(|e|e.to_string())?;
 let actual_port=server.server_addr().to_ip().ok_or("待受に失敗しました")?.port();let origin=format!("http://{}:{}",addr,actual_port);
 let token=rand::random::<[u8;32]>().iter().map(|b|format!("{:02x}",b)).collect::<String>();let url=format!("{}/#token={}",origin,token);
 let stop=Arc::new(AtomicBool::new(false));let flag=stop.clone();
 let worker=thread::spawn(move||{let mut engine=Engine::new(default);let born=Instant::now();let mut owner=String::new();let mut last=Instant::now();let mut analysis_started:Option<Instant>=None;
 while !flag.load(Ordering::Relaxed)&&born.elapsed()<Duration::from_secs(8*3600){
 if analysis_started.is_some_and(|t|t.elapsed()>Duration::from_secs(65)){let _=engine.send(&json!({"commands":["999999999 stop"]}));analysis_started=None;}
 if !owner.is_empty()&&last.elapsed()>Duration::from_secs(45){engine.stop();owner.clear();}
 let req=match server.recv_timeout(Duration::from_millis(150)){Ok(Some(r))=>r,_=>continue};
 if header(&req,"Host")!=origin.trim_start_matches("http://")||(!header(&req,"Origin").is_empty()&&header(&req,"Origin")!=origin){reply(req,403,b"Forbidden".to_vec(),"text/plain");continue;}
 let path=req.url().split('?').next().unwrap_or("/").to_string();
 if path=="/api/engine"{
 if req.method()!=&Method::Post||header(&req,"X-Kifu-Token")!=token{reply(req,403,b"Forbidden".to_vec(),"text/plain");continue;}
 let client=header(&req,"X-Kifu-Client");if client.len()<16||client.len()>100{json_reply(req,Err("接続IDが不正です".into()));continue;}
 if !owner.is_empty()&&owner!=client{json_reply(req,Err("別の端末が接続中です。切断後に接続してください。".into()));continue;}
 let mut req=req;let mut buf=Vec::new();use std::io::Read;
 if req.as_reader().take(3*1024*1024+1).read_to_end(&mut buf).is_err()||buf.len()>3*1024*1024{json_reply(req,Err("要求が大きすぎます".into()));continue;}
 let v:Value=match serde_json::from_slice(&buf){Ok(v)=>v,Err(e)=>{json_reply(req,Err(e.to_string()));continue}};
 let action=v["action"].as_str().unwrap_or("");let payload=&v["payload"];
 // Only the PC-approved executable/model/config can be launched. Remote paths are ignored.
 let result=match action{"start"=>{if !owner.is_empty(){Err("接続済みです".into())}else{match engine.start(&approved){Ok(r)=>{owner=client.clone();Ok(r)},Err(e)=>Err(e)}}},"poll"=>engine.poll(),"stop"=>{let r=engine.stop();owner.clear();Ok(r)},"send"=>check_query(payload).and_then(|_|{for line in payload["commands"].as_array().unwrap(){let cmd=line.as_str().unwrap().split_whitespace().nth(1).unwrap_or("");if cmd=="kata-analyze"{analysis_started=Some(Instant::now());}else if cmd=="stop"{analysis_started=None;}}engine.send(payload)}),_=>Err("スマホからはこの操作を実行できません".into())};last=Instant::now();json_reply(req,result);continue;
 }
 if req.method()!=&Method::Get{reply(req,405,vec![],"text/plain");continue;}
 let file=if path=="/"{"index.html"}else{path.trim_start_matches('/')};
 if let Some(asset)=WEB.get_file(file){let mut bytes=asset.contents().to_vec();if file=="index.html"{bytes=String::from_utf8_lossy(&bytes).replace("</head>","<meta name=\"kifu-remote\" content=\"1\"></head>").into_bytes();}
 let mime=if file.ends_with(".html"){"text/html; charset=utf-8"}else if file.ends_with(".js"){"application/javascript; charset=utf-8"}else if file.ends_with(".css"){"text/css; charset=utf-8"}else{"application/octet-stream"};reply(req,200,bytes,mime);
 }else{reply(req,404,b"Not found".to_vec(),"text/plain");}
 }engine.stop();});Ok(Self{stop,thread:Some(worker),url})
 }
}
#[cfg(test)]mod tests{use super::*;#[test]fn no_remote_commands(){assert!(check_query(&json!({"commands":["1 protocol_version"]})).is_ok());assert!(check_query(&json!({"commands":["2 loadsgf /secret.sgf"]})).is_err());}#[test]fn no_public_listener(){assert!(Share::start("8.8.8.8",0,json!({}),PathBuf::new()).is_err());}}
