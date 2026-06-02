use crate::models::{WorkspaceData, WorkspaceMeta};
use crate::postman;
use std::fs;
use std::path::PathBuf;
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::Manager;

fn get_data_dir(app_handle: Option<&tauri::AppHandle>) -> PathBuf {
    if let Some(handle) = app_handle {
        handle
            .path()
            .app_data_dir()
            .unwrap_or_else(|_| PathBuf::from("."))
    } else {
        PathBuf::from(".")
    }
    .join("xehttptool")
    .join("workspaces")
}

fn ensure_dir(path: &PathBuf) -> std::io::Result<()> {
    fs::create_dir_all(path)
}

#[tauri::command]
pub fn load_all_workspaces(app_handle: tauri::AppHandle) -> Result<Vec<WorkspaceMeta>, String> {
    let dir = get_data_dir(Some(&app_handle));
    ensure_dir(&dir).map_err(|e| format!("Failed to create data dir: {}", e))?;

    let meta_path = dir.join("workspace_meta.json");
    if meta_path.exists() {
        let content = fs::read_to_string(&meta_path).map_err(|e| format!("Failed to read meta: {}", e))?;
        serde_json::from_str(&content).map_err(|e| format!("Failed to parse meta: {}", e))
    } else {
        Ok(vec![])
    }
}

#[tauri::command]
pub fn save_workspace(app_handle: tauri::AppHandle, workspace: WorkspaceData) -> Result<(), String> {
    let dir = get_data_dir(Some(&app_handle)).join(&workspace.id);
    ensure_dir(&dir).map_err(|e| format!("Failed to create workspace dir: {}", e))?;

    let file_path = dir.join("workspace.json");
    let content = serde_json::to_string_pretty(&workspace).map_err(|e| format!("Failed to serialize: {}", e))?;
    fs::write(&file_path, content).map_err(|e| format!("Failed to write workspace: {}", e))?;

    Ok(())
}

#[tauri::command]
pub fn load_workspace(app_handle: tauri::AppHandle, workspace_id: String) -> Result<WorkspaceData, String> {
    let dir = get_data_dir(Some(&app_handle)).join(&workspace_id);
    let file_path = dir.join("workspace.json");

    let content = fs::read_to_string(&file_path).map_err(|e| format!("Failed to read workspace: {}", e))?;
    serde_json::from_str(&content).map_err(|e| format!("Failed to parse workspace: {}", e))
}

#[tauri::command]
pub fn save_workspace_meta(app_handle: tauri::AppHandle, metas: Vec<WorkspaceMeta>) -> Result<(), String> {
    let dir = get_data_dir(Some(&app_handle));
    ensure_dir(&dir).map_err(|e| format!("Failed to create data dir: {}", e))?;

    let meta_path = dir.join("workspace_meta.json");
    let content = serde_json::to_string_pretty(&metas).map_err(|e| format!("Failed to serialize meta: {}", e))?;
    fs::write(&meta_path, content).map_err(|e| format!("Failed to write meta: {}", e))?;

    Ok(())
}

#[tauri::command]
pub fn export_all_workspaces(workspaces: Vec<WorkspaceData>, path: String) -> Result<(), String> {
    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();

    let export_data = serde_json::json!({
        "version": 1,
        "exportedAt": timestamp,
        "workspaces": workspaces,
    });

    let content = serde_json::to_string_pretty(&export_data)
        .map_err(|e| format!("Serialize error: {}", e))?;
    fs::write(&path, content).map_err(|e| format!("Write error: {}", e))?;
    Ok(())
}

#[tauri::command]
pub fn import_workspaces_from_file(path: String) -> Result<Vec<WorkspaceData>, String> {
    let content = fs::read_to_string(&path).map_err(|e| format!("Read error: {}", e))?;
    let parsed: serde_json::Value =
        serde_json::from_str(&content).map_err(|e| format!("Invalid JSON: {}", e))?;

    // Auto-detect Postman Collection v2.1 format
    if postman::is_postman_collection(&parsed) {
        let collection: postman::PostmanCollection = serde_json::from_value(parsed)
            .map_err(|e| format!("Invalid Postman collection: {}", e))?;
        let workspace = postman::convert_collection(collection);
        return Ok(vec![workspace]);
    }

    // Native xehttptool format
    let workspaces: Vec<WorkspaceData> = serde_json::from_value(parsed["workspaces"].clone())
        .map_err(|e| format!("Invalid workspace format: {}", e))?;

    Ok(workspaces)
}
