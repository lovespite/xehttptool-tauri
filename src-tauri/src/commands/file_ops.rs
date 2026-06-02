use std::fs;
use std::path::PathBuf;
use uuid::Uuid;

#[tauri::command]
pub fn write_temp_file(data: String, extension: String) -> Result<String, String> {
    let mut path = PathBuf::from(std::env::temp_dir());
    let file_name = format!("xehttptool_{}.{}", Uuid::new_v4(), extension);
    path.push(&file_name);

    fs::write(&path, &data).map_err(|e| format!("Failed to write temp file: {}", e))?;

    Ok(path.to_string_lossy().to_string())
}

#[tauri::command]
pub fn move_file(from: String, to: String) -> Result<(), String> {
    let from_path = PathBuf::from(&from);
    let to_path = PathBuf::from(&to);

    // Try rename first (fast, same filesystem)
    if let Ok(()) = fs::rename(&from_path, &to_path) {
        return Ok(());
    }

    // Fallback: copy + delete (cross-filesystem)
    fs::copy(&from_path, &to_path)
        .map_err(|e| format!("Failed to copy file: {}", e))?;
    fs::remove_file(&from_path).map_err(|e| format!("Failed to remove source file: {}", e))?;

    Ok(())
}

#[tauri::command]
pub fn delete_file(path: String) -> Result<(), String> {
    let path_buf = PathBuf::from(&path);
    if path_buf.exists() {
        fs::remove_file(&path_buf).map_err(|e| format!("Failed to delete file: {}", e))?;
    }
    Ok(())
}
