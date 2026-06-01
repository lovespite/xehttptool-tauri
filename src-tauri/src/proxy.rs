use crate::models::ProxyConfig;
use std::fs;
use std::path::PathBuf;
use tauri::Manager;

// --- Persistence ---

fn get_proxy_config_path(app_handle: &tauri::AppHandle) -> PathBuf {
    let base = app_handle
        .path()
        .app_data_dir()
        .unwrap_or_else(|_| PathBuf::from("."));
    base.join("xehttptool").join("proxy_config.json")
}

fn ensure_dir(path: &PathBuf) -> std::io::Result<()> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)
    } else {
        Ok(())
    }
}

pub fn load_proxy_config(app_handle: &tauri::AppHandle) -> Result<ProxyConfig, String> {
    let path = get_proxy_config_path(app_handle);
    if path.exists() {
        let content =
            fs::read_to_string(&path).map_err(|e| format!("Failed to read proxy config: {}", e))?;
        serde_json::from_str(&content).map_err(|e| format!("Failed to parse proxy config: {}", e))
    } else {
        Ok(ProxyConfig {
            enabled: false,
            rules: vec![],
            fallback: "direct".to_string(),
        })
    }
}

pub fn save_proxy_config(app_handle: &tauri::AppHandle, config: &ProxyConfig) -> Result<(), String> {
    let path = get_proxy_config_path(app_handle);
    ensure_dir(&path).map_err(|e| format!("Failed to create proxy config dir: {}", e))?;
    let content = serde_json::to_string_pretty(config)
        .map_err(|e| format!("Failed to serialize proxy config: {}", e))?;
    fs::write(&path, content).map_err(|e| format!("Failed to write proxy config: {}", e))
}

// --- Rule Matching ---

/// Given a target URL and proxy config, returns the proxy URL to use,
/// or None for direct connection. First-enabled-rule-match wins.
pub fn resolve_proxy_for_url(url: &str, config: &ProxyConfig) -> Option<String> {
    if !config.enabled {
        return None;
    }

    let host = extract_host(url);

    for rule in &config.rules {
        if !rule.enabled {
            continue;
        }
        if glob_match::glob_match(&rule.pattern, &host) {
            return Some(rule.proxy_url.clone());
        }
    }

    if config.fallback == "direct" {
        None
    } else {
        Some(config.fallback.clone())
    }
}

/// Extract hostname from a URL string without using the url crate.
fn extract_host(url: &str) -> String {
    let after_scheme = url
        .trim_start_matches("http://")
        .trim_start_matches("https://");
    let host_with_port = after_scheme.split('/').next().unwrap_or(after_scheme);
    let host = host_with_port.split(':').next().unwrap_or(host_with_port);
    host.to_string()
}

/// Build a reqwest::Proxy from a proxy URL string.
/// Supports http://, https://, socks5:// schemes.
pub fn build_reqwest_proxy(proxy_url: &str) -> Result<reqwest::Proxy, String> {
    if proxy_url.starts_with("socks5://") || proxy_url.starts_with("socks5h://") {
        // With the "socks" feature, Proxy::all accepts socks5:// URLs via IntoProxy
        reqwest::Proxy::all(proxy_url)
            .map_err(|e| format!("Invalid SOCKS proxy: {}", e))
    } else if proxy_url.starts_with("https://") {
        // HTTPS proxy: use Proxy::https for CONNECT tunneling
        reqwest::Proxy::all(proxy_url)
            .map_err(|e| format!("Invalid HTTPS proxy: {}", e))
    } else {
        // HTTP proxy for all URLs
        reqwest::Proxy::all(proxy_url)
            .map_err(|e| format!("Invalid proxy: {}", e))
    }
}
