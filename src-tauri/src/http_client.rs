use crate::models::{HttpRequestInput, HttpResponseData};
use crate::proxy;
use std::collections::HashMap;
use std::time::Instant;

pub async fn send_http_request(
    input: HttpRequestInput,
    proxy_url: Option<String>,
) -> Result<HttpResponseData, String> {
    let mut client_builder = reqwest::Client::builder()
        .timeout(std::time::Duration::from_millis(input.timeout))
        .danger_accept_invalid_certs(false);

    if let Some(ref url) = proxy_url {
        let proxy = proxy::build_reqwest_proxy(url)?;
        client_builder = client_builder.proxy(proxy);
    }

    let client = client_builder
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))?;

    let method = input
        .method
        .parse::<reqwest::Method>()
        .map_err(|e| format!("Invalid HTTP method '{}': {}", input.method, e))?;

    let mut req = client.request(method.clone(), &input.url);

    // Add headers
    let mut response_headers_map: HashMap<String, Vec<String>> = HashMap::new();
    for h in &input.headers {
        if h.enabled {
            req = req.header(&h.key, &h.value);
            response_headers_map
                .entry(h.key.clone())
                .or_default()
                .push(h.value.clone());
        }
    }

    // Add body
    if let Some(body_str) = &input.body {
        if !body_str.is_empty() {
            let content_type = if input.content_type.is_empty() {
                "application/json".to_string()
            } else {
                input.content_type.clone()
            };
            req = req.header("Content-Type", &content_type);
            req = req.body(body_str.clone());
        }
    }

    let start = Instant::now();

    let resp = req.send().await.map_err(|e| {
        if e.is_timeout() {
            format!("Request timed out after {}ms", input.timeout)
        } else if e.is_connect() {
            format!("Connection failed: {}", e)
        } else {
            format!("Request failed: {}", e)
        }
    })?;

    let timing = start.elapsed().as_millis() as u64;
    let status = resp.status();
    let status_text = status.canonical_reason().unwrap_or("Unknown").to_string();
    let status_code = status.as_u16();
    let content_type = resp
        .headers()
        .get("content-type")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("")
        .to_string();

    let resp_headers: HashMap<String, Vec<String>> = resp
        .headers()
        .iter()
        .map(|(k, v)| {
            (
                k.to_string(),
                v.to_str()
                    .map(|s| vec![s.to_string()])
                    .unwrap_or_default(),
            )
        })
        .collect();

    let body_bytes = resp.bytes().await.map_err(|e| format!("Failed to read response body: {}", e))?;
    let size = body_bytes.len() as u64;
    let body_str = String::from_utf8_lossy(&body_bytes).to_string();

    Ok(HttpResponseData {
        status: status_code,
        status_text,
        headers: resp_headers,
        body: body_str,
        content_type,
        timing,
        size,
    })
}
