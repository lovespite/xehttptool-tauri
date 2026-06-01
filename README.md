# xehttptool

A cross-platform desktop HTTP client built with Tauri v2 (Rust + React/TypeScript). Design and send HTTP requests, manage them in workspaces, run pre-request and test scripts, start a mock server, and configure proxy routing — all from a single dark-themed UI.

---

## Features

### Request Composer
- **Methods**: GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS
- **URL bar** with variable resolution (`{{variableName}}`)
- **Query parameters**: key-value table editor with enable/disable toggle
- **Headers**: key-value table editor
- **Body types**: None, JSON, XML, Text, Form Data, URL-Encoded
- **Configurable timeout**

### Scripting
- **Pre-request scripts** — JavaScript that runs before the request is sent. Modify variables, compute dynamic values, set timestamps.
- **Test scripts** — JavaScript that runs after the response arrives. Assert on status codes, response body, headers.
- **`pm.*` API**: `pm.variables.get/set/unset/clear`, `pm.response.*`, `pm.expect().to.equal/be/include/a()`
- **Console panel**: see `console.log/warn/error` output and assertion results live below the editor

### Variable System
Three scopes: **Request**, **Collection**, **Workspace**
- Variables cascade: request → collection → workspace
- Read and write from scripts or the variable editor
- Resolved in URL, headers, and body via `{{variableName}}` syntax

### Mock Server
Built-in HTTP mock server (Axum)
- Start/stop on any port
- Define routes by method + path → status code + response body + headers
- First-match routing

### Proxy & Rule System
- Global toggle with ordered rule list
- Glob-pattern matching (`*.example.com`, `*`) against target hostnames
- Per-rule proxy URL (HTTP, HTTPS, SOCKS5)
- Fallback proxy when no rule matches
- Import/export rule files as JSON for team distribution

### Workspace Management
- Create/rename/delete workspaces, collections, and requests
- Tree sidebar navigation with context menus
- Auto-save (500ms debounced)
- Export/import workspaces as JSON files

### History
- Automatically save request/response pairs
- Browse past requests with full response details
- Review status, timing, and size

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) >= 18
- [bun](https://bun.sh/) (package manager)
- [Rust](https://www.rust-lang.org/) >= 1.81
- [Tauri v2 prerequisites](https://v2.tauri.app/start/prerequisites/) (platform-specific)

### Development

```bash
# Install dependencies
bun install

# Start the dev server (Vite + Tauri)
bun run tauri dev
```

### Build

```bash
# Build for production
bun run tauri build
```

---

## Usage

### Creating and Sending a Request

1. Click **New Workspace** → enter a name
2. Right-click the workspace → **New Collection** → enter a name
3. Right-click the collection → **New Request** → enter a name
4. Select the request, enter a URL, choose a method
5. Optionally add params, headers, or a body
6. Click **Send**

### Using Variables

1. Open the **Variables** tab in the right panel
2. Add variables at workspace, collection, or request scope
3. Reference them in the URL or headers: `{{baseUrl}}/users`

### Writing Scripts

Switch to the **Scripts** tab in the request editor.

```javascript
// Pre-request: set a timestamp
pm.variables.set('timestamp', Date.now().toString());

// Test: assert the response
pm.expect(pm.response.status).to.equal(200);
const json = pm.response.json();
pm.expect(json.success).to.be(true);

// Debug output
console.log('Response time:', pm.response.timing, 'ms');
```

Script output and assertion errors appear in the **Console** panel below the request editor.

### Starting a Mock Server

1. Open the **Mock Server** tab in the right panel
2. Set a port number
3. Add routes (method, path, status code, response body)
4. Click **Start**

### Configuring Proxy Rules

1. Open the **Proxy** tab in the right panel
2. Enable the proxy toggle
3. Add rules (e.g., `*.example.com` → `http://127.0.0.1:8080`)
4. Set a fallback proxy or enter `"direct"`
5. Rules are evaluated top-to-bottom; first match wins
6. Export/import rules as `.json` files

---

## Architecture

```
src/                     Frontend (React + TypeScript)
├── types/               TypeScript definitions
├── store/               Zustand state stores (with immer)
├── services/            Tauri invoke wrappers
├── hooks/               React hooks (send pipeline, auto-save)
├── components/
│   ├── Layout/          App shell with resizable panels
│   ├── Request/         URL bar, method selector, body editor
│   ├── Response/        Response viewer with tabs
│   ├── Sidebar/         Workspace tree
│   ├── Mock/            Mock server controls
│   ├── Proxy/           Proxy rule editor
│   ├── Console/         Script output console
│   ├── Script/          CodeMirror-based script editors
│   ├── Variable/        Variable explorer and editor
│   ├── History/         Request history list
│   └── common/          Reusable KeyValueTable, CodeEditor
└── utils/               Variable resolver, script sandbox, autocomplete

src-tauri/               Backend (Rust)
├── src/
│   ├── http_client.rs   HTTP client (reqwest)
│   ├── mock_server.rs   Mock server (Axum)
│   ├── proxy.rs         Proxy config persistence and rule matching
│   ├── persistence.rs   Workspace file I/O
│   ├── history.rs       History file I/O
│   ├── models.rs        Shared data structures
│   └── commands/        Tauri command handlers
└── Cargo.toml           Rust dependencies
```

### Request Pipeline

```
Pre-request Script → Variable Resolution → Proxy Resolution → Send HTTP → Test Script → Display
```

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19 + TypeScript |
| State management | Zustand 5 + immer |
| Code editor | CodeMirror 6 |
| Layout | react-resizable-panels |
| Desktop framework | Tauri v2 |
| Backend | Rust 2021 |
| HTTP client | reqwest 0.13 |
| Mock server | Axum 0.8 + Tokio |
| Build | Vite + Cargo |

---

## License

MIT
