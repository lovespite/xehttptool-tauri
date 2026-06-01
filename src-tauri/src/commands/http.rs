use crate::http_client;
use crate::models::{HttpRequestInput, HttpResponseData};

#[tauri::command]
pub async fn send_request(
    method: String,
    url: String,
    headers: Vec<crate::models::KeyValuePair>,
    body: Option<String>,
    content_type: String,
    timeout: Option<u64>,
    proxy_url: Option<String>,
) -> Result<HttpResponseData, String> {
    let input = HttpRequestInput {
        method,
        url,
        headers,
        body,
        content_type,
        timeout: timeout.unwrap_or(30000),
    };

    http_client::send_http_request(input, proxy_url).await
}
