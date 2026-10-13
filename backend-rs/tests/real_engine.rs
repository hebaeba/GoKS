use kifu_katago_backend::Engine;
use serde_json::json;
#[test]
fn external_engine_when_configured(){
 let (Ok(exe),Ok(model),Ok(config))=(std::env::var("KIFU_TEST_EXE"),std::env::var("KIFU_TEST_MODEL"),std::env::var("KIFU_TEST_CONFIG")) else {return;};
 let mut engine=Engine::new(config.clone().into());engine.start(&json!({"exe":exe,"model":model,"config":config})).unwrap();
 engine.send(&json!({"id":"rust-real","boardXSize":9,"boardYSize":9,"moves":[["B","D4"]],"rules":"japanese","komi":0,"maxVisits":10})).unwrap();
 let deadline=std::time::Instant::now()+std::time::Duration::from_secs(60);
 loop {let result=engine.poll().unwrap();for event in result["events"].as_array().unwrap(){if event["type"]=="result"&&event["data"]["id"]=="rust-real"{assert!(event["data"].get("error").is_none(),"{}",event);if event["data"]["isDuringSearch"]==false{assert!(event["data"]["rootInfo"]["visits"].as_u64().unwrap()>0);engine.stop();return;}}}assert!(result["running"].as_bool().unwrap());assert!(std::time::Instant::now()<deadline);std::thread::sleep(std::time::Duration::from_millis(100));}
}
