use crate::models::{MockRouteConfig, MockServerConfig, MockServerStatus};
use axum::extract::State;
use axum::routing::any;
use axum::{Json, Router};
use std::sync::Arc;
use tokio::sync::Mutex;
use tokio::task::JoinHandle;

#[derive(Clone)]
pub struct MockAppState {
    pub routes: Arc<Mutex<Vec<MockRouteConfig>>>,
}

pub struct MockServerInstance {
    handle: JoinHandle<()>,
    shutdown_tx: tokio::sync::oneshot::Sender<()>,
}

static INSTANCE: once_cell::sync::Lazy<Mutex<Option<MockServerInstance>>> =
    once_cell::sync::Lazy::new(|| Mutex::new(None));

async fn handle_mock_request(
    State(state): State<MockAppState>,
    method: axum::http::Method,
    uri: axum::http::Uri,
) -> (axum::http::StatusCode, Json<serde_json::Value>) {
    let routes = state.routes.lock().await;
    let path = uri.path();

    // Find matching route
    for route in routes.iter() {
        if !route.enabled {
            continue;
        }
        if route.method != method.as_str() {
            continue;
        }
        if route.path != path {
            continue;
        }

        let status = axum::http::StatusCode::from_u16(route.status_code).unwrap_or(axum::http::StatusCode::OK);
        let body: serde_json::Value = serde_json::from_str(&route.body).unwrap_or(serde_json::Value::String(route.body.clone()));
        return (status, Json(body));
    }

    // No route matched
    (
        axum::http::StatusCode::NOT_FOUND,
        Json(serde_json::json!({"error": "no matching mock route"})),
    )
}

pub async fn start_mock_server(config: MockServerConfig) -> Result<u16, String> {
    let mut instance = INSTANCE.lock().await;

    // Shutdown existing server if running
    if let Some(old) = instance.take() {
        let _ = old.shutdown_tx.send(());
        old.handle.await.unwrap_or_default();
    }

    let state = MockAppState {
        routes: Arc::new(Mutex::new(config.routes)),
    };

    let app = Router::new()
        .route("/{*path}", any(handle_mock_request))
        .with_state(state);

    let listener = tokio::net::TcpListener::bind(format!("127.0.0.1:{}", config.port))
        .await
        .map_err(|e| format!("Failed to bind mock server: {}", e))?;

    let port = listener.local_addr().map_err(|e| format!("Failed to get port: {}", e))?.port();

    let (shutdown_tx, shutdown_rx) = tokio::sync::oneshot::channel::<()>();

    let handle = tokio::spawn(async move {
        axum::serve(listener, app)
            .with_graceful_shutdown(async {
                shutdown_rx.await.ok();
            })
            .await
            .ok();
    });

    *instance = Some(MockServerInstance { handle, shutdown_tx });

    Ok(port)
}

pub async fn stop_mock_server() -> Result<(), String> {
    let mut instance = INSTANCE.lock().await;
    if let Some(old) = instance.take() {
        let _ = old.shutdown_tx.send(());
        old.handle.await.unwrap_or_default();
        Ok(())
    } else {
        Err("Mock server is not running".to_string())
    }
}

pub async fn get_mock_server_status() -> MockServerStatus {
    let instance = INSTANCE.lock().await;
    let running = instance.is_some();
    MockServerStatus {
        running,
        port: 0,
        routes: vec![],
    }
}
