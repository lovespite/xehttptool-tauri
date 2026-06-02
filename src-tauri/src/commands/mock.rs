use crate::mock_server;
use crate::models::{MockRouteConfig, MockServerConfig, MockServerStatus};

#[tauri::command]
pub async fn update_mock_routes(routes: Vec<MockRouteConfig>) -> Result<(), String> {
    mock_server::update_mock_routes(routes).await
}

#[tauri::command]
pub async fn start_mock_server(config: MockServerConfig) -> Result<u16, String> {
    mock_server::start_mock_server(config).await
}

#[tauri::command]
pub async fn stop_mock_server() -> Result<(), String> {
    mock_server::stop_mock_server().await
}

#[tauri::command]
pub async fn get_mock_server_status() -> MockServerStatus {
    mock_server::get_mock_server_status().await
}
