use crate::models::{HistoryEntry, HistoryEntryMeta};
use std::fs;
use std::path::PathBuf;
use tauri::Manager;

fn get_history_dir(app_handle: &tauri::AppHandle) -> PathBuf {
    let base = app_handle
        .path()
        .app_data_dir()
        .unwrap_or_else(|_| PathBuf::from("."));
    base.join("xehttptool").join("history")
}

fn ensure_dir(path: &PathBuf) -> std::io::Result<()> {
    fs::create_dir_all(path)
}

#[tauri::command]
pub fn save_history_entry(
    app_handle: tauri::AppHandle,
    entry: HistoryEntry,
) -> Result<(), String> {
    let dir = get_history_dir(&app_handle);
    ensure_dir(&dir).map_err(|e| format!("Failed to create history dir: {}", e))?;

    let file_path = dir.join(format!("{}.json", entry.id));
    let content =
        serde_json::to_string_pretty(&entry).map_err(|e| format!("Serialize error: {}", e))?;
    fs::write(&file_path, content).map_err(|e| format!("Write error: {}", e))?;
    Ok(())
}

#[tauri::command]
pub fn list_history_entries(
    app_handle: tauri::AppHandle,
) -> Result<Vec<HistoryEntryMeta>, String> {
    let dir = get_history_dir(&app_handle);
    if !dir.exists() {
        return Ok(vec![]);
    }

    let mut entries: Vec<HistoryEntryMeta> = Vec::new();
    let read_dir = fs::read_dir(&dir).map_err(|e| format!("Read dir error: {}", e))?;

    for entry in read_dir.flatten() {
        let path = entry.path();
        if path.extension().and_then(|s| s.to_str()) == Some("json") {
            if let Ok(content) = fs::read_to_string(&path) {
                if let Ok(meta) = serde_json::from_str::<HistoryEntryMeta>(&content) {
                    entries.push(meta);
                }
            }
        }
    }

    // Sort by timestamp descending (newest first)
    entries.sort_by(|a, b| b.timestamp.cmp(&a.timestamp));
    Ok(entries)
}

#[tauri::command]
pub fn load_history_entry(
    app_handle: tauri::AppHandle,
    id: String,
) -> Result<HistoryEntry, String> {
    let dir = get_history_dir(&app_handle);
    let file_path = dir.join(format!("{}.json", id));

    let content =
        fs::read_to_string(&file_path).map_err(|e| format!("Failed to read entry: {}", e))?;
    serde_json::from_str(&content).map_err(|e| format!("Failed to parse entry: {}", e))
}

#[tauri::command]
pub fn delete_history_entry(
    app_handle: tauri::AppHandle,
    id: String,
) -> Result<(), String> {
    let dir = get_history_dir(&app_handle);
    let file_path = dir.join(format!("{}.json", id));

    if file_path.exists() {
        fs::remove_file(&file_path).map_err(|e| format!("Failed to delete entry: {}", e))?;
    }
    Ok(())
}
