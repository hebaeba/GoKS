use kifu_lan_server::Share;
use serde_json::{json,Value};
use std::{net::TcpStream,io::{Read,Write},path::PathBuf};
fn req(url:&str,method:&str,path:&str,token:&str,client:&str,body:&Value)->String{
 let host=url.trim_start_matches("http://").split('/').next().unwrap();let mut s=TcpStream::connect(host).unwrap();s.set_read_timeout(Some(std::time::Duration::from_secs(3))).unwrap();let b=body.to_string();write!(s,"{} {} HTTP/1.1\r\nHost: {}\r\nOrigin: http://{}\r\nX-Kifu-Token: {}\r\nX-Kifu-Client: {}\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}",method,path,host,host,token,client,b.len(),b).unwrap();let mut out=String::new();s.read_to_string(&mut out).unwrap();out
}
#[test]fn authentication_and_remote_permissions(){let share=Share::start("127.0.0.1",0,json!({}),PathBuf::from("missing")).unwrap();let token=share.url.split("#token=").nth(1).unwrap();let client="test-client-123456789";
 let page=req(&share.url,"GET","/","",client,&json!({}));assert!(page.contains("kifu-remote"));assert!(!page.contains(token));
 assert!(req(&share.url,"POST","/api/engine","bad",client,&json!({"action":"poll"})).contains("403"));
 assert!(req(&share.url,"POST","/api/engine",token,client,&json!({"action":"pick","payload":{"kind":"exe"}})).contains("スマホからは"));
 assert!(req(&share.url,"GET","/../backend/engine.cjs","",client,&json!({})).contains("404"));
 assert!(req(&share.url,"POST","/api/engine",token,client,&json!({"action":"send","payload":{"commands":["1 loadsgf secret.sgf"]}})).contains("許可されていないGTP命令"));
 let host=share.url.trim_start_matches("http://").split('/').next().unwrap().to_string();drop(share);assert!(TcpStream::connect(host).is_err());
}
#[test]fn real_engine_over_authenticated_lan_when_configured(){
 let Ok(exe)=std::env::var("KIFU_TEST_ENGINE") else{return};let model=std::env::var("KIFU_TEST_MODEL").unwrap();let cfg=std::env::var("KIFU_TEST_CONFIG").unwrap();
 let share=Share::start("127.0.0.1",0,json!({"exe":exe,"model":model,"config":cfg}),PathBuf::new()).unwrap();let token=share.url.split("#token=").nth(1).unwrap();let client="actual-client-123456";
 let post=|v:Value|{let text=req(&share.url,"POST","/api/engine",token,client,&v);{let (head,body)=text.split_once("\r\n\r\n").unwrap();let decoded=if head.to_lowercase().contains("transfer-encoding: chunked"){let mut bytes=body.as_bytes();let mut out=Vec::new();loop{let end=bytes.windows(2).position(|w|w==b"\r\n").unwrap();let n=usize::from_str_radix(std::str::from_utf8(&bytes[..end]).unwrap(),16).unwrap();if n==0{break;}bytes=&bytes[end+2..];out.extend_from_slice(&bytes[..n]);bytes=&bytes[n+2..];}out}else{body.as_bytes().to_vec()};serde_json::from_slice::<Value>(&decoded).unwrap()}};
 assert_eq!(post(json!({"action":"start","payload":{"exe":"unapproved.exe"}}))["ok"],true);
 assert!(req(&share.url,"POST","/api/engine",token,"another-client-12345",&json!({"action":"poll"})).contains("別の端末"));
 assert_eq!(post(json!({"action":"send","payload":{"commands":["1 boardsize 9","2 clear_board","3 komi 0","4 kata-analyze B 10 rootInfo true"]}}))["ok"],true);
 let mut found=false;for _ in 0..100{std::thread::sleep(std::time::Duration::from_millis(100));let r=post(json!({"action":"poll"}));for ev in r["result"]["events"].as_array().unwrap(){if ev["type"]=="gtp"{let line=ev["line"].as_str().unwrap();assert!(!line.starts_with('?'),"{}",line);if line.contains("rootInfo visits"){found=true;}}}if found{break;}}
 assert!(found,"real analysis result received");assert_eq!(post(json!({"action":"stop"}))["ok"],true);
}
