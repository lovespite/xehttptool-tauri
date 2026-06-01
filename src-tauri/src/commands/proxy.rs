use crate::models::ProxyConfig;
use crate::proxy;

#[tauri::command]
pub fn get_proxy_config(app_handle: tauri::AppHandle) -> Result<ProxyConfig, String> {
    proxy::load_proxy_config(&app_handle)
}

#[tauri::command]
pub fn save_proxy_config(app_handle: tauri::AppHandle, config: ProxyConfig) -> Result<(), String> {
    proxy::save_proxy_config(&app_handle, &config)
}

#[tauri::command]
pub fn resolve_proxy(app_handle: tauri::AppHandle, url: String) -> Result<Option<String>, String> {
    let config = proxy::load_proxy_config(&app_handle)?;
    Ok(proxy::resolve_proxy_for_url(&url, &config))
}

#[tauri::command]
pub fn export_proxy_rules(path: String, config: ProxyConfig) -> Result<(), String> {
    let content = serde_json::to_string_pretty(&config)
        .map_err(|e| format!("Serialize error: {}", e))?;
    std::fs::write(&path, content).map_err(|e| format!("Write error: {}", e))
}

#[tauri::command]
pub fn import_proxy_rules(path: String) -> Result<ProxyConfig, String> {
    let content =
        std::fs::read_to_string(&path).map_err(|e| format!("Read error: {}", e))?;
    serde_json::from_str(&content).map_err(|e| format!("Parse error: {}", e))
}
