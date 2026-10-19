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
fn generic_gtp_without_model_when_node_configured(){
 let Ok(exe)=std::env::var("KIFU_TEST_NODE") else{return;};
 let fixture=std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("../tests/fixtures/gtp-engine.cjs");
 let mut engine=Engine::new("deliberately-missing.cfg".into());let started=engine.start(&json!({"kind":"gtp","exe":exe,"extraArgs":[fixture]})).unwrap();assert_eq!(started["meta"]["supportsAnalysis"],false);assert_eq!(started["meta"]["model"],"");
 engine.send(&json!({"commands":["1 name"]})).unwrap();let deadline=std::time::Instant::now()+std::time::Duration::from_secs(5);
 loop{let r=engine.poll().unwrap();if r["events"].as_array().unwrap().iter().any(|e|e["line"]=="=1 Generic fixture"){break;}assert!(std::time::Instant::now()<deadline);std::thread::sleep(std::time::Duration::from_millis(10));}engine.stop();
}
