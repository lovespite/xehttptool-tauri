mod commands;
mod history;
mod http_client;
mod mock_server;
mod models;
mod persistence;
mod proxy;

use commands::http;
use commands::mock;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            http::send_request,
            mock::start_mock_server,
            mock::stop_mock_server,
            mock::get_mock_server_status,
            mock::update_mock_routes,
            persistence::load_all_workspaces,
            persistence::save_workspace,
            persistence::load_workspace,
            persistence::save_workspace_meta,
            persistence::export_all_workspaces,
            persistence::import_workspaces_from_file,
            commands::proxy::get_proxy_config,
            commands::proxy::save_proxy_config,
            commands::proxy::resolve_proxy,
            commands::proxy::export_proxy_rules,
            commands::proxy::import_proxy_rules,
            history::save_history_entry,
            history::list_history_entries,
            history::load_history_entry,
            history::delete_history_entry,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
