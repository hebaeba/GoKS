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
 assert!(req(&share.url,"POST","/api/engine",token,client,&json!({"action":"send","payload":{"id":"x","boardXSize":19,"boardYSize":19,"overrideSettings":{"maxTime":1e20}}})).contains("0.1〜60秒"));
 let host=share.url.trim_start_matches("http://").split('/').next().unwrap().to_string();drop(share);assert!(TcpStream::connect(host).is_err());
}
#[test]fn real_engine_over_authenticated_lan_when_configured(){
 let Ok(exe)=std::env::var("KIFU_TEST_ENGINE") else{return};let model=std::env::var("KIFU_TEST_MODEL").unwrap();let cfg=std::env::var("KIFU_TEST_CONFIG").unwrap();
 let share=Share::start("127.0.0.1",0,json!({"exe":exe,"model":model,"config":cfg}),PathBuf::new()).unwrap();let token=share.url.split("#token=").nth(1).unwrap();let client="actual-client-123456";
 let post=|v:Value|{let text=req(&share.url,"POST","/api/engine",token,client,&v);serde_json::from_str::<Value>(text.split("\r\n\r\n").nth(1).unwrap()).unwrap()};
 assert_eq!(post(json!({"action":"start","payload":{"exe":"unapproved.exe"}}))["ok"],true);
 assert!(req(&share.url,"POST","/api/engine",token,"another-client-12345",&json!({"action":"poll"})).contains("別の端末"));
 assert_eq!(post(json!({"action":"send","payload":{"id":"test","boardXSize":9,"boardYSize":9,"moves":[],"komi":0,"rules":"japanese","maxVisits":1000000,"analysisPVLen":10,"overrideSettings":{"maxTime":0.1,"maxPlayouts":1000000}}}))["ok"],true);
 let mut found=false;for _ in 0..100{std::thread::sleep(std::time::Duration::from_millis(100));let r=post(json!({"action":"poll"}));for ev in r["result"]["events"].as_array().unwrap(){if ev["type"]=="result"&&ev["data"]["id"]=="test"{assert!(ev["data"]["error"].is_null(),"{}",ev);if ev["data"]["isDuringSearch"]==false{found=true;}}}if found{break;}}
 assert!(found,"real analysis result received");assert_eq!(post(json!({"action":"stop"}))["ok"],true);
}
