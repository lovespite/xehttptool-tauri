use crate::models::{
    CollectionData, HttpRequestData, KeyValuePair, RequestBody, Script, Variable, WorkspaceData,
};
use serde::Deserialize;
use uuid::Uuid;

// ── ID generation ──

fn generate_id() -> String {
    Uuid::new_v4().to_string()
}

// ── Postman v2.1 deserialization structs ──

#[derive(Debug, Deserialize)]
pub struct PostmanCollection {
    pub info: PostmanInfo,
    pub item: Vec<PostmanItem>,
    #[serde(default)]
    pub variable: Option<Vec<PostmanVariable>>,
    #[serde(default)]
    pub event: Option<Vec<PostmanEvent>>,
}

#[derive(Debug, Deserialize)]
pub struct PostmanInfo {
    pub name: String,
    #[serde(default)]
    pub _postman_id: Option<String>,
    #[serde(default)]
    pub schema: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct PostmanItem {
    pub name: String,
    #[serde(default)]
    pub request: Option<PostmanRequest>,
    #[serde(default)]
    pub item: Option<Vec<PostmanItem>>,
    #[serde(default)]
    pub event: Option<Vec<PostmanEvent>>,
    #[serde(default)]
    pub variable: Option<Vec<PostmanVariable>>,
}

impl PostmanItem {
    fn is_folder(&self) -> bool {
        self.item.is_some()
    }
}

#[derive(Debug, Deserialize)]
pub struct PostmanRequest {
    #[serde(default)]
    pub method: Option<String>,
    #[serde(default)]
    pub header: Option<Vec<PostmanHeader>>,
    #[serde(default)]
    pub body: Option<PostmanBody>,
    #[serde(default)]
    pub url: Option<serde_json::Value>,
}

#[derive(Debug, Deserialize)]
pub struct PostmanHeader {
    pub key: String,
    pub value: String,
    #[serde(default)]
    pub disabled: Option<bool>,
}

#[derive(Debug, Deserialize)]
pub struct PostmanQueryParam {
    pub key: String,
    #[serde(default)]
    pub value: Option<String>,
    #[serde(default)]
    pub disabled: Option<bool>,
}

#[derive(Debug, Deserialize)]
pub struct PostmanBody {
    #[serde(default)]
    pub mode: Option<String>,
    #[serde(default)]
    pub raw: Option<String>,
    #[serde(default)]
    pub urlencoded: Option<Vec<PostmanFormParam>>,
    #[serde(default)]
    pub formdata: Option<Vec<PostmanFormParam>>,
    #[serde(default)]
    pub graphql: Option<serde_json::Value>,
    #[serde(default)]
    pub options: Option<serde_json::Value>,
}

#[derive(Debug, Deserialize)]
pub struct PostmanFormParam {
    pub key: String,
    #[serde(default)]
    pub value: Option<String>,
    #[serde(default)]
    pub src: Option<String>,
    #[serde(rename = "type")]
    #[serde(default)]
    pub param_type: Option<String>,
    #[serde(default)]
    pub disabled: Option<bool>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct PostmanEvent {
    #[serde(default)]
    pub listen: Option<String>,
    #[serde(default)]
    pub script: Option<PostmanScript>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct PostmanScript {
    #[serde(default)]
    pub exec: Option<serde_json::Value>,
    #[serde(default)]
    pub script_type: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct PostmanVariable {
    #[serde(default)]
    pub key: Option<String>,
    #[serde(default)]
    pub value: Option<serde_json::Value>,
    #[serde(rename = "type")]
    #[serde(default)]
    pub var_type: Option<String>,
    #[serde(default)]
    pub disabled: Option<bool>,
}

// ── Conversion: PostmanCollection → WorkspaceData ──

/// Check if a parsed JSON value is a Postman Collection v2.1
pub fn is_postman_collection(value: &serde_json::Value) -> bool {
    value
        .get("info")
        .and_then(|info| info.get("schema"))
        .and_then(|s| s.as_str())
        .map_or(false, |schema| {
            schema.contains("postman") || schema.contains("schema.postman.com")
        })
}

pub fn convert_collection(postman: PostmanCollection) -> WorkspaceData {
    let mut collections = Vec::new();
    let mut leaf_requests = Vec::new();

    // Collection-level events apply to all items
    let collection_events = postman.event.unwrap_or_default();

    for item in postman.item {
        process_item(item, &collection_events, &mut collections, &mut leaf_requests);
    }

    // Root-level leaf items go into a default collection named after the collection
    if !leaf_requests.is_empty() {
        collections.push(CollectionData {
            id: generate_id(),
            name: postman.info.name.clone(),
            requests: leaf_requests,
            variables: Vec::new(),
        });
    }

    let variables = convert_variables(postman.variable.as_deref());

    WorkspaceData {
        id: generate_id(),
        name: postman.info.name,
        collections,
        variables,
    }
}

// ── Item processing (recursive) ──

fn process_item(
    item: PostmanItem,
    parent_events: &[PostmanEvent],
    collections: &mut Vec<CollectionData>,
    leaf_requests: &mut Vec<HttpRequestData>,
) {
    // Merge parent events with item events (item events override)
    let merged_events = if let Some(ref item_events) = item.event {
        let mut events = parent_events.to_vec();
        events.extend(item_events.iter().cloned());
        events
    } else {
        parent_events.to_vec()
    };

    let item_vars = item
        .variable
        .as_ref()
        .map(|v| convert_variables(Some(v)))
        .unwrap_or_default();

    if item.is_folder() {
        // Folder → CollectionData, then recurse into children
        let mut folder_requests = Vec::new();
        let mut child_collections = Vec::new();

        if let Some(children) = item.item {
            for child in children {
                process_item(child, &merged_events, &mut child_collections, &mut folder_requests);
            }
        }

        // Create a collection for this folder
        let collection = CollectionData {
            id: generate_id(),
            name: item.name,
            requests: folder_requests,
            variables: item_vars,
        };

        collections.push(collection);
        collections.extend(child_collections);
    } else {
        // Leaf → HttpRequestData
        let mut request = convert_item_to_request(&item, &merged_events);
        // Merge item-level variables into request variables
        let mut all_vars = request.variables;
        all_vars.extend(item_vars);
        request.variables = all_vars;
        leaf_requests.push(request);
    }
}

// ── Item → HttpRequestData ──

fn convert_item_to_request(item: &PostmanItem, events: &[PostmanEvent]) -> HttpRequestData {
    let request = item.request.as_ref();

    let method = request
        .and_then(|r| r.method.as_deref())
        .unwrap_or("GET")
        .to_uppercase();

    let url = request
        .and_then(|r| r.url.as_ref())
        .map(|u| extract_url(u))
        .unwrap_or_default();

    let headers = request
        .and_then(|r| r.header.as_ref())
        .map(|h| convert_headers(h))
        .unwrap_or_default();

    let query_params = extract_query_params_from_url(request.and_then(|r| r.url.as_ref()));

    let body = request
        .and_then(|r| r.body.as_ref())
        .map(|b| convert_body(b))
        .unwrap_or(RequestBody {
            body_type: "none".to_string(),
            raw: None,
            form_data: None,
        });

    let scripts = convert_events_to_scripts(events);

    HttpRequestData {
        id: generate_id(),
        name: item.name.clone(),
        method,
        url,
        headers,
        query_params,
        body,
        variables: Vec::new(),
        scripts,
    }
}

// ── URL extraction ──

fn extract_url(url_value: &serde_json::Value) -> String {
    match url_value {
        serde_json::Value::String(s) => s.clone(),
        serde_json::Value::Object(obj) => {
            // Prefer the "raw" field
            if let Some(raw) = obj.get("raw").and_then(|v| v.as_str()) {
                if !raw.is_empty() {
                    return raw.to_string();
                }
            }
            // Reconstruct from protocol + host + path + port + query
            let protocol = obj
                .get("protocol")
                .and_then(|v| v.as_str())
                .unwrap_or("https");
            let host = obj
                .get("host")
                .and_then(|v| v.as_array())
                .map(|arr| {
                    arr.iter()
                        .filter_map(|v| v.as_str())
                        .collect::<Vec<_>>()
                        .join(".")
                })
                .unwrap_or_default();
            let port = obj
                .get("port")
                .and_then(|v| v.as_str())
                .filter(|p| !p.is_empty());
            let path = obj
                .get("path")
                .and_then(|v| v.as_array())
                .map(|arr| {
                    arr.iter()
                        .filter_map(|v| v.as_str())
                        .collect::<Vec<_>>()
                        .join("/")
                })
                .unwrap_or_default();

            if host.is_empty() {
                return String::new();
            }

            let mut url = format!("{}://{}", protocol, host);
            if let Some(p) = port {
                url.push(':');
                url.push_str(p);
            }
            if !path.is_empty() {
                url.push('/');
                url.push_str(&path);
            }
            url
        }
        _ => String::new(),
    }
}

fn extract_query_params_from_url(url_value: Option<&serde_json::Value>) -> Vec<KeyValuePair> {
    match url_value {
        Some(serde_json::Value::Object(obj)) => {
            obj.get("query")
                .and_then(|v| v.as_array())
                .map(|arr| {
                    arr.iter()
                        .filter_map(|item| {
                            let key = item.get("key")?.as_str()?.to_string();
                            let value = item
                                .get("value")
                                .and_then(|v| v.as_str())
                                .unwrap_or("")
                                .to_string();
                            let enabled = !item
                                .get("disabled")
                                .and_then(|d| d.as_bool())
                                .unwrap_or(false);
                            Some(KeyValuePair {
                                id: generate_id(),
                                key,
                                value,
                                enabled,
                            })
                        })
                        .collect()
                })
                .unwrap_or_default()
        }
        _ => Vec::new(),
    }
}

// ── Body conversion ──

fn convert_body(body: &PostmanBody) -> RequestBody {
    match body.mode.as_deref() {
        Some("raw") => {
            let body_type = body
                .options
                .as_ref()
                .and_then(|opts| opts.get("raw"))
                .and_then(|raw| raw.get("language"))
                .and_then(|v| v.as_str())
                .map(|lang| match lang {
                    "json" => "json",
                    "xml" => "xml",
                    "text" => "text",
                    "javascript" => "text",
                    "html" => "text",
                    _ => "raw",
                })
                .unwrap_or("raw")
                .to_string();

            RequestBody {
                body_type,
                raw: body.raw.clone(),
                form_data: None,
            }
        }
        Some("urlencoded") => {
            let form_data = body.urlencoded.as_ref().map(|params| convert_form_params(params));
            RequestBody {
                body_type: "x-www-form-urlencoded".to_string(),
                raw: None,
                form_data,
            }
        }
        Some("formdata") => {
            let form_data = body.formdata.as_ref().map(|params| convert_form_params(params));
            RequestBody {
                body_type: "form-data".to_string(),
                raw: None,
                form_data,
            }
        }
        Some("graphql") => {
            // Extract the GraphQL query from the graphql object or raw field
            let raw = body
                .graphql
                .as_ref()
                .and_then(|g| g.get("query"))
                .and_then(|v| v.as_str())
                .map(|s| s.to_string())
                .or_else(|| body.raw.clone());

            RequestBody {
                body_type: "raw".to_string(),
                raw,
                form_data: None,
            }
        }
        Some("file") => RequestBody {
            body_type: "text".to_string(),
            raw: None,
            form_data: None,
        },
        // Default: try raw if present, otherwise none
        _ => {
            if body.raw.is_some() {
                RequestBody {
                    body_type: "raw".to_string(),
                    raw: body.raw.clone(),
                    form_data: None,
                }
            } else {
                RequestBody {
                    body_type: "none".to_string(),
                    raw: None,
                    form_data: None,
                }
            }
        }
    }
}

fn convert_form_params(params: &[PostmanFormParam]) -> Vec<KeyValuePair> {
    params
        .iter()
        .map(|p| KeyValuePair {
            id: generate_id(),
            key: p.key.clone(),
            value: p.value.clone().unwrap_or_default(),
            enabled: !p.disabled.unwrap_or(false),
        })
        .collect()
}

// ── Header conversion ──

fn convert_headers(headers: &[PostmanHeader]) -> Vec<KeyValuePair> {
    headers
        .iter()
        .map(|h| KeyValuePair {
            id: generate_id(),
            key: h.key.clone(),
            value: h.value.clone(),
            enabled: !h.disabled.unwrap_or(false),
        })
        .collect()
}

// ── Event/Script conversion ──

fn convert_events_to_scripts(events: &[PostmanEvent]) -> Vec<Script> {
    events
        .iter()
        .filter_map(|event| {
            let listen = event.listen.as_deref()?;
            let script_type = match listen {
                "prerequest" => "pre-request",
                "test" => "test",
                _ => return None,
            };

            let code = event
                .script
                .as_ref()
                .and_then(|s| s.exec.as_ref())
                .map(|exec| extract_script_code(exec))
                .unwrap_or_default();

            if code.is_empty() {
                return None;
            }

            Some(Script {
                id: generate_id(),
                script_type: script_type.to_string(),
                code,
            })
        })
        .collect()
}

fn extract_script_code(exec: &serde_json::Value) -> String {
    match exec {
        serde_json::Value::Array(arr) => arr
            .iter()
            .filter_map(|v| v.as_str())
            .collect::<Vec<&str>>()
            .join("\n"),
        serde_json::Value::String(s) => s.clone(),
        _ => String::new(),
    }
}

// ── Variable conversion ──

fn convert_variables(variables: Option<&[PostmanVariable]>) -> Vec<Variable> {
    variables
        .map(|vars| {
            vars.iter()
                .map(|v| Variable {
                    id: generate_id(),
                    key: v.key.clone().unwrap_or_default(),
                    value: v
                        .value
                        .as_ref()
                        .map(|val| variable_value_to_string(val))
                        .unwrap_or_default(),
                    scope: "collection".to_string(),
                    enabled: !v.disabled.unwrap_or(false),
                })
                .collect()
        })
        .unwrap_or_default()
}

fn variable_value_to_string(value: &serde_json::Value) -> String {
    match value {
        serde_json::Value::String(s) => s.clone(),
        serde_json::Value::Number(n) => n.to_string(),
        serde_json::Value::Bool(b) => b.to_string(),
        serde_json::Value::Null => String::new(),
        other => other.to_string(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_detect_postman_collection() {
        let json = serde_json::json!({
            "info": {
                "name": "Test API",
                "schema": "https://schema.postman.com/json/collection/v2.1.0/collection.json"
            },
            "item": []
        });
        assert!(is_postman_collection(&json));

        // Should not detect native format
        let native = serde_json::json!({
            "version": 1,
            "workspaces": []
        });
        assert!(!is_postman_collection(&native));
    }

    #[test]
    fn test_convert_simple_request() {
        let json = serde_json::json!({
            "info": {
                "name": "Simple API",
                "schema": "https://schema.postman.com/collection/v2.1.0/collection.json"
            },
            "item": [
                {
                    "name": "Get Users",
                    "request": {
                        "method": "GET",
                        "header": [
                            { "key": "Authorization", "value": "Bearer token123" }
                        ],
                        "url": {
                            "raw": "https://api.example.com/users?page=1",
                            "protocol": "https",
                            "host": ["api", "example", "com"],
                            "path": ["users"],
                            "query": [
                                { "key": "page", "value": "1" }
                            ]
                        }
                    }
                }
            ],
            "variable": [
                { "key": "base_url", "value": "https://api.example.com", "type": "string" }
            ]
        });

        let collection: PostmanCollection = serde_json::from_value(json).unwrap();
        let workspace = convert_collection(collection);

        assert_eq!(workspace.name, "Simple API");
        assert_eq!(workspace.variables.len(), 1);
        assert_eq!(workspace.variables[0].key, "base_url");
        assert_eq!(workspace.variables[0].value, "https://api.example.com");

        // Root item should be in a default collection
        assert_eq!(workspace.collections.len(), 1);
        let col = &workspace.collections[0];
        assert_eq!(col.name, "Simple API");
        assert_eq!(col.requests.len(), 1);

        let req = &col.requests[0];
        assert_eq!(req.name, "Get Users");
        assert_eq!(req.method, "GET");
        assert_eq!(req.url, "https://api.example.com/users?page=1");
        assert_eq!(req.headers.len(), 1);
        assert_eq!(req.headers[0].key, "Authorization");
        assert_eq!(req.query_params.len(), 1);
        assert_eq!(req.query_params[0].key, "page");
        assert_eq!(req.query_params[0].value, "1");
    }

    #[test]
    fn test_convert_with_folders() {
        let json = serde_json::json!({
            "info": {
                "name": "Folder API",
                "schema": "https://schema.postman.com/collection/v2.1.0/collection.json"
            },
            "item": [
                {
                    "name": "Users",
                    "item": [
                        {
                            "name": "List Users",
                            "request": {
                                "method": "GET",
                                "url": "https://api.example.com/users"
                            }
                        },
                        {
                            "name": "Create User",
                            "request": {
                                "method": "POST",
                                "url": "https://api.example.com/users",
                                "body": {
                                    "mode": "raw",
                                    "raw": "{\"name\":\"John\"}",
                                    "options": {
                                        "raw": { "language": "json" }
                                    }
                                }
                            }
                        }
                    ]
                },
                {
                    "name": "Health Check",
                    "request": {
                        "method": "GET",
                        "url": "https://api.example.com/health"
                    }
                }
            ]
        });

        let collection: PostmanCollection = serde_json::from_value(json).unwrap();
        let workspace = convert_collection(collection);

        // "Users" folder → collection, "Health Check" → default collection
        assert_eq!(workspace.collections.len(), 2);
        let users_col = workspace.collections.iter().find(|c| c.name == "Users").unwrap();
        assert_eq!(users_col.requests.len(), 2);
        assert_eq!(users_col.requests[0].name, "List Users");
        assert_eq!(users_col.requests[1].name, "Create User");
        assert_eq!(users_col.requests[1].method, "POST");
        assert_eq!(
            users_col.requests[1].body.body_type,
            "json"
        );

        let health_col = workspace.collections.iter().find(|c| c.name == "Folder API").unwrap();
        assert_eq!(health_col.requests.len(), 1);
        assert_eq!(health_col.requests[0].name, "Health Check");
    }

    #[test]
    fn test_convert_url_string_and_object() {
        let json = serde_json::json!({
            "info": { "name": "URL Test", "schema": "https://schema.postman.com/collection/v2.1.0/collection.json" },
            "item": [
                {
                    "name": "String URL",
                    "request": {
                        "method": "GET",
                        "url": "https://example.com/path"
                    }
                },
                {
                    "name": "Object URL no raw",
                    "request": {
                        "method": "GET",
                        "url": {
                            "protocol": "https",
                            "host": ["api", "test", "com"],
                            "path": ["v1", "resource"]
                        }
                    }
                },
                {
                    "name": "Object URL empty raw",
                    "request": {
                        "method": "GET",
                        "url": {
                            "raw": "",
                            "protocol": "https",
                            "host": ["api", "test", "com"],
                            "path": ["v1", "resource"]
                        }
                    }
                }
            ]
        });

        let collection: PostmanCollection = serde_json::from_value(json).unwrap();
        let workspace = convert_collection(collection);
        let col = &workspace.collections[0];

        assert_eq!(col.requests[0].url, "https://example.com/path");
        assert_eq!(col.requests[1].url, "https://api.test.com/v1/resource");
        assert_eq!(col.requests[2].url, "https://api.test.com/v1/resource");
    }

    #[test]
    fn test_convert_body_modes() {
        let json = serde_json::json!({
            "info": { "name": "Body Test", "schema": "https://schema.postman.com/collection/v2.1.0/collection.json" },
            "item": [
                {
                    "name": "Raw JSON",
                    "request": {
                        "method": "POST",
                        "url": "https://example.com/api",
                        "body": {
                            "mode": "raw",
                            "raw": "{\"key\":\"value\"}",
                            "options": { "raw": { "language": "json" } }
                        }
                    }
                },
                {
                    "name": "Form URL Encoded",
                    "request": {
                        "method": "POST",
                        "url": "https://example.com/api",
                        "body": {
                            "mode": "urlencoded",
                            "urlencoded": [
                                { "key": "field1", "value": "val1" },
                                { "key": "field2", "value": "val2", "disabled": true }
                            ]
                        }
                    }
                },
                {
                    "name": "Form Data",
                    "request": {
                        "method": "POST",
                        "url": "https://example.com/api",
                        "body": {
                            "mode": "formdata",
                            "formdata": [
                                { "key": "file", "value": "content", "type": "text" }
                            ]
                        }
                    }
                },
                {
                    "name": "No Body",
                    "request": {
                        "method": "GET",
                        "url": "https://example.com/api"
                    }
                }
            ]
        });

        let collection: PostmanCollection = serde_json::from_value(json).unwrap();
        let workspace = convert_collection(collection);
        let col = &workspace.collections[0];

        // Raw JSON
        assert_eq!(col.requests[0].body.body_type, "json");
        assert_eq!(col.requests[0].body.raw.as_deref(), Some("{\"key\":\"value\"}"));

        // URL Encoded
        assert_eq!(col.requests[1].body.body_type, "x-www-form-urlencoded");
        let form_data = col.requests[1].body.form_data.as_ref().unwrap();
        assert_eq!(form_data.len(), 2);
        assert!(form_data[0].enabled);
        assert!(!form_data[1].enabled);

        // Form Data
        assert_eq!(col.requests[2].body.body_type, "form-data");
        assert_eq!(col.requests[3].body.body_type, "none");
    }

    #[test]
    fn test_convert_scripts() {
        let json = serde_json::json!({
            "info": { "name": "Script Test", "schema": "https://schema.postman.com/collection/v2.1.0/collection.json" },
            "item": [
                {
                    "name": "Scripted Request",
                    "event": [
                        {
                            "listen": "prerequest",
                            "script": {
                                "exec": [
                                    "pm.variables.set(\"key\", \"value\");",
                                    "console.log(\"pre-request\");"
                                ],
                                "type": "text/javascript"
                            }
                        },
                        {
                            "listen": "test",
                            "script": {
                                "exec": [
                                    "pm.test(\"Status 200\", function() {",
                                    "  pm.response.to.have.status(200);",
                                    "});"
                                ],
                                "type": "text/javascript"
                            }
                        }
                    ],
                    "request": {
                        "method": "GET",
                        "url": "https://example.com/api"
                    }
                }
            ]
        });

        let collection: PostmanCollection = serde_json::from_value(json).unwrap();
        let workspace = convert_collection(collection);
        let col = &workspace.collections[0];
        let req = &col.requests[0];

        assert_eq!(req.scripts.len(), 2);

        let pre_req = req.scripts.iter().find(|s| s.script_type == "pre-request").unwrap();
        assert!(pre_req.code.contains("pm.variables.set"));
        assert!(pre_req.code.contains("console.log"));

        let test_script = req.scripts.iter().find(|s| s.script_type == "test").unwrap();
        assert!(test_script.code.contains("pm.test"));
    }

    #[test]
    fn test_convert_nested_folders() {
        let json = serde_json::json!({
            "info": { "name": "Nested", "schema": "https://schema.postman.com/collection/v2.1.0/collection.json" },
            "item": [
                {
                    "name": "Parent",
                    "item": [
                        {
                            "name": "Child Folder",
                            "item": [
                                {
                                    "name": "Deep Request",
                                    "request": {
                                        "method": "GET",
                                        "url": "https://example.com/deep"
                                    }
                                }
                            ]
                        },
                        {
                            "name": "Parent Request",
                            "request": {
                                "method": "GET",
                                "url": "https://example.com/parent"
                            }
                        }
                    ]
                }
            ]
        });

        let collection: PostmanCollection = serde_json::from_value(json).unwrap();
        let workspace = convert_collection(collection);

        // "Parent" collection should have "Parent Request"
        // "Child Folder" should be a separate collection
        assert_eq!(workspace.collections.len(), 2);
        let parent = workspace.collections.iter().find(|c| c.name == "Parent").unwrap();
        let child = workspace.collections.iter().find(|c| c.name == "Child Folder").unwrap();

        assert_eq!(parent.requests.len(), 1);
        assert_eq!(parent.requests[0].name, "Parent Request");

        assert_eq!(child.requests.len(), 1);
        assert_eq!(child.requests[0].name, "Deep Request");
    }

    #[test]
    fn test_convert_collection_level_scripts() {
        let json = serde_json::json!({
            "info": { "name": "Coll Scripts", "schema": "https://schema.postman.com/collection/v2.1.0/collection.json" },
            "event": [
                {
                    "listen": "prerequest",
                    "script": {
                        "exec": ["console.log(\"collection pre-request\");"],
                        "type": "text/javascript"
                    }
                }
            ],
            "item": [
                {
                    "name": "Req 1",
                    "request": {
                        "method": "GET",
                        "url": "https://example.com/1"
                    }
                },
                {
                    "name": "Req 2",
                    "request": {
                        "method": "GET",
                        "url": "https://example.com/2"
                    }
                }
            ]
        });

        let collection: PostmanCollection = serde_json::from_value(json).unwrap();
        let workspace = convert_collection(collection);
        let col = &workspace.collections[0];

        // Both requests should inherit the collection-level pre-request script
        assert_eq!(col.requests[0].scripts.len(), 1);
        assert_eq!(col.requests[0].scripts[0].script_type, "pre-request");

        assert_eq!(col.requests[1].scripts.len(), 1);
        assert_eq!(col.requests[1].scripts[0].script_type, "pre-request");
    }

    #[test]
    fn test_convert_graphql() {
        let json = serde_json::json!({
            "info": { "name": "GraphQL API", "schema": "https://schema.postman.com/collection/v2.1.0/collection.json" },
            "item": [
                {
                    "name": "GraphQL Query",
                    "request": {
                        "method": "POST",
                        "url": "https://example.com/graphql",
                        "body": {
                            "mode": "graphql",
                            "graphql": {
                                "query": "query { users { id name } }"
                            }
                        }
                    }
                }
            ]
        });

        let collection: PostmanCollection = serde_json::from_value(json).unwrap();
        let workspace = convert_collection(collection);
        let col = &workspace.collections[0];
        let req = &col.requests[0];

        assert_eq!(req.body.body_type, "raw");
        assert!(req.body.raw.as_deref().unwrap().contains("users"));
    }
}
