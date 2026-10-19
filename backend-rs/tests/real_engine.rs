use kifu_katago_backend::Engine;
use serde_json::json;
#[test]
fn external_gtp_engine_when_configured(){
 let (Ok(exe),Ok(model),Ok(config))=(std::env::var("KIFU_TEST_EXE"),std::env::var("KIFU_TEST_MODEL"),std::env::var("KIFU_TEST_CONFIG")) else {return;};
 let mut engine=Engine::new(config.clone().into());engine.start(&json!({"exe":exe,"model":model,"config":config})).unwrap();
 engine.send(&json!({"commands":["1 protocol_version","2 boardsize 9","3 clear_board","4 komi 0","5 play B D4","6 kata-analyze W 10 rootInfo true"]})).unwrap();
 let deadline=std::time::Instant::now()+std::time::Duration::from_secs(60);let mut version=false;
 loop {let result=engine.poll().unwrap();for event in result["events"].as_array().unwrap(){if event["type"]=="gtp"{let line=event["line"].as_str().unwrap();assert!(!line.starts_with('?'),"{}",line);if line=="=1 2"{version=true;}if line.contains("rootInfo visits") {assert!(version);engine.send(&json!({"commands":["7 stop"]})).unwrap();engine.stop();return;}}}assert!(result["running"].as_bool().unwrap());assert!(std::time::Instant::now()<deadline);std::thread::sleep(std::time::Duration::from_millis(50));}
}
#[test]
fn non_katago_profiles_are_rejected(){let mut engine=Engine::new("default.cfg".into());for kind in ["leelaz","gtp"]{assert!(engine.start(&json!({"kind":kind})).is_err());}}
