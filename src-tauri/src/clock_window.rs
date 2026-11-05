//! Clock-only placement. Main-window modes and engine state are never changed.
use serde_json::{json, Value};
use std::{path::PathBuf, sync::Mutex};
use tauri::{Manager, PhysicalPosition, PhysicalSize, WebviewWindow};

pub struct State(Mutex<Data>);
struct Data { path: PathBuf, saved: Value, ready: bool }
impl State {
    pub fn load(path: PathBuf) -> Self {
        let saved = std::fs::read(&path).ok().filter(|b| b.len() < 65536)
            .and_then(|b| serde_json::from_slice::<Value>(&b).ok())
            .filter(Value::is_object).unwrap_or_else(|| json!({}));
        Self(Mutex::new(Data { path, saved, ready: false }))
    }
}
fn number(v: &Value, key: &str, fallback: f64) -> f64 {
    v[key].as_f64().filter(|n| n.is_finite()).unwrap_or(fallback)
}
fn fit(w: f64, h: f64, x: f64, y: f64, aw: f64, ah: f64) -> (f64,f64,f64,f64) {
    let w = w.max(400.0).min(aw.max(1.0));
    let h = h.max(320.0).min(ah.max(1.0));
    (w,h,x.max(0.0).min((aw-w).max(0.0)),y.max(0.0).min((ah-h).max(0.0)))
}
pub fn initialize(window: &WebviewWindow) -> Result<(),String> {
    let state = window.state::<State>();
    let value = {
        let mut d = state.0.lock().map_err(|e| e.to_string())?;
        d.ready = false;
        d.saved.clone()
    };
    let result = restore(window, &value);
    // A bad/stale placement must not leave the clock inaccessible.
    state.0.lock().map_err(|e| e.to_string())?.ready = true;
    result
}
fn restore(window: &WebviewWindow, value: &Value) -> Result<(),String> {
    let monitors = window.available_monitors().map_err(|e| e.to_string())?;
    let wanted = value["monitor"].as_str();
    let monitor = monitors.into_iter()
        .find(|m| wanted.is_some() && m.name().map(|n| n.as_str()) == wanted)
        .or(window.current_monitor().map_err(|e| e.to_string())?)
        .or(window.primary_monitor().map_err(|e| e.to_string())?);
    let Some(m) = monitor else { return Ok(()); };
    let scale = m.scale_factor();
    let area = m.work_area();
    let outer = window.outer_size().map_err(|e| e.to_string())?;
    let inner = window.inner_size().map_err(|e| e.to_string())?;
    let old_scale = window.scale_factor().map_err(|e| e.to_string())?;
    let bw = outer.width.saturating_sub(inner.width) as f64 / old_scale;
    let bh = outer.height.saturating_sub(inner.height) as f64 / old_scale;
    let aw = (area.size.width as f64 / scale - bw).max(1.0);
    let ah = (area.size.height as f64 / scale - bh).max(1.0);
    let w = number(value, "width", 680.0);
    let h = number(value, "height", 360.0);
    let (w,h,x,y) = fit(w,h,number(value,"x",(aw-w)/2.0),number(value,"y",(ah-h)/2.0),aw,ah);
    window.set_min_size(Some(PhysicalSize::new(
        (400.0*scale).min(aw*scale) as u32,
        (320.0*scale).min(ah*scale) as u32))).map_err(|e| e.to_string())?;
    window.set_position(PhysicalPosition::new(
        area.position.x + (x*scale).round() as i32,
        area.position.y + (y*scale).round() as i32)).map_err(|e| e.to_string())?;
    window.set_size(PhysicalSize::new((w*scale).round() as u32,(h*scale).round() as u32))
        .map_err(|e| e.to_string())
}
pub fn save(window: &WebviewWindow) {
    let state = window.state::<State>();
    let Ok(mut d) = state.0.try_lock() else { return; };
    if !d.ready || window.is_minimized().unwrap_or(true)
        || window.is_maximized().unwrap_or(true) || !window.is_visible().unwrap_or(false) { return; }
    if let (Ok(size),Ok(pos),Ok(Some(m)),Ok(scale)) =
        (window.inner_size(),window.outer_position(),window.current_monitor(),window.scale_factor()) {
        let area = m.work_area();
        let value = json!({"width":size.width as f64/scale,"height":size.height as f64/scale,
            "x":(pos.x-area.position.x) as f64/scale,"y":(pos.y-area.position.y) as f64/scale,
            "monitor":m.name()});
        if value == d.saved { return; }
        if let Ok(bytes) = serde_json::to_vec_pretty(&value) {
            if std::fs::write(&d.path,bytes).is_ok() { d.saved = value; }
        }
    }
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test] fn preserves_clock_rectangle() {
        assert_eq!(fit(680.0,360.0,750.0,450.0,1904.0,1032.0),(680.0,360.0,750.0,450.0));
    }
    #[test] fn removed_monitor_and_smaller_work_area() {
        assert_eq!(fit(900.0,700.0,1600.0,-50.0,784.0,552.0),(784.0,552.0,0.0,0.0));
    }
    #[test] fn restored_window_keeps_title_and_edges_on_screen() {
        assert_eq!(fit(680.0,360.0,9999.0,9999.0,1264.0,672.0),(680.0,360.0,584.0,312.0));
    }
    #[test] fn invalid_saved_data_uses_defaults() {
        let v = json!({"width":"bad","height":null});
        assert_eq!(number(&v,"width",680.0),680.0);
        assert_eq!(number(&v,"height",360.0),360.0);
    }
    #[test] fn placement_survives_a_new_state_instance() {
        let path = std::env::temp_dir().join(format!("goks-clock-test-{}.json",std::process::id()));
        std::fs::write(&path,br#"{"width":720,"height":390,"x":110,"y":220,"monitor":"test"}"#).unwrap();
        let state = State::load(path.clone());
        assert_eq!(state.0.lock().unwrap().saved["x"],110);
        assert_eq!(state.0.lock().unwrap().saved["width"],720);
        std::fs::remove_file(path).unwrap();
    }
}
