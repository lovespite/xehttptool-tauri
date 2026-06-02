use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KeyValuePair {
    #[serde(default)]
    pub id: String,
    pub key: String,
    pub value: String,
    pub enabled: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RequestBody {
    #[serde(rename = "type")]
    pub body_type: String,
    pub raw: Option<String>,
    #[serde(rename = "formData")]
    pub form_data: Option<Vec<KeyValuePair>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Script {
    pub id: String,
    #[serde(rename = "type")]
    pub script_type: String,
    pub code: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Variable {
    pub id: String,
    pub key: String,
    pub value: String,
    pub scope: String,
    pub enabled: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HttpRequestData {
    pub id: String,
    pub name: String,
    pub method: String,
    pub url: String,
    pub headers: Vec<KeyValuePair>,
    #[serde(rename = "queryParams")]
    pub query_params: Vec<KeyValuePair>,
    pub body: RequestBody,
    pub variables: Vec<Variable>,
    pub scripts: Vec<Script>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CollectionData {
    pub id: String,
    pub name: String,
    pub requests: Vec<HttpRequestData>,
    pub variables: Vec<Variable>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkspaceData {
    pub id: String,
    pub name: String,
    pub collections: Vec<CollectionData>,
    pub variables: Vec<Variable>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HttpRequestInput {
    pub method: String,
    pub url: String,
    pub headers: Vec<KeyValuePair>,
    pub body: Option<String>,
    pub content_type: String,
    pub timeout: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HttpResponseData {
    pub status: u16,
    pub status_text: String,
    pub headers: std::collections::HashMap<String, Vec<String>>,
    pub body: String,
    pub content_type: String,
    pub timing: u64,
    pub size: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MockRouteConfig {
    pub id: String,
    pub method: String,
    pub path: String,
    pub status_code: u16,
    pub headers: Vec<KeyValuePair>,
    pub body: String,
    pub enabled: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MockServerConfig {
    pub port: u16,
    pub routes: Vec<MockRouteConfig>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MockServerStatus {
    pub running: bool,
    pub port: u16,
    pub routes: Vec<MockRouteConfig>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkspaceMeta {
    pub id: String,
    pub name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HistoryEntry {
    pub id: String,
    pub timestamp: u64,
    pub method: String,
    pub url: String,
    pub status: u16,
    pub status_text: String,
    pub request_data: serde_json::Value,
    pub response_data: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HistoryEntryMeta {
    pub id: String,
    pub timestamp: u64,
    pub method: String,
    pub url: String,
    pub status: u16,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProxyRule {
    pub id: String,
    pub pattern: String,
    pub proxy_url: String,
    pub enabled: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProxyConfig {
    pub enabled: bool,
    pub rules: Vec<ProxyRule>,
    /// "direct" means connect directly when no rule matches; otherwise treated as a proxy URL
    pub fallback: String,
}
