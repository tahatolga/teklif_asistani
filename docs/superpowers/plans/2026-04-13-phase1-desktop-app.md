# Phase 1 Desktop App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a local-first Windows desktop app (Tauri + React) that lets the user define parameters, manage customers, and capture structured proposal data as JSON files on disk, with auto-update enabled by default.

**Architecture:** Tauri 2.x hybrid app. Rust backend owns all file I/O, validation, and schema migration. React frontend (Mantine) provides the UI and generates dynamic forms from a user-defined parameter catalog. All data lives in a user-chosen folder as JSON files, organized per customer. Releases are signed and distributed via GitHub Releases.

**Tech Stack:** Tauri 2, Rust (serde, tokio, zip, tracing), React 18 + Vite + TypeScript, Mantine v7, React Router, Zustand, react-hook-form, zod, dnd-kit, Vitest, cargo test.

**Spec reference:** `docs/superpowers/specs/2026-04-13-phase1-desktop-app-design.md`

---

## File Structure

### Rust backend (`src-tauri/src/`)

| File | Responsibility |
|---|---|
| `main.rs` | Tauri app bootstrap, command registration, plugin init |
| `error.rs` | `AppError` enum + `impl Serialize` for frontend |
| `models/mod.rs` | re-exports |
| `models/customer.rs` | `Customer`, `CustomerInput`, `CustomerSummary` |
| `models/proposal.rs` | `Proposal`, `ProposalInput`, `ProposalSummary`, `ProposalFilter`, `ProposalStatus` |
| `models/parameter.rs` | `Parameter`, `ParameterCatalog`, `ParameterType`, `ParameterSnapshot` |
| `models/settings.rs` | `Settings`, `SettingsInput`, `AppInfo`, `BackupEntry`, `RestoreMode` |
| `storage/paths.rs` | `DataPaths` — resolves dirs relative to data root |
| `storage/atomic.rs` | `atomic_write_json` helper |
| `storage/slug.rs` | `slugify` + unique slug resolution |
| `storage/customers.rs` | Read/write customer files |
| `storage/proposals.rs` | Read/write proposal files, glob, filter |
| `storage/parameters.rs` | Load/save parameters.json with mutex |
| `storage/backup.rs` | Zip/unzip with mode |
| `storage/settings.rs` | Load/save settings.json |
| `validation/parameters.rs` | Validate `custom_fields` against catalog |
| `migration/mod.rs` | `migrate_if_needed` entry point, v1 stub |
| `commands/customers.rs` | Tauri commands: list/get/create/update/delete |
| `commands/proposals.rs` | Tauri commands + field history + prefill |
| `commands/parameters.rs` | Tauri commands: get/upsert/delete/reorder |
| `commands/backup.rs` | Tauri commands: create/list/restore/delete |
| `commands/settings.rs` | Tauri commands: get/update, init_data_dir, app_info, check_for_update |
| `state.rs` | `AppState` struct held in `tauri::State` (data root, caches, mutexes) |

### Frontend (`src/`)

| File | Responsibility |
|---|---|
| `main.tsx` | React root, MantineProvider, Router |
| `App.tsx` | Layout shell with sidebar |
| `types.ts` | TypeScript mirrors of Rust types |
| `lib/api.ts` | Typed `invoke` wrappers for every Tauri command |
| `lib/schema.ts` | Build zod schema from `ParameterCatalog` |
| `lib/errors.ts` | Translate `AppError` → Turkish message; `showError` helper |
| `lib/i18n/tr.ts` | UI string table |
| `lib/prefill.ts` | Merge prefill values into form initial state |
| `stores/settings.ts` | Zustand store: settings, data root |
| `stores/parameters.ts` | Zustand store: parameter catalog cache |
| `components/AppShell.tsx` | Sidebar + header layout |
| `components/DataTable.tsx` | Generic Mantine DataTable wrapper |
| `components/DynamicField.tsx` | Renders one parameter field (text/number/select/...) |
| `components/FieldHistoryCombobox.tsx` | Combobox driven by `get_field_history` |
| `components/ParameterForm.tsx` | Add/edit parameter modal |
| `components/ConfirmDialog.tsx` | Reusable confirm modal |
| `components/UnsavedGuard.tsx` | Router block for dirty forms |
| `components/UpdateNotifier.tsx` | Toast for new version |
| `routes/Dashboard.tsx` | Overview cards + recent proposals |
| `routes/Customers/List.tsx` | Customer table + search |
| `routes/Customers/Detail.tsx` | Customer detail + their proposals |
| `routes/Customers/Form.tsx` | Customer create/edit form |
| `routes/Proposals/List.tsx` | Proposals table + filters |
| `routes/Proposals/Form.tsx` | Proposal create/edit dynamic form |
| `routes/Parameters.tsx` | Parameter catalog table + drag-reorder |
| `routes/Backup.tsx` | Backup create/list/restore |
| `routes/Settings.tsx` | Settings screen |
| `routes/FirstRun.tsx` | First-run data directory picker |

### Config / build

| File | Responsibility |
|---|---|
| `src-tauri/tauri.conf.json` | Bundle config, updater endpoint, pubkey |
| `src-tauri/Cargo.toml` | Rust deps |
| `package.json` | Frontend deps + scripts |
| `vite.config.ts` | Vite config, Tauri port |
| `tsconfig.json` | TS config |
| `.github/workflows/release.yml` | Build + sign + publish release |
| `docs/manual-test.md` | Smoke test checklist |

---

## Conventions

- **Commits:** Conventional Commits (`feat:`, `fix:`, `chore:`, `test:`). Commit after every green test run.
- **TDD:** Red → green → commit. Refactor only when tests are green.
- **Rust tests:** All storage/validation tests use `tempfile::tempdir()`; no shared state.
- **Frontend:** Co-locate unit tests as `*.test.ts` next to the file. Component tests are minimal; favor pure-function tests in `lib/`.
- **File paths:** Always absolute from repo root in this plan.
- **Rust module visibility:** Prefer `pub(crate)` over `pub` unless the item crosses the module boundary.

---

## Task 0: Scaffold Tauri + React project

**Files:**
- Create: `D:/Projects/fikstur_teklif_asistani/package.json`
- Create: `D:/Projects/fikstur_teklif_asistani/src-tauri/Cargo.toml`
- Create: `D:/Projects/fikstur_teklif_asistani/src-tauri/tauri.conf.json`
- Create: `D:/Projects/fikstur_teklif_asistani/src/main.tsx`
- Create: `D:/Projects/fikstur_teklif_asistani/.gitignore`

- [ ] **Step 1: Initialize Tauri project via CLI**

Run from `D:/Projects/fikstur_teklif_asistani/`:

```bash
npm create tauri-app@latest -- --template react-ts --manager npm --identifier com.fikstur.teklif --name fikstur-teklif-asistani .
```

When prompted to use the current (non-empty) directory, accept. The `docs/` folder must remain untouched.

- [ ] **Step 2: Install frontend dependencies**

```bash
npm install @mantine/core @mantine/hooks @mantine/dates @mantine/notifications @mantine/modals @mantine/form @tabler/icons-react react-router-dom zustand react-hook-form @hookform/resolvers zod @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities dayjs
npm install -D vitest @vitest/ui @testing-library/react @testing-library/jest-dom jsdom
```

- [ ] **Step 3: Add Rust dependencies**

Edit `src-tauri/Cargo.toml`, replace the `[dependencies]` section with:

```toml
[dependencies]
tauri = { version = "2", features = [] }
tauri-plugin-shell = "2"
tauri-plugin-dialog = "2"
tauri-plugin-fs = "2"
tauri-plugin-updater = "2"
serde = { version = "1", features = ["derive"] }
serde_json = "1"
thiserror = "1"
chrono = { version = "0.4", features = ["serde"] }
uuid = { version = "1", features = ["v4", "serde"] }
zip = "0.6"
walkdir = "2"
tracing = "0.1"
tracing-subscriber = { version = "0.3", features = ["env-filter"] }
tracing-appender = "0.2"
dirs = "5"
anyhow = "1"
regex = "1"

[dev-dependencies]
tempfile = "3"
assert_fs = "1"
```

- [ ] **Step 4: Verify dev server starts**

Run: `npm run tauri dev`
Expected: Tauri window opens with default React template. Close the window.

- [ ] **Step 5: Commit**

```bash
git init
git add .
git commit -m "chore: scaffold tauri + react + deps"
```

---

## Task 1: Error type and base module layout

**Files:**
- Create: `src-tauri/src/error.rs`
- Modify: `src-tauri/src/main.rs` (create `lib.rs` if template uses it)
- Test: `src-tauri/src/error.rs` (inline `#[cfg(test)]`)

- [ ] **Step 1: Write failing test for error serialization**

Create `src-tauri/src/error.rs`:

```rust
use serde::Serialize;
use thiserror::Error;

#[derive(Debug, Error, Serialize)]
#[serde(tag = "kind", rename_all = "snake_case")]
pub enum AppError {
    #[error("{entity} not found: {id}")]
    NotFound { entity: String, id: String },

    #[error("validation failed on {field}: {message}")]
    Validation { field: String, message: String },

    #[error("conflict: {message}")]
    Conflict { message: String },

    #[error("io error: {message}")]
    Io { message: String },

    #[error("corrupt file at {path}: {reason}")]
    Corrupt { path: String, reason: String },
}

impl From<std::io::Error> for AppError {
    fn from(err: std::io::Error) -> Self {
        AppError::Io { message: err.to_string() }
    }
}

impl From<serde_json::Error> for AppError {
    fn from(err: serde_json::Error) -> Self {
        AppError::Corrupt { path: String::new(), reason: err.to_string() }
    }
}

pub type AppResult<T> = Result<T, AppError>;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn serializes_not_found_with_tag() {
        let err = AppError::NotFound { entity: "customer".into(), id: "abc".into() };
        let json = serde_json::to_string(&err).unwrap();
        assert!(json.contains("\"kind\":\"not_found\""));
        assert!(json.contains("\"entity\":\"customer\""));
    }

    #[test]
    fn from_io_maps_to_io_variant() {
        let io_err = std::io::Error::new(std::io::ErrorKind::Other, "boom");
        let err: AppError = io_err.into();
        assert!(matches!(err, AppError::Io { .. }));
    }
}
```

- [ ] **Step 2: Register module in `lib.rs`**

Edit `src-tauri/src/lib.rs` (the Tauri template creates this; if absent, create it). Add at top:

```rust
pub mod error;
```

- [ ] **Step 3: Run tests**

Run: `cd src-tauri && cargo test error::`
Expected: 2 passed.

- [ ] **Step 4: Commit**

```bash
git add src-tauri/src/error.rs src-tauri/src/lib.rs
git commit -m "feat(backend): add AppError enum with serde tagging"
```

---

## Task 2: Data models (Customer, Proposal, Parameter)

**Files:**
- Create: `src-tauri/src/models/mod.rs`
- Create: `src-tauri/src/models/customer.rs`
- Create: `src-tauri/src/models/parameter.rs`
- Create: `src-tauri/src/models/proposal.rs`
- Create: `src-tauri/src/models/settings.rs`

- [ ] **Step 1: Create `models/mod.rs`**

```rust
pub mod customer;
pub mod parameter;
pub mod proposal;
pub mod settings;
```

Register in `lib.rs`: `pub mod models;`

- [ ] **Step 2: Write `models/parameter.rs` with failing test**

```rust
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum ParameterType {
    Text,
    Textarea,
    Number,
    Select,
    Multiselect,
    Boolean,
    Date,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Parameter {
    pub key: String,
    pub label: String,
    #[serde(default)]
    pub description: String,
    #[serde(rename = "type")]
    pub parameter_type: ParameterType,
    #[serde(default)]
    pub options: Vec<String>,
    #[serde(default)]
    pub unit: Option<String>,
    #[serde(default)]
    pub min: Option<f64>,
    #[serde(default)]
    pub max: Option<f64>,
    #[serde(default)]
    pub max_length: Option<usize>,
    #[serde(default)]
    pub required: bool,
    pub order: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ParameterCatalog {
    pub schema_version: u32,
    pub updated_at: chrono::DateTime<chrono::Utc>,
    pub parameters: Vec<Parameter>,
}

impl ParameterCatalog {
    pub fn empty() -> Self {
        Self {
            schema_version: 1,
            updated_at: chrono::Utc::now(),
            parameters: Vec::new(),
        }
    }

    pub fn find(&self, key: &str) -> Option<&Parameter> {
        self.parameters.iter().find(|p| p.key == key)
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ParameterSnapshot {
    pub key: String,
    pub label: String,
    #[serde(rename = "type")]
    pub parameter_type: ParameterType,
    #[serde(default)]
    pub unit: Option<String>,
}

impl From<&Parameter> for ParameterSnapshot {
    fn from(p: &Parameter) -> Self {
        Self {
            key: p.key.clone(),
            label: p.label.clone(),
            parameter_type: p.parameter_type.clone(),
            unit: p.unit.clone(),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn roundtrip_parameter_catalog() {
        let cat = ParameterCatalog {
            schema_version: 1,
            updated_at: chrono::Utc::now(),
            parameters: vec![Parameter {
                key: "malzeme".into(),
                label: "Malzeme".into(),
                description: "Hammadde".into(),
                parameter_type: ParameterType::Select,
                options: vec!["Çelik".into()],
                unit: None,
                min: None,
                max: None,
                max_length: None,
                required: true,
                order: 1,
            }],
        };
        let json = serde_json::to_string(&cat).unwrap();
        let back: ParameterCatalog = serde_json::from_str(&json).unwrap();
        assert_eq!(back.parameters.len(), 1);
        assert_eq!(back.parameters[0].key, "malzeme");
    }
}
```

- [ ] **Step 3: Write `models/customer.rs`**

```rust
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Customer {
    pub id: String,
    pub schema_version: u32,
    pub name: String,
    #[serde(default)]
    pub contact_person: String,
    #[serde(default)]
    pub email: String,
    #[serde(default)]
    pub phone: String,
    #[serde(default)]
    pub address: String,
    #[serde(default)]
    pub tax_office: String,
    #[serde(default)]
    pub tax_no: String,
    #[serde(default)]
    pub notes: String,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CustomerInput {
    pub name: String,
    #[serde(default)]
    pub contact_person: String,
    #[serde(default)]
    pub email: String,
    #[serde(default)]
    pub phone: String,
    #[serde(default)]
    pub address: String,
    #[serde(default)]
    pub tax_office: String,
    #[serde(default)]
    pub tax_no: String,
    #[serde(default)]
    pub notes: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CustomerSummary {
    pub id: String,
    pub name: String,
    pub contact_person: String,
    pub phone: String,
    pub proposal_count: u32,
    pub last_activity: Option<chrono::DateTime<chrono::Utc>>,
}
```

- [ ] **Step 4: Write `models/proposal.rs`**

```rust
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

use super::parameter::ParameterSnapshot;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum ProposalStatus {
    Taslak,
    Gonderildi,
    Kazanildi,
    Kaybedildi,
    Beklemede,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Proposal {
    pub id: String,
    pub schema_version: u32,
    pub customer_id: String,
    pub title: String,
    pub status: ProposalStatus,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
    pub total_amount: f64,
    pub currency: String,
    #[serde(default)]
    pub notes: String,
    pub custom_fields: HashMap<String, serde_json::Value>,
    pub parameter_snapshot: Vec<ParameterSnapshot>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProposalInput {
    pub customer_id: String,
    pub title: String,
    pub status: ProposalStatus,
    pub total_amount: f64,
    pub currency: String,
    #[serde(default)]
    pub notes: String,
    pub custom_fields: HashMap<String, serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProposalSummary {
    pub id: String,
    pub customer_id: String,
    pub customer_name: String,
    pub title: String,
    pub status: ProposalStatus,
    pub total_amount: f64,
    pub currency: String,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct ProposalFilter {
    pub customer_id: Option<String>,
    pub status: Option<ProposalStatus>,
    pub date_from: Option<chrono::DateTime<chrono::Utc>>,
    pub date_to: Option<chrono::DateTime<chrono::Utc>>,
    pub search: Option<String>,
}
```

- [ ] **Step 5: Write `models/settings.rs`**

```rust
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Settings {
    pub schema_version: u32,
    pub data_dir: String,
    pub default_currency: String,
    pub auto_update_enabled: bool,
    pub skipped_version: Option<String>,
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            schema_version: 1,
            data_dir: String::new(),
            default_currency: "TRY".into(),
            auto_update_enabled: true,
            skipped_version: None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SettingsInput {
    pub default_currency: Option<String>,
    pub auto_update_enabled: Option<bool>,
    pub skipped_version: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppInfo {
    pub version: String,
    pub data_dir: String,
    pub customer_count: u32,
    pub proposal_count: u32,
    pub parameter_count: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BackupEntry {
    pub name: String,
    pub path: String,
    pub size_bytes: u64,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum RestoreMode {
    Merge,
    Replace,
}
```

- [ ] **Step 6: Run tests**

Run: `cd src-tauri && cargo test models::`
Expected: `roundtrip_parameter_catalog` passes, models compile.

- [ ] **Step 7: Commit**

```bash
git add src-tauri/src/models src-tauri/src/lib.rs
git commit -m "feat(backend): add data models for customers, proposals, parameters, settings"
```

---

## Task 3: Storage primitives — paths, atomic write, slug

**Files:**
- Create: `src-tauri/src/storage/mod.rs`
- Create: `src-tauri/src/storage/paths.rs`
- Create: `src-tauri/src/storage/atomic.rs`
- Create: `src-tauri/src/storage/slug.rs`

- [ ] **Step 1: Create `storage/mod.rs`**

```rust
pub mod atomic;
pub mod paths;
pub mod slug;
pub mod customers;
pub mod proposals;
pub mod parameters;
pub mod settings;
pub mod backup;
```

Register in `lib.rs`: `pub mod storage;`

Note: the submodules `customers`, `proposals`, etc. will be created in later tasks. For now stub them as empty files to let the compiler succeed — create `src-tauri/src/storage/customers.rs`, `proposals.rs`, `parameters.rs`, `settings.rs`, `backup.rs` each containing only a single comment line `// populated in later task`.

- [ ] **Step 2: Write `storage/paths.rs`**

```rust
use std::path::{Path, PathBuf};

#[derive(Debug, Clone)]
pub struct DataPaths {
    root: PathBuf,
}

impl DataPaths {
    pub fn new(root: impl Into<PathBuf>) -> Self {
        Self { root: root.into() }
    }

    pub fn root(&self) -> &Path { &self.root }
    pub fn app_json(&self) -> PathBuf { self.root.join("app.json") }
    pub fn parameters_json(&self) -> PathBuf { self.root.join("parameters.json") }
    pub fn settings_json(&self) -> PathBuf { self.root.join("settings.json") }
    pub fn customers_dir(&self) -> PathBuf { self.root.join("customers") }
    pub fn backups_dir(&self) -> PathBuf { self.root.join("backups") }
    pub fn logs_dir(&self) -> PathBuf { self.root.join("logs") }

    pub fn customer_dir(&self, customer_id: &str) -> PathBuf {
        self.customers_dir().join(customer_id)
    }
    pub fn customer_json(&self, customer_id: &str) -> PathBuf {
        self.customer_dir(customer_id).join("customer.json")
    }
    pub fn proposals_dir(&self, customer_id: &str) -> PathBuf {
        self.customer_dir(customer_id).join("proposals")
    }
    pub fn attachments_dir(&self, customer_id: &str) -> PathBuf {
        self.customer_dir(customer_id).join("attachments")
    }

    pub fn ensure_structure(&self) -> std::io::Result<()> {
        std::fs::create_dir_all(self.customers_dir())?;
        std::fs::create_dir_all(self.backups_dir())?;
        std::fs::create_dir_all(self.logs_dir())?;
        Ok(())
    }
}
```

- [ ] **Step 3: Write failing test for atomic_write_json**

Create `src-tauri/src/storage/atomic.rs`:

```rust
use crate::error::{AppError, AppResult};
use serde::Serialize;
use std::fs;
use std::io::Write;
use std::path::Path;

pub fn atomic_write_json<T: Serialize>(path: &Path, value: &T) -> AppResult<()> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)?;
    }
    let tmp = path.with_extension("json.tmp");
    {
        let mut file = fs::File::create(&tmp)?;
        let data = serde_json::to_vec_pretty(value)
            .map_err(|e| AppError::Io { message: e.to_string() })?;
        file.write_all(&data)?;
        file.sync_all()?;
    }
    fs::rename(&tmp, path)?;
    Ok(())
}

pub fn read_json<T: for<'de> serde::Deserialize<'de>>(path: &Path) -> AppResult<T> {
    let bytes = fs::read(path)
        .map_err(|e| AppError::Io { message: format!("{}: {}", path.display(), e) })?;
    serde_json::from_slice(&bytes).map_err(|e| AppError::Corrupt {
        path: path.display().to_string(),
        reason: e.to_string(),
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[test]
    fn write_then_read_roundtrip() {
        let dir = tempdir().unwrap();
        let path = dir.path().join("sub").join("data.json");
        let value = serde_json::json!({"a": 1, "b": "hello"});
        atomic_write_json(&path, &value).unwrap();
        let back: serde_json::Value = read_json(&path).unwrap();
        assert_eq!(back["a"], 1);
    }

    #[test]
    fn no_tmp_file_left_behind() {
        let dir = tempdir().unwrap();
        let path = dir.path().join("data.json");
        atomic_write_json(&path, &serde_json::json!({"k": 1})).unwrap();
        let tmp = path.with_extension("json.tmp");
        assert!(!tmp.exists());
    }
}
```

- [ ] **Step 4: Write `storage/slug.rs` with test**

```rust
use regex::Regex;
use std::path::Path;

pub fn slugify(name: &str) -> String {
    let lower = name.to_lowercase();
    let mut mapped = String::with_capacity(lower.len());
    for ch in lower.chars() {
        let replacement: Option<&str> = match ch {
            'ç' => Some("c"),
            'ğ' => Some("g"),
            'ı' => Some("i"),
            'ö' => Some("o"),
            'ş' => Some("s"),
            'ü' => Some("u"),
            _ => None,
        };
        if let Some(r) = replacement {
            mapped.push_str(r);
        } else {
            mapped.push(ch);
        }
    }
    let re = Regex::new(r"[^a-z0-9]+").unwrap();
    let cleaned = re.replace_all(&mapped, "-");
    cleaned.trim_matches('-').to_string()
}

pub fn unique_slug(base: &str, parent_dir: &Path) -> String {
    let mut candidate = base.to_string();
    let mut n = 2;
    while parent_dir.join(&candidate).exists() {
        candidate = format!("{}-{}", base, n);
        n += 1;
    }
    candidate
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[test]
    fn slugify_turkish() {
        assert_eq!(slugify("ACME Makina A.Ş."), "acme-makina-a-s");
        assert_eq!(slugify("Öz Çelik Ğürgen"), "oz-celik-gurgen");
    }

    #[test]
    fn unique_slug_appends_suffix() {
        let dir = tempdir().unwrap();
        std::fs::create_dir_all(dir.path().join("acme")).unwrap();
        assert_eq!(unique_slug("acme", dir.path()), "acme-2");
        std::fs::create_dir_all(dir.path().join("acme-2")).unwrap();
        assert_eq!(unique_slug("acme", dir.path()), "acme-3");
    }
}
```

- [ ] **Step 5: Run tests**

Run: `cd src-tauri && cargo test storage::`
Expected: 4 passed (2 atomic + 2 slug).

- [ ] **Step 6: Commit**

```bash
git add src-tauri/src/storage src-tauri/src/lib.rs
git commit -m "feat(backend): add storage primitives (paths, atomic write, slug)"
```

---

## Task 4: Parameter catalog storage + validation

**Files:**
- Modify: `src-tauri/src/storage/parameters.rs`
- Create: `src-tauri/src/validation/mod.rs`
- Create: `src-tauri/src/validation/parameters.rs`

- [ ] **Step 1: Register `validation` module**

Add to `lib.rs`: `pub mod validation;`. Create `src-tauri/src/validation/mod.rs`:

```rust
pub mod parameters;
```

- [ ] **Step 2: Write `storage/parameters.rs` with test**

```rust
use crate::error::AppResult;
use crate::models::parameter::ParameterCatalog;
use crate::storage::atomic::{atomic_write_json, read_json};
use crate::storage::paths::DataPaths;

pub fn load(paths: &DataPaths) -> AppResult<ParameterCatalog> {
    let path = paths.parameters_json();
    if !path.exists() {
        return Ok(ParameterCatalog::empty());
    }
    read_json(&path)
}

pub fn save(paths: &DataPaths, catalog: &ParameterCatalog) -> AppResult<()> {
    atomic_write_json(&paths.parameters_json(), catalog)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::parameter::{Parameter, ParameterType};
    use tempfile::tempdir;

    #[test]
    fn load_returns_empty_when_missing() {
        let dir = tempdir().unwrap();
        let paths = DataPaths::new(dir.path());
        let cat = load(&paths).unwrap();
        assert_eq!(cat.parameters.len(), 0);
    }

    #[test]
    fn save_then_load_roundtrip() {
        let dir = tempdir().unwrap();
        let paths = DataPaths::new(dir.path());
        let mut cat = ParameterCatalog::empty();
        cat.parameters.push(Parameter {
            key: "adet".into(),
            label: "Adet".into(),
            description: String::new(),
            parameter_type: ParameterType::Number,
            options: vec![],
            unit: Some("adet".into()),
            min: Some(1.0),
            max: None,
            max_length: None,
            required: true,
            order: 1,
        });
        save(&paths, &cat).unwrap();
        let back = load(&paths).unwrap();
        assert_eq!(back.parameters[0].key, "adet");
    }
}
```

- [ ] **Step 3: Write `validation/parameters.rs` with test**

```rust
use crate::error::{AppError, AppResult};
use crate::models::parameter::{ParameterCatalog, ParameterType};
use serde_json::Value;
use std::collections::HashMap;

pub fn validate_custom_fields(
    catalog: &ParameterCatalog,
    values: &HashMap<String, Value>,
) -> AppResult<()> {
    for param in &catalog.parameters {
        let supplied = values.get(&param.key);
        if param.required && supplied.map(Value::is_null).unwrap_or(true) {
            return Err(AppError::Validation {
                field: param.key.clone(),
                message: format!("{} zorunludur", param.label),
            });
        }
        let Some(v) = supplied else { continue };
        if v.is_null() { continue; }
        match param.parameter_type {
            ParameterType::Text | ParameterType::Textarea => {
                let s = v.as_str().ok_or_else(|| AppError::Validation {
                    field: param.key.clone(),
                    message: "Metin bekleniyor".into(),
                })?;
                if let Some(max) = param.max_length {
                    if s.chars().count() > max {
                        return Err(AppError::Validation {
                            field: param.key.clone(),
                            message: format!("En fazla {} karakter", max),
                        });
                    }
                }
            }
            ParameterType::Number => {
                let n = v.as_f64().ok_or_else(|| AppError::Validation {
                    field: param.key.clone(),
                    message: "Sayı bekleniyor".into(),
                })?;
                if let Some(min) = param.min {
                    if n < min { return Err(AppError::Validation {
                        field: param.key.clone(),
                        message: format!("En az {}", min),
                    }); }
                }
                if let Some(max) = param.max {
                    if n > max { return Err(AppError::Validation {
                        field: param.key.clone(),
                        message: format!("En fazla {}", max),
                    }); }
                }
            }
            ParameterType::Select => {
                let s = v.as_str().ok_or_else(|| AppError::Validation {
                    field: param.key.clone(),
                    message: "Seçim bekleniyor".into(),
                })?;
                if !param.options.iter().any(|o| o == s) {
                    return Err(AppError::Validation {
                        field: param.key.clone(),
                        message: "Geçersiz seçim".into(),
                    });
                }
            }
            ParameterType::Multiselect => {
                let arr = v.as_array().ok_or_else(|| AppError::Validation {
                    field: param.key.clone(),
                    message: "Liste bekleniyor".into(),
                })?;
                for item in arr {
                    let s = item.as_str().ok_or_else(|| AppError::Validation {
                        field: param.key.clone(),
                        message: "Geçersiz seçenek tipi".into(),
                    })?;
                    if !param.options.iter().any(|o| o == s) {
                        return Err(AppError::Validation {
                            field: param.key.clone(),
                            message: format!("Geçersiz seçim: {}", s),
                        });
                    }
                }
            }
            ParameterType::Boolean => {
                if !v.is_boolean() {
                    return Err(AppError::Validation {
                        field: param.key.clone(),
                        message: "true/false bekleniyor".into(),
                    });
                }
            }
            ParameterType::Date => {
                let s = v.as_str().ok_or_else(|| AppError::Validation {
                    field: param.key.clone(),
                    message: "Tarih bekleniyor".into(),
                })?;
                chrono::NaiveDate::parse_from_str(s, "%Y-%m-%d").map_err(|_| {
                    AppError::Validation {
                        field: param.key.clone(),
                        message: "YYYY-MM-DD formatı bekleniyor".into(),
                    }
                })?;
            }
        }
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::parameter::Parameter;
    use serde_json::json;

    fn num_param(key: &str, required: bool) -> Parameter {
        Parameter {
            key: key.into(), label: key.into(), description: String::new(),
            parameter_type: ParameterType::Number, options: vec![],
            unit: None, min: Some(1.0), max: Some(100.0),
            max_length: None, required, order: 1,
        }
    }

    #[test]
    fn required_missing_fails() {
        let mut cat = ParameterCatalog::empty();
        cat.parameters.push(num_param("adet", true));
        let values = HashMap::new();
        let err = validate_custom_fields(&cat, &values).unwrap_err();
        assert!(matches!(err, AppError::Validation { .. }));
    }

    #[test]
    fn number_out_of_range_fails() {
        let mut cat = ParameterCatalog::empty();
        cat.parameters.push(num_param("adet", false));
        let mut values = HashMap::new();
        values.insert("adet".into(), json!(500));
        assert!(validate_custom_fields(&cat, &values).is_err());
    }

    #[test]
    fn valid_passes() {
        let mut cat = ParameterCatalog::empty();
        cat.parameters.push(num_param("adet", true));
        let mut values = HashMap::new();
        values.insert("adet".into(), json!(10));
        assert!(validate_custom_fields(&cat, &values).is_ok());
    }
}
```

- [ ] **Step 4: Run tests**

Run: `cd src-tauri && cargo test`
Expected: all storage + validation tests pass.

- [ ] **Step 5: Commit**

```bash
git add src-tauri/src
git commit -m "feat(backend): parameter catalog storage + validation"
```

---

## Task 5: Customer storage

**Files:**
- Modify: `src-tauri/src/storage/customers.rs`

- [ ] **Step 1: Write `storage/customers.rs` with tests**

```rust
use crate::error::{AppError, AppResult};
use crate::models::customer::{Customer, CustomerInput, CustomerSummary};
use crate::storage::atomic::{atomic_write_json, read_json};
use crate::storage::paths::DataPaths;
use crate::storage::slug::{slugify, unique_slug};
use walkdir::WalkDir;

pub fn create(paths: &DataPaths, input: CustomerInput) -> AppResult<Customer> {
    if input.name.trim().is_empty() {
        return Err(AppError::Validation {
            field: "name".into(),
            message: "Müşteri adı gerekli".into(),
        });
    }
    std::fs::create_dir_all(paths.customers_dir())?;
    let base = slugify(&input.name);
    let id = unique_slug(&base, &paths.customers_dir());
    let now = chrono::Utc::now();
    let customer = Customer {
        id: id.clone(),
        schema_version: 1,
        name: input.name,
        contact_person: input.contact_person,
        email: input.email,
        phone: input.phone,
        address: input.address,
        tax_office: input.tax_office,
        tax_no: input.tax_no,
        notes: input.notes,
        created_at: now,
        updated_at: now,
    };
    std::fs::create_dir_all(paths.proposals_dir(&id))?;
    std::fs::create_dir_all(paths.attachments_dir(&id))?;
    atomic_write_json(&paths.customer_json(&id), &customer)?;
    Ok(customer)
}

pub fn get(paths: &DataPaths, id: &str) -> AppResult<Customer> {
    let path = paths.customer_json(id);
    if !path.exists() {
        return Err(AppError::NotFound { entity: "customer".into(), id: id.into() });
    }
    read_json(&path)
}

pub fn update(paths: &DataPaths, id: &str, input: CustomerInput) -> AppResult<Customer> {
    let mut existing = get(paths, id)?;
    existing.name = input.name;
    existing.contact_person = input.contact_person;
    existing.email = input.email;
    existing.phone = input.phone;
    existing.address = input.address;
    existing.tax_office = input.tax_office;
    existing.tax_no = input.tax_no;
    existing.notes = input.notes;
    existing.updated_at = chrono::Utc::now();
    atomic_write_json(&paths.customer_json(id), &existing)?;
    Ok(existing)
}

pub fn delete(paths: &DataPaths, id: &str) -> AppResult<()> {
    let proposals_dir = paths.proposals_dir(id);
    if proposals_dir.exists() {
        let has_proposals = std::fs::read_dir(&proposals_dir)?
            .filter_map(|e| e.ok())
            .any(|e| e.path().extension().map(|x| x == "json").unwrap_or(false));
        if has_proposals {
            return Err(AppError::Conflict {
                message: "Müşterinin teklifleri var, önce silin".into(),
            });
        }
    }
    std::fs::remove_dir_all(paths.customer_dir(id))?;
    Ok(())
}

pub fn list(paths: &DataPaths) -> AppResult<Vec<CustomerSummary>> {
    let dir = paths.customers_dir();
    if !dir.exists() { return Ok(Vec::new()); }
    let mut out = Vec::new();
    for entry in std::fs::read_dir(&dir)? {
        let entry = entry?;
        if !entry.file_type()?.is_dir() { continue; }
        let id = entry.file_name().to_string_lossy().to_string();
        let cj = paths.customer_json(&id);
        if !cj.exists() { continue; }
        let customer: Customer = read_json(&cj)?;
        let (count, last) = proposal_stats(paths, &id);
        out.push(CustomerSummary {
            id: customer.id,
            name: customer.name,
            contact_person: customer.contact_person,
            phone: customer.phone,
            proposal_count: count,
            last_activity: last,
        });
    }
    out.sort_by(|a, b| a.name.cmp(&b.name));
    Ok(out)
}

fn proposal_stats(paths: &DataPaths, customer_id: &str) -> (u32, Option<chrono::DateTime<chrono::Utc>>) {
    let dir = paths.proposals_dir(customer_id);
    if !dir.exists() { return (0, None); }
    let mut count = 0u32;
    let mut latest: Option<chrono::DateTime<chrono::Utc>> = None;
    for entry in WalkDir::new(&dir).min_depth(1).max_depth(1) {
        let Ok(entry) = entry else { continue };
        if entry.path().extension().map(|x| x == "json").unwrap_or(false) {
            count += 1;
            if let Ok(meta) = entry.metadata() {
                if let Ok(modified) = meta.modified() {
                    let dt: chrono::DateTime<chrono::Utc> = modified.into();
                    latest = Some(latest.map_or(dt, |l| l.max(dt)));
                }
            }
        }
    }
    (count, latest)
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    fn input(name: &str) -> CustomerInput {
        CustomerInput {
            name: name.into(),
            contact_person: String::new(), email: String::new(),
            phone: String::new(), address: String::new(),
            tax_office: String::new(), tax_no: String::new(), notes: String::new(),
        }
    }

    #[test]
    fn create_and_list() {
        let dir = tempdir().unwrap();
        let paths = DataPaths::new(dir.path());
        let c1 = create(&paths, input("ACME Makina A.Ş.")).unwrap();
        assert_eq!(c1.id, "acme-makina-a-s");
        let list = list(&paths).unwrap();
        assert_eq!(list.len(), 1);
        assert_eq!(list[0].proposal_count, 0);
    }

    #[test]
    fn delete_blocks_when_proposals_exist() {
        let dir = tempdir().unwrap();
        let paths = DataPaths::new(dir.path());
        let c = create(&paths, input("Beta")).unwrap();
        let proposal_file = paths.proposals_dir(&c.id).join("2026-04-13-001-x.json");
        std::fs::write(&proposal_file, "{}").unwrap();
        let err = delete(&paths, &c.id).unwrap_err();
        assert!(matches!(err, AppError::Conflict { .. }));
    }

    #[test]
    fn create_dedupes_slug() {
        let dir = tempdir().unwrap();
        let paths = DataPaths::new(dir.path());
        let a = create(&paths, input("ACME")).unwrap();
        let b = create(&paths, input("ACME")).unwrap();
        assert_eq!(a.id, "acme");
        assert_eq!(b.id, "acme-2");
    }
}
```

- [ ] **Step 2: Run tests**

Run: `cd src-tauri && cargo test storage::customers`
Expected: 3 passed.

- [ ] **Step 3: Commit**

```bash
git add src-tauri/src/storage/customers.rs
git commit -m "feat(backend): customer storage CRUD"
```

---

## Task 6: Proposal storage + filter + field history

**Files:**
- Modify: `src-tauri/src/storage/proposals.rs`

- [ ] **Step 1: Write `storage/proposals.rs` with tests**

```rust
use crate::error::{AppError, AppResult};
use crate::models::customer::Customer;
use crate::models::parameter::{ParameterCatalog, ParameterSnapshot};
use crate::models::proposal::{
    Proposal, ProposalFilter, ProposalInput, ProposalStatus, ProposalSummary,
};
use crate::storage::atomic::{atomic_write_json, read_json};
use crate::storage::paths::DataPaths;
use crate::storage::slug::slugify;
use crate::validation::parameters::validate_custom_fields;
use chrono::Datelike;
use serde_json::Value;
use std::collections::HashMap;
use walkdir::WalkDir;

fn next_sequence(dir: &std::path::Path, date: chrono::NaiveDate) -> u32 {
    let prefix = date.format("%Y-%m-%d").to_string();
    let mut max = 0u32;
    if !dir.exists() { return 1; }
    for entry in std::fs::read_dir(dir).into_iter().flatten().flatten() {
        let name = entry.file_name().to_string_lossy().to_string();
        if let Some(rest) = name.strip_prefix(&format!("{}-", prefix)) {
            if let Some((seq, _)) = rest.split_once('-') {
                if let Ok(n) = seq.parse::<u32>() {
                    max = max.max(n);
                }
            }
        }
    }
    max + 1
}

fn build_filename(proposal: &Proposal) -> String {
    let date = proposal.created_at.date_naive();
    let seq_str = format!("{:03}", extract_seq(&proposal.id).unwrap_or(1));
    let title_slug = slugify(&proposal.title);
    let slug = if title_slug.is_empty() { "teklif".into() } else { title_slug };
    format!("{}-{}-{}.json", date.format("%Y-%m-%d"), seq_str, slug)
}

fn extract_seq(id: &str) -> Option<u32> {
    id.rsplit('-').next().and_then(|s| s.parse().ok())
}

pub fn create(
    paths: &DataPaths,
    catalog: &ParameterCatalog,
    input: ProposalInput,
) -> AppResult<Proposal> {
    if input.title.trim().is_empty() {
        return Err(AppError::Validation {
            field: "title".into(), message: "Başlık gerekli".into(),
        });
    }
    let _customer: Customer = crate::storage::customers::get(paths, &input.customer_id)?;
    validate_custom_fields(catalog, &input.custom_fields)?;

    let now = chrono::Utc::now();
    let date = now.date_naive();
    let proposals_dir = paths.proposals_dir(&input.customer_id);
    std::fs::create_dir_all(&proposals_dir)?;
    let seq = next_sequence(&proposals_dir, date);
    let id = format!(
        "prop-{}{:02}{:02}-{:03}",
        date.year(), date.month(), date.day(), seq
    );

    let snapshot: Vec<ParameterSnapshot> = catalog.parameters.iter().map(Into::into).collect();

    let proposal = Proposal {
        id: id.clone(),
        schema_version: 1,
        customer_id: input.customer_id,
        title: input.title,
        status: input.status,
        created_at: now,
        updated_at: now,
        total_amount: input.total_amount,
        currency: input.currency,
        notes: input.notes,
        custom_fields: input.custom_fields,
        parameter_snapshot: snapshot,
    };
    let filename = build_filename(&proposal);
    let path = proposals_dir.join(filename);
    atomic_write_json(&path, &proposal)?;
    Ok(proposal)
}

pub fn get(paths: &DataPaths, id: &str) -> AppResult<Proposal> {
    let (_, path) = find_proposal_path(paths, id)?;
    read_json(&path)
}

pub fn update(
    paths: &DataPaths,
    catalog: &ParameterCatalog,
    id: &str,
    input: ProposalInput,
) -> AppResult<Proposal> {
    validate_custom_fields(catalog, &input.custom_fields)?;
    let mut existing = get(paths, id)?;
    let old_filename = build_filename(&existing);
    existing.customer_id = input.customer_id;
    existing.title = input.title;
    existing.status = input.status;
    existing.total_amount = input.total_amount;
    existing.currency = input.currency;
    existing.notes = input.notes;
    existing.custom_fields = input.custom_fields;
    existing.updated_at = chrono::Utc::now();

    let proposals_dir = paths.proposals_dir(&existing.customer_id);
    std::fs::create_dir_all(&proposals_dir)?;
    let new_filename = build_filename(&existing);
    let new_path = proposals_dir.join(&new_filename);
    atomic_write_json(&new_path, &existing)?;
    if new_filename != old_filename {
        let _ = std::fs::remove_file(proposals_dir.join(old_filename));
    }
    Ok(existing)
}

pub fn delete(paths: &DataPaths, id: &str) -> AppResult<()> {
    let (_, path) = find_proposal_path(paths, id)?;
    std::fs::remove_file(path)?;
    Ok(())
}

pub fn list(paths: &DataPaths, filter: &ProposalFilter) -> AppResult<Vec<ProposalSummary>> {
    let customers_dir = paths.customers_dir();
    if !customers_dir.exists() { return Ok(Vec::new()); }
    let mut customer_names: HashMap<String, String> = HashMap::new();
    for entry in std::fs::read_dir(&customers_dir)? {
        let entry = entry?;
        if !entry.file_type()?.is_dir() { continue; }
        let id = entry.file_name().to_string_lossy().to_string();
        if let Ok(c) = crate::storage::customers::get(paths, &id) {
            customer_names.insert(id, c.name);
        }
    }

    let mut out = Vec::new();
    for (cid, cname) in &customer_names {
        if let Some(only) = &filter.customer_id {
            if only != cid { continue; }
        }
        let dir = paths.proposals_dir(cid);
        if !dir.exists() { continue; }
        for entry in WalkDir::new(&dir).min_depth(1).max_depth(1) {
            let Ok(entry) = entry else { continue };
            if !entry.path().extension().map(|x| x == "json").unwrap_or(false) { continue; }
            let p: Proposal = match read_json(entry.path()) {
                Ok(p) => p,
                Err(_) => continue,
            };
            if let Some(status) = &filter.status {
                if &p.status != status { continue; }
            }
            if let Some(from) = filter.date_from {
                if p.created_at < from { continue; }
            }
            if let Some(to) = filter.date_to {
                if p.created_at > to { continue; }
            }
            if let Some(q) = &filter.search {
                let needle = q.to_lowercase();
                let hay = format!("{} {}", p.title, p.notes).to_lowercase();
                if !hay.contains(&needle) { continue; }
            }
            out.push(ProposalSummary {
                id: p.id,
                customer_id: p.customer_id,
                customer_name: cname.clone(),
                title: p.title,
                status: p.status,
                total_amount: p.total_amount,
                currency: p.currency,
                created_at: p.created_at,
            });
        }
    }
    out.sort_by(|a, b| b.created_at.cmp(&a.created_at));
    Ok(out)
}

pub fn field_history(
    paths: &DataPaths,
    key: &str,
    limit: usize,
) -> AppResult<Vec<(Value, u32, chrono::DateTime<chrono::Utc>)>> {
    let customers_dir = paths.customers_dir();
    if !customers_dir.exists() { return Ok(Vec::new()); }
    let mut freq: HashMap<String, (Value, u32, chrono::DateTime<chrono::Utc>)> = HashMap::new();
    for entry in WalkDir::new(&customers_dir) {
        let Ok(entry) = entry else { continue };
        if !entry.path().extension().map(|x| x == "json").unwrap_or(false) { continue; }
        if entry.path().file_name().map(|n| n == "customer.json").unwrap_or(false) { continue; }
        let Ok(p): Result<Proposal, _> = read_json(entry.path()) else { continue };
        if let Some(v) = p.custom_fields.get(key) {
            if v.is_null() { continue; }
            let k = v.to_string();
            freq.entry(k)
                .and_modify(|(_, c, t)| { *c += 1; *t = (*t).max(p.updated_at); })
                .or_insert((v.clone(), 1, p.updated_at));
        }
    }
    let mut entries: Vec<_> = freq.into_values().collect();
    entries.sort_by(|a, b| b.1.cmp(&a.1).then(b.2.cmp(&a.2)));
    entries.truncate(limit);
    Ok(entries)
}

pub fn prefill_values(
    paths: &DataPaths,
    customer_id: Option<&str>,
) -> AppResult<HashMap<String, Value>> {
    let filter = ProposalFilter {
        customer_id: customer_id.map(String::from),
        ..Default::default()
    };
    let mut candidates = list(paths, &filter)?;
    if candidates.is_empty() && customer_id.is_some() {
        candidates = list(paths, &ProposalFilter::default())?;
    }
    let Some(first) = candidates.first() else {
        return Ok(HashMap::new());
    };
    let proposal = get(paths, &first.id)?;
    Ok(proposal.custom_fields)
}

fn find_proposal_path(paths: &DataPaths, id: &str) -> AppResult<(String, std::path::PathBuf)> {
    let customers_dir = paths.customers_dir();
    for entry in WalkDir::new(&customers_dir) {
        let Ok(entry) = entry else { continue };
        if !entry.path().extension().map(|x| x == "json").unwrap_or(false) { continue; }
        if entry.path().file_name().map(|n| n == "customer.json").unwrap_or(false) { continue; }
        if let Ok(p): Result<Proposal, _> = read_json(entry.path()) {
            if p.id == id {
                return Ok((p.customer_id, entry.path().to_path_buf()));
            }
        }
    }
    Err(AppError::NotFound { entity: "proposal".into(), id: id.into() })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::customer::CustomerInput;
    use crate::models::parameter::{Parameter, ParameterType};
    use serde_json::json;

    fn setup() -> (tempfile::TempDir, DataPaths, ParameterCatalog, String) {
        let dir = tempfile::tempdir().unwrap();
        let paths = DataPaths::new(dir.path());
        let c = crate::storage::customers::create(&paths, CustomerInput {
            name: "ACME".into(), contact_person: String::new(), email: String::new(),
            phone: String::new(), address: String::new(), tax_office: String::new(),
            tax_no: String::new(), notes: String::new(),
        }).unwrap();
        let mut cat = ParameterCatalog::empty();
        cat.parameters.push(Parameter {
            key: "adet".into(), label: "Adet".into(), description: String::new(),
            parameter_type: ParameterType::Number, options: vec![], unit: Some("adet".into()),
            min: Some(1.0), max: Some(1000.0), max_length: None, required: true, order: 1,
        });
        (dir, paths, cat, c.id)
    }

    fn input(customer_id: &str, title: &str, adet: i64) -> ProposalInput {
        let mut cf = HashMap::new();
        cf.insert("adet".into(), json!(adet));
        ProposalInput {
            customer_id: customer_id.into(),
            title: title.into(),
            status: ProposalStatus::Taslak,
            total_amount: 1000.0,
            currency: "TRY".into(),
            notes: String::new(),
            custom_fields: cf,
        }
    }

    #[test]
    fn create_list_delete() {
        let (_d, paths, cat, cid) = setup();
        let p = create(&paths, &cat, input(&cid, "Flanş", 10)).unwrap();
        let list = list(&paths, &ProposalFilter::default()).unwrap();
        assert_eq!(list.len(), 1);
        delete(&paths, &p.id).unwrap();
        assert_eq!(list(&paths, &ProposalFilter::default()).unwrap().len(), 0);
    }

    #[test]
    fn filter_by_search() {
        let (_d, paths, cat, cid) = setup();
        create(&paths, &cat, input(&cid, "Flanş büyük", 10)).unwrap();
        create(&paths, &cat, input(&cid, "Mil küçük", 5)).unwrap();
        let filter = ProposalFilter { search: Some("flan".into()), ..Default::default() };
        let out = list(&paths, &filter).unwrap();
        assert_eq!(out.len(), 1);
        assert!(out[0].title.contains("Flanş"));
    }

    #[test]
    fn field_history_counts() {
        let (_d, paths, cat, cid) = setup();
        create(&paths, &cat, input(&cid, "A", 10)).unwrap();
        create(&paths, &cat, input(&cid, "B", 10)).unwrap();
        create(&paths, &cat, input(&cid, "C", 5)).unwrap();
        let h = field_history(&paths, "adet", 10).unwrap();
        assert_eq!(h[0].1, 2);
        assert_eq!(h[0].0, json!(10));
    }

    #[test]
    fn prefill_uses_customer_last() {
        let (_d, paths, cat, cid) = setup();
        create(&paths, &cat, input(&cid, "A", 7)).unwrap();
        std::thread::sleep(std::time::Duration::from_millis(10));
        create(&paths, &cat, input(&cid, "B", 42)).unwrap();
        let pre = prefill_values(&paths, Some(&cid)).unwrap();
        assert_eq!(pre.get("adet"), Some(&json!(42)));
    }
}
```

- [ ] **Step 2: Run tests**

Run: `cd src-tauri && cargo test storage::proposals`
Expected: 4 passed.

- [ ] **Step 3: Commit**

```bash
git add src-tauri/src/storage/proposals.rs
git commit -m "feat(backend): proposal storage with filter, field history, prefill"
```

---

## Task 7: Settings and backup storage

**Files:**
- Modify: `src-tauri/src/storage/settings.rs`
- Modify: `src-tauri/src/storage/backup.rs`

- [ ] **Step 1: Write `storage/settings.rs`**

```rust
use crate::error::AppResult;
use crate::models::settings::Settings;
use crate::storage::atomic::{atomic_write_json, read_json};
use crate::storage::paths::DataPaths;

pub fn load(paths: &DataPaths) -> AppResult<Settings> {
    let p = paths.settings_json();
    if !p.exists() {
        let mut s = Settings::default();
        s.data_dir = paths.root().display().to_string();
        atomic_write_json(&p, &s)?;
        return Ok(s);
    }
    read_json(&p)
}

pub fn save(paths: &DataPaths, s: &Settings) -> AppResult<()> {
    atomic_write_json(&paths.settings_json(), s)
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[test]
    fn load_creates_default_when_missing() {
        let dir = tempdir().unwrap();
        let paths = DataPaths::new(dir.path());
        let s = load(&paths).unwrap();
        assert!(s.auto_update_enabled);
        assert_eq!(s.default_currency, "TRY");
        assert!(paths.settings_json().exists());
    }
}
```

- [ ] **Step 2: Write `storage/backup.rs`**

```rust
use crate::error::{AppError, AppResult};
use crate::models::settings::{BackupEntry, RestoreMode};
use crate::storage::paths::DataPaths;
use std::fs::File;
use std::io::{Read, Write};
use std::path::Path;
use walkdir::WalkDir;
use zip::write::FileOptions;

pub fn create(paths: &DataPaths) -> AppResult<BackupEntry> {
    std::fs::create_dir_all(paths.backups_dir())?;
    let ts = chrono::Local::now().format("%Y-%m-%d-%H%M%S").to_string();
    let name = format!("backup-{}.zip", ts);
    let zip_path = paths.backups_dir().join(&name);
    let file = File::create(&zip_path)?;
    let mut zip = zip::ZipWriter::new(file);
    let options = FileOptions::default().compression_method(zip::CompressionMethod::Deflated);

    let targets = [
        ("parameters.json", paths.parameters_json()),
        ("settings.json", paths.settings_json()),
        ("app.json", paths.app_json()),
    ];
    for (entry_name, path) in &targets {
        if path.exists() {
            zip.start_file(*entry_name, options).map_err(zip_err)?;
            let mut buf = Vec::new();
            File::open(path)?.read_to_end(&mut buf)?;
            zip.write_all(&buf)?;
        }
    }

    let customers_dir = paths.customers_dir();
    if customers_dir.exists() {
        for entry in WalkDir::new(&customers_dir) {
            let entry = entry.map_err(|e| AppError::Io { message: e.to_string() })?;
            let path = entry.path();
            let rel = path.strip_prefix(paths.root()).unwrap().to_string_lossy().replace('\\', "/");
            if entry.file_type().is_dir() {
                if rel.is_empty() { continue; }
                zip.add_directory(format!("{}/", rel), options).map_err(zip_err)?;
            } else if entry.file_type().is_file() {
                zip.start_file(rel, options).map_err(zip_err)?;
                let mut buf = Vec::new();
                File::open(path)?.read_to_end(&mut buf)?;
                zip.write_all(&buf)?;
            }
        }
    }

    zip.finish().map_err(zip_err)?;
    let meta = std::fs::metadata(&zip_path)?;
    Ok(BackupEntry {
        name,
        path: zip_path.display().to_string(),
        size_bytes: meta.len(),
        created_at: chrono::Utc::now(),
    })
}

pub fn list(paths: &DataPaths) -> AppResult<Vec<BackupEntry>> {
    let dir = paths.backups_dir();
    if !dir.exists() { return Ok(Vec::new()); }
    let mut out = Vec::new();
    for entry in std::fs::read_dir(&dir)? {
        let entry = entry?;
        let path = entry.path();
        if path.extension().map(|x| x != "zip").unwrap_or(true) { continue; }
        let meta = entry.metadata()?;
        let created: chrono::DateTime<chrono::Utc> = meta.created()
            .or_else(|_| meta.modified())
            .map(Into::into)
            .unwrap_or_else(|_| chrono::Utc::now());
        out.push(BackupEntry {
            name: entry.file_name().to_string_lossy().into(),
            path: path.display().to_string(),
            size_bytes: meta.len(),
            created_at: created,
        });
    }
    out.sort_by(|a, b| b.created_at.cmp(&a.created_at));
    Ok(out)
}

pub fn delete(paths: &DataPaths, name: &str) -> AppResult<()> {
    let p = paths.backups_dir().join(name);
    if !p.exists() {
        return Err(AppError::NotFound { entity: "backup".into(), id: name.into() });
    }
    std::fs::remove_file(p)?;
    Ok(())
}

pub fn restore(paths: &DataPaths, zip_path: &Path, mode: RestoreMode) -> AppResult<()> {
    if !zip_path.exists() {
        return Err(AppError::NotFound { entity: "backup".into(), id: zip_path.display().to_string() });
    }
    if mode == RestoreMode::Replace {
        let ts = chrono::Local::now().format("%Y-%m-%d-%H%M%S").to_string();
        let backup_current = paths.root().with_file_name(format!(
            "{}.backup-{}",
            paths.root().file_name().unwrap().to_string_lossy(),
            ts
        ));
        if paths.root().exists() {
            std::fs::rename(paths.root(), &backup_current)?;
        }
        std::fs::create_dir_all(paths.root())?;
    }
    let file = File::open(zip_path)?;
    let mut archive = zip::ZipArchive::new(file).map_err(zip_err)?;
    for i in 0..archive.len() {
        let mut zf = archive.by_index(i).map_err(zip_err)?;
        let rel = zf.enclosed_name()
            .ok_or_else(|| AppError::Corrupt {
                path: zip_path.display().to_string(),
                reason: "unsafe zip path".into(),
            })?
            .to_path_buf();
        let out_path = paths.root().join(&rel);
        if zf.is_dir() {
            std::fs::create_dir_all(&out_path)?;
            continue;
        }
        if mode == RestoreMode::Merge && out_path.exists() { continue; }
        if let Some(p) = out_path.parent() { std::fs::create_dir_all(p)?; }
        let mut out_file = File::create(&out_path)?;
        std::io::copy(&mut zf, &mut out_file)?;
    }
    Ok(())
}

fn zip_err(e: zip::result::ZipError) -> AppError {
    AppError::Io { message: e.to_string() }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::customer::CustomerInput;
    use tempfile::tempdir;

    #[test]
    fn create_and_list_backup() {
        let dir = tempdir().unwrap();
        let paths = DataPaths::new(dir.path());
        paths.ensure_structure().unwrap();
        crate::storage::customers::create(&paths, CustomerInput {
            name: "A".into(), contact_person: String::new(), email: String::new(),
            phone: String::new(), address: String::new(), tax_office: String::new(),
            tax_no: String::new(), notes: String::new(),
        }).unwrap();
        let entry = create(&paths).unwrap();
        assert!(entry.size_bytes > 0);
        assert_eq!(list(&paths).unwrap().len(), 1);
    }

    #[test]
    fn restore_merge_preserves_existing() {
        let dir = tempdir().unwrap();
        let paths = DataPaths::new(dir.path());
        paths.ensure_structure().unwrap();
        crate::storage::customers::create(&paths, CustomerInput {
            name: "Original".into(), contact_person: String::new(), email: String::new(),
            phone: String::new(), address: String::new(), tax_office: String::new(),
            tax_no: String::new(), notes: String::new(),
        }).unwrap();
        let backup = create(&paths).unwrap();
        crate::storage::customers::create(&paths, CustomerInput {
            name: "Newer".into(), contact_person: String::new(), email: String::new(),
            phone: String::new(), address: String::new(), tax_office: String::new(),
            tax_no: String::new(), notes: String::new(),
        }).unwrap();
        restore(&paths, std::path::Path::new(&backup.path), RestoreMode::Merge).unwrap();
        let list = crate::storage::customers::list(&paths).unwrap();
        assert_eq!(list.len(), 2);
    }
}
```

- [ ] **Step 3: Run tests**

Run: `cd src-tauri && cargo test storage::`
Expected: all storage tests pass.

- [ ] **Step 4: Commit**

```bash
git add src-tauri/src/storage
git commit -m "feat(backend): settings and backup storage with restore modes"
```

---

## Task 8: AppState, commands, and main.rs wiring

**Files:**
- Create: `src-tauri/src/state.rs`
- Create: `src-tauri/src/commands/mod.rs`
- Create: `src-tauri/src/commands/customers.rs`
- Create: `src-tauri/src/commands/proposals.rs`
- Create: `src-tauri/src/commands/parameters.rs`
- Create: `src-tauri/src/commands/backup.rs`
- Create: `src-tauri/src/commands/settings.rs`
- Modify: `src-tauri/src/lib.rs`

- [ ] **Step 1: Create `state.rs`**

```rust
use crate::storage::paths::DataPaths;
use std::sync::Mutex;

pub struct AppState {
    pub paths: Mutex<DataPaths>,
    pub write_lock: Mutex<()>,
}

impl AppState {
    pub fn new(paths: DataPaths) -> Self {
        Self {
            paths: Mutex::new(paths),
            write_lock: Mutex::new(()),
        }
    }

    pub fn with_paths<R>(&self, f: impl FnOnce(&DataPaths) -> R) -> R {
        let guard = self.paths.lock().unwrap();
        f(&*guard)
    }
}
```

Register in `lib.rs`: `pub mod state;`, `pub mod commands;`

- [ ] **Step 2: Create `commands/mod.rs`**

```rust
pub mod customers;
pub mod proposals;
pub mod parameters;
pub mod backup;
pub mod settings;
```

- [ ] **Step 3: Create `commands/customers.rs`**

```rust
use crate::error::AppResult;
use crate::models::customer::{Customer, CustomerInput, CustomerSummary};
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub fn list_customers(state: State<'_, AppState>) -> AppResult<Vec<CustomerSummary>> {
    state.with_paths(|p| crate::storage::customers::list(p))
}

#[tauri::command]
pub fn get_customer(state: State<'_, AppState>, id: String) -> AppResult<Customer> {
    state.with_paths(|p| crate::storage::customers::get(p, &id))
}

#[tauri::command]
pub fn create_customer(state: State<'_, AppState>, input: CustomerInput) -> AppResult<Customer> {
    let _w = state.write_lock.lock().unwrap();
    state.with_paths(|p| crate::storage::customers::create(p, input))
}

#[tauri::command]
pub fn update_customer(
    state: State<'_, AppState>,
    id: String,
    input: CustomerInput,
) -> AppResult<Customer> {
    let _w = state.write_lock.lock().unwrap();
    state.with_paths(|p| crate::storage::customers::update(p, &id, input))
}

#[tauri::command]
pub fn delete_customer(state: State<'_, AppState>, id: String) -> AppResult<()> {
    let _w = state.write_lock.lock().unwrap();
    state.with_paths(|p| crate::storage::customers::delete(p, &id))
}
```

- [ ] **Step 4: Create `commands/parameters.rs`**

```rust
use crate::error::{AppError, AppResult};
use crate::models::parameter::{Parameter, ParameterCatalog};
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub fn get_parameters(state: State<'_, AppState>) -> AppResult<ParameterCatalog> {
    state.with_paths(|p| crate::storage::parameters::load(p))
}

#[tauri::command]
pub fn upsert_parameter(
    state: State<'_, AppState>,
    param: Parameter,
) -> AppResult<ParameterCatalog> {
    let _w = state.write_lock.lock().unwrap();
    state.with_paths(|p| {
        let mut cat = crate::storage::parameters::load(p)?;
        if param.key.trim().is_empty() {
            return Err(AppError::Validation {
                field: "key".into(),
                message: "Anahtar gerekli".into(),
            });
        }
        if let Some(existing) = cat.parameters.iter_mut().find(|x| x.key == param.key) {
            *existing = param;
        } else {
            cat.parameters.push(param);
        }
        cat.parameters.sort_by_key(|x| x.order);
        cat.updated_at = chrono::Utc::now();
        crate::storage::parameters::save(p, &cat)?;
        Ok(cat)
    })
}

#[tauri::command]
pub fn delete_parameter(
    state: State<'_, AppState>,
    key: String,
) -> AppResult<ParameterCatalog> {
    let _w = state.write_lock.lock().unwrap();
    state.with_paths(|p| {
        let mut cat = crate::storage::parameters::load(p)?;
        cat.parameters.retain(|x| x.key != key);
        cat.updated_at = chrono::Utc::now();
        crate::storage::parameters::save(p, &cat)?;
        Ok(cat)
    })
}

#[tauri::command]
pub fn reorder_parameters(
    state: State<'_, AppState>,
    keys: Vec<String>,
) -> AppResult<ParameterCatalog> {
    let _w = state.write_lock.lock().unwrap();
    state.with_paths(|p| {
        let mut cat = crate::storage::parameters::load(p)?;
        let mut new_order: Vec<Parameter> = Vec::with_capacity(cat.parameters.len());
        for (i, key) in keys.iter().enumerate() {
            if let Some(pos) = cat.parameters.iter().position(|x| &x.key == key) {
                let mut param = cat.parameters.remove(pos);
                param.order = (i + 1) as u32;
                new_order.push(param);
            }
        }
        new_order.extend(cat.parameters);
        cat.parameters = new_order;
        cat.updated_at = chrono::Utc::now();
        crate::storage::parameters::save(p, &cat)?;
        Ok(cat)
    })
}
```

- [ ] **Step 5: Create `commands/proposals.rs`**

```rust
use crate::error::AppResult;
use crate::models::proposal::{
    Proposal, ProposalFilter, ProposalInput, ProposalSummary,
};
use crate::state::AppState;
use serde::Serialize;
use serde_json::Value;
use std::collections::HashMap;
use tauri::State;

#[derive(Serialize)]
pub struct FieldHistoryEntry {
    pub value: Value,
    pub frequency: u32,
    pub last_used_at: chrono::DateTime<chrono::Utc>,
}

#[tauri::command]
pub fn list_proposals(
    state: State<'_, AppState>,
    filter: ProposalFilter,
) -> AppResult<Vec<ProposalSummary>> {
    state.with_paths(|p| crate::storage::proposals::list(p, &filter))
}

#[tauri::command]
pub fn get_proposal(state: State<'_, AppState>, id: String) -> AppResult<Proposal> {
    state.with_paths(|p| crate::storage::proposals::get(p, &id))
}

#[tauri::command]
pub fn create_proposal(
    state: State<'_, AppState>,
    input: ProposalInput,
) -> AppResult<Proposal> {
    let _w = state.write_lock.lock().unwrap();
    state.with_paths(|p| {
        let catalog = crate::storage::parameters::load(p)?;
        crate::storage::proposals::create(p, &catalog, input)
    })
}

#[tauri::command]
pub fn update_proposal(
    state: State<'_, AppState>,
    id: String,
    input: ProposalInput,
) -> AppResult<Proposal> {
    let _w = state.write_lock.lock().unwrap();
    state.with_paths(|p| {
        let catalog = crate::storage::parameters::load(p)?;
        crate::storage::proposals::update(p, &catalog, &id, input)
    })
}

#[tauri::command]
pub fn delete_proposal(state: State<'_, AppState>, id: String) -> AppResult<()> {
    let _w = state.write_lock.lock().unwrap();
    state.with_paths(|p| crate::storage::proposals::delete(p, &id))
}

#[tauri::command]
pub fn get_field_history(
    state: State<'_, AppState>,
    key: String,
    limit: usize,
) -> AppResult<Vec<FieldHistoryEntry>> {
    state.with_paths(|p| {
        Ok(crate::storage::proposals::field_history(p, &key, limit)?
            .into_iter()
            .map(|(value, frequency, last_used_at)| FieldHistoryEntry {
                value, frequency, last_used_at,
            })
            .collect())
    })
}

#[tauri::command]
pub fn get_prefill_values(
    state: State<'_, AppState>,
    customer_id: Option<String>,
) -> AppResult<HashMap<String, Value>> {
    state.with_paths(|p| {
        crate::storage::proposals::prefill_values(p, customer_id.as_deref())
    })
}
```

- [ ] **Step 6: Create `commands/backup.rs`**

```rust
use crate::error::AppResult;
use crate::models::settings::{BackupEntry, RestoreMode};
use crate::state::AppState;
use std::path::Path;
use tauri::State;

#[tauri::command]
pub fn create_backup(state: State<'_, AppState>) -> AppResult<BackupEntry> {
    let _w = state.write_lock.lock().unwrap();
    state.with_paths(|p| crate::storage::backup::create(p))
}

#[tauri::command]
pub fn list_backups(state: State<'_, AppState>) -> AppResult<Vec<BackupEntry>> {
    state.with_paths(|p| crate::storage::backup::list(p))
}

#[tauri::command]
pub fn delete_backup(state: State<'_, AppState>, name: String) -> AppResult<()> {
    state.with_paths(|p| crate::storage::backup::delete(p, &name))
}

#[tauri::command]
pub fn restore_backup(
    state: State<'_, AppState>,
    path: String,
    mode: RestoreMode,
) -> AppResult<()> {
    let _w = state.write_lock.lock().unwrap();
    state.with_paths(|p| crate::storage::backup::restore(p, Path::new(&path), mode))
}
```

- [ ] **Step 7: Create `commands/settings.rs`**

```rust
use crate::error::AppResult;
use crate::models::settings::{AppInfo, Settings, SettingsInput};
use crate::state::AppState;
use crate::storage::paths::DataPaths;
use tauri::State;

#[tauri::command]
pub fn get_settings(state: State<'_, AppState>) -> AppResult<Settings> {
    state.with_paths(|p| crate::storage::settings::load(p))
}

#[tauri::command]
pub fn update_settings(
    state: State<'_, AppState>,
    input: SettingsInput,
) -> AppResult<Settings> {
    state.with_paths(|p| {
        let mut s = crate::storage::settings::load(p)?;
        if let Some(c) = input.default_currency { s.default_currency = c; }
        if let Some(a) = input.auto_update_enabled { s.auto_update_enabled = a; }
        if input.skipped_version.is_some() { s.skipped_version = input.skipped_version; }
        crate::storage::settings::save(p, &s)?;
        Ok(s)
    })
}

#[tauri::command]
pub fn init_data_dir(state: State<'_, AppState>, path: String) -> AppResult<Settings> {
    let new_paths = DataPaths::new(std::path::PathBuf::from(&path));
    new_paths.ensure_structure()?;
    {
        let mut guard = state.paths.lock().unwrap();
        *guard = new_paths.clone();
    }
    let mut s = crate::storage::settings::load(&new_paths)?;
    s.data_dir = path;
    crate::storage::settings::save(&new_paths, &s)?;
    Ok(s)
}

#[tauri::command]
pub fn get_app_info(state: State<'_, AppState>) -> AppResult<AppInfo> {
    state.with_paths(|p| {
        let customers = crate::storage::customers::list(p)?;
        let proposals = crate::storage::proposals::list(
            p, &crate::models::proposal::ProposalFilter::default())?;
        let parameters = crate::storage::parameters::load(p)?;
        Ok(AppInfo {
            version: env!("CARGO_PKG_VERSION").to_string(),
            data_dir: p.root().display().to_string(),
            customer_count: customers.len() as u32,
            proposal_count: proposals.len() as u32,
            parameter_count: parameters.parameters.len() as u32,
        })
    })
}
```

- [ ] **Step 8: Wire everything in `lib.rs`**

Replace `src-tauri/src/lib.rs` with:

```rust
pub mod error;
pub mod models;
pub mod storage;
pub mod validation;
pub mod state;
pub mod commands;

use state::AppState;
use storage::paths::DataPaths;

fn default_data_dir() -> std::path::PathBuf {
    dirs::data_dir()
        .unwrap_or_else(|| std::env::current_dir().unwrap())
        .join("FiksturTeklifAsistani")
        .join("data")
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let data_dir = default_data_dir();
    let paths = DataPaths::new(data_dir);
    let _ = paths.ensure_structure();
    let state = AppState::new(paths);

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .manage(state)
        .invoke_handler(tauri::generate_handler![
            commands::customers::list_customers,
            commands::customers::get_customer,
            commands::customers::create_customer,
            commands::customers::update_customer,
            commands::customers::delete_customer,
            commands::parameters::get_parameters,
            commands::parameters::upsert_parameter,
            commands::parameters::delete_parameter,
            commands::parameters::reorder_parameters,
            commands::proposals::list_proposals,
            commands::proposals::get_proposal,
            commands::proposals::create_proposal,
            commands::proposals::update_proposal,
            commands::proposals::delete_proposal,
            commands::proposals::get_field_history,
            commands::proposals::get_prefill_values,
            commands::backup::create_backup,
            commands::backup::list_backups,
            commands::backup::delete_backup,
            commands::backup::restore_backup,
            commands::settings::get_settings,
            commands::settings::update_settings,
            commands::settings::init_data_dir,
            commands::settings::get_app_info,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

Make sure `src-tauri/src/main.rs` contains:
```rust
fn main() { fikstur_teklif_asistani_lib::run(); }
```

- [ ] **Step 9: Run full test suite and dev mode**

Run: `cd src-tauri && cargo test && cd .. && npm run tauri dev`
Expected: all tests pass, dev window opens (will still show template UI).

- [ ] **Step 10: Commit**

```bash
git add src-tauri
git commit -m "feat(backend): wire commands, app state, and tauri handlers"
```

---

## Task 9: Frontend types and API client

**Files:**
- Create: `src/types.ts`
- Create: `src/lib/api.ts`
- Create: `src/lib/errors.ts`
- Create: `src/lib/i18n/tr.ts`

- [ ] **Step 1: Create `src/types.ts` mirroring Rust types**

```typescript
export type ParameterType =
  | "text" | "textarea" | "number"
  | "select" | "multiselect" | "boolean" | "date";

export interface Parameter {
  key: string;
  label: string;
  description: string;
  type: ParameterType;
  options: string[];
  unit: string | null;
  min: number | null;
  max: number | null;
  max_length: number | null;
  required: boolean;
  order: number;
}

export interface ParameterCatalog {
  schema_version: number;
  updated_at: string;
  parameters: Parameter[];
}

export interface ParameterSnapshot {
  key: string;
  label: string;
  type: ParameterType;
  unit: string | null;
}

export interface Customer {
  id: string;
  schema_version: number;
  name: string;
  contact_person: string;
  email: string;
  phone: string;
  address: string;
  tax_office: string;
  tax_no: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface CustomerInput {
  name: string;
  contact_person: string;
  email: string;
  phone: string;
  address: string;
  tax_office: string;
  tax_no: string;
  notes: string;
}

export interface CustomerSummary {
  id: string;
  name: string;
  contact_person: string;
  phone: string;
  proposal_count: number;
  last_activity: string | null;
}

export type ProposalStatus =
  | "taslak" | "gonderildi" | "kazanildi" | "kaybedildi" | "beklemede";

export interface Proposal {
  id: string;
  schema_version: number;
  customer_id: string;
  title: string;
  status: ProposalStatus;
  created_at: string;
  updated_at: string;
  total_amount: number;
  currency: string;
  notes: string;
  custom_fields: Record<string, unknown>;
  parameter_snapshot: ParameterSnapshot[];
}

export interface ProposalInput {
  customer_id: string;
  title: string;
  status: ProposalStatus;
  total_amount: number;
  currency: string;
  notes: string;
  custom_fields: Record<string, unknown>;
}

export interface ProposalSummary {
  id: string;
  customer_id: string;
  customer_name: string;
  title: string;
  status: ProposalStatus;
  total_amount: number;
  currency: string;
  created_at: string;
}

export interface ProposalFilter {
  customer_id?: string | null;
  status?: ProposalStatus | null;
  date_from?: string | null;
  date_to?: string | null;
  search?: string | null;
}

export interface FieldHistoryEntry {
  value: unknown;
  frequency: number;
  last_used_at: string;
}

export interface Settings {
  schema_version: number;
  data_dir: string;
  default_currency: string;
  auto_update_enabled: boolean;
  skipped_version: string | null;
}

export interface SettingsInput {
  default_currency?: string;
  auto_update_enabled?: boolean;
  skipped_version?: string | null;
}

export interface AppInfo {
  version: string;
  data_dir: string;
  customer_count: number;
  proposal_count: number;
  parameter_count: number;
}

export interface BackupEntry {
  name: string;
  path: string;
  size_bytes: number;
  created_at: string;
}

export type RestoreMode = "merge" | "replace";

export type AppError =
  | { kind: "not_found"; entity: string; id: string }
  | { kind: "validation"; field: string; message: string }
  | { kind: "conflict"; message: string }
  | { kind: "io"; message: string }
  | { kind: "corrupt"; path: string; reason: string };
```

- [ ] **Step 2: Create `src/lib/api.ts`**

```typescript
import { invoke } from "@tauri-apps/api/core";
import type {
  AppInfo, BackupEntry, Customer, CustomerInput, CustomerSummary,
  FieldHistoryEntry, Parameter, ParameterCatalog, Proposal,
  ProposalFilter, ProposalInput, ProposalSummary, RestoreMode,
  Settings, SettingsInput,
} from "../types";

const call = <T>(cmd: string, args?: Record<string, unknown>) =>
  invoke<T>(cmd, args);

export const api = {
  listCustomers: () => call<CustomerSummary[]>("list_customers"),
  getCustomer: (id: string) => call<Customer>("get_customer", { id }),
  createCustomer: (input: CustomerInput) => call<Customer>("create_customer", { input }),
  updateCustomer: (id: string, input: CustomerInput) =>
    call<Customer>("update_customer", { id, input }),
  deleteCustomer: (id: string) => call<void>("delete_customer", { id }),

  getParameters: () => call<ParameterCatalog>("get_parameters"),
  upsertParameter: (param: Parameter) =>
    call<ParameterCatalog>("upsert_parameter", { param }),
  deleteParameter: (key: string) =>
    call<ParameterCatalog>("delete_parameter", { key }),
  reorderParameters: (keys: string[]) =>
    call<ParameterCatalog>("reorder_parameters", { keys }),

  listProposals: (filter: ProposalFilter) =>
    call<ProposalSummary[]>("list_proposals", { filter }),
  getProposal: (id: string) => call<Proposal>("get_proposal", { id }),
  createProposal: (input: ProposalInput) =>
    call<Proposal>("create_proposal", { input }),
  updateProposal: (id: string, input: ProposalInput) =>
    call<Proposal>("update_proposal", { id, input }),
  deleteProposal: (id: string) => call<void>("delete_proposal", { id }),
  getFieldHistory: (key: string, limit: number) =>
    call<FieldHistoryEntry[]>("get_field_history", { key, limit }),
  getPrefillValues: (customerId: string | null) =>
    call<Record<string, unknown>>("get_prefill_values",
      { customerId: customerId ?? null }),

  createBackup: () => call<BackupEntry>("create_backup"),
  listBackups: () => call<BackupEntry[]>("list_backups"),
  deleteBackup: (name: string) => call<void>("delete_backup", { name }),
  restoreBackup: (path: string, mode: RestoreMode) =>
    call<void>("restore_backup", { path, mode }),

  getSettings: () => call<Settings>("get_settings"),
  updateSettings: (input: SettingsInput) =>
    call<Settings>("update_settings", { input }),
  initDataDir: (path: string) => call<Settings>("init_data_dir", { path }),
  getAppInfo: () => call<AppInfo>("get_app_info"),
};
```

- [ ] **Step 3: Create `src/lib/i18n/tr.ts`**

```typescript
export const tr = {
  app: { title: "Fikstur Teklif Asistanı" },
  nav: {
    dashboard: "Özet",
    customers: "Müşteriler",
    proposals: "Teklifler",
    parameters: "Parametreler",
    backup: "Yedekle",
    settings: "Ayarlar",
  },
  common: {
    save: "Kaydet",
    cancel: "İptal",
    delete: "Sil",
    edit: "Düzenle",
    new: "Yeni",
    search: "Ara",
    loading: "Yükleniyor...",
    confirm: "Onayla",
    required: "zorunlu",
    empty: "Kayıt yok",
  },
  customer: {
    singular: "Müşteri",
    plural: "Müşteriler",
    name: "Ad",
    contact: "İletişim Kişisi",
    email: "E-posta",
    phone: "Telefon",
    address: "Adres",
    taxOffice: "Vergi Dairesi",
    taxNo: "Vergi No",
    notes: "Notlar",
    proposalCount: "Teklif Sayısı",
    lastActivity: "Son Aktivite",
    newTitle: "Yeni Müşteri",
    editTitle: "Müşteri Düzenle",
  },
  proposal: {
    singular: "Teklif",
    plural: "Teklifler",
    title: "Başlık",
    status: "Durum",
    total: "Tutar",
    currency: "Para Birimi",
    notes: "Notlar",
    createdAt: "Oluşturulma",
    newTitle: "Yeni Teklif",
    editTitle: "Teklif Düzenle",
    fromLast: "Son teklifinden",
    statuses: {
      taslak: "Taslak",
      gonderildi: "Gönderildi",
      kazanildi: "Kazanıldı",
      kaybedildi: "Kaybedildi",
      beklemede: "Beklemede",
    },
  },
  parameter: {
    singular: "Parametre",
    plural: "Parametreler",
    key: "Anahtar",
    label: "Etiket",
    description: "Açıklama",
    type: "Tip",
    unit: "Birim",
    required: "Zorunlu",
    options: "Seçenekler",
    order: "Sıra",
    types: {
      text: "Kısa metin",
      textarea: "Uzun metin",
      number: "Sayı",
      select: "Tek seçim",
      multiselect: "Çoklu seçim",
      boolean: "Evet/Hayır",
      date: "Tarih",
    },
    deleteWarn:
      "Bu parametreyi silmek eski tekliflerdeki veriyi silmez (snapshot korunuyor), sadece yeni tekliflerde görünmez.",
  },
  backup: {
    create: "Yedek Oluştur",
    restore: "Geri Yükle",
    mode: "Mod",
    merge: "Birleştir",
    replace: "Değiştir",
    replaceWarn:
      "Mevcut veriler yedeklenip değiştirilecek. Devam edilsin mi?",
    createdAt: "Oluşturulma",
    size: "Boyut",
  },
  settings: {
    dataDir: "Veri Klasörü",
    defaultCurrency: "Varsayılan Para Birimi",
    autoUpdate: "Otomatik Güncelleme",
    checkNow: "Şimdi Kontrol Et",
    version: "Sürüm",
  },
  update: {
    available: "Yeni sürüm mevcut",
    install: "Şimdi güncelle",
    later: "Sonra hatırlat",
    skip: "Bu sürümü atla",
  },
  errors: {
    unknown: "Beklenmeyen hata",
    notFound: (entity: string) => `${entity} bulunamadı`,
    conflict: "Çakışma",
    io: "Dosya hatası",
    corrupt: "Bozuk dosya",
  },
} as const;
```

- [ ] **Step 4: Create `src/lib/errors.ts`**

```typescript
import { notifications } from "@mantine/notifications";
import type { AppError } from "../types";
import { tr } from "./i18n/tr";

export function errorToMessage(err: unknown): string {
  if (typeof err === "object" && err !== null && "kind" in err) {
    const e = err as AppError;
    switch (e.kind) {
      case "not_found": return tr.errors.notFound(e.entity);
      case "validation": return `${e.field}: ${e.message}`;
      case "conflict": return e.message;
      case "io": return `${tr.errors.io}: ${e.message}`;
      case "corrupt": return `${tr.errors.corrupt}: ${e.reason}`;
    }
  }
  if (err instanceof Error) return err.message;
  return tr.errors.unknown;
}

export function showError(err: unknown) {
  notifications.show({
    color: "red",
    title: "Hata",
    message: errorToMessage(err),
  });
}

export function showSuccess(message: string) {
  notifications.show({ color: "green", title: "Başarılı", message });
}
```

- [ ] **Step 5: Commit**

```bash
git add src/types.ts src/lib
git commit -m "feat(frontend): typed api client, error translation, i18n"
```

---

## Task 10: Dynamic schema and form components

**Files:**
- Create: `src/lib/schema.ts`
- Create: `src/lib/schema.test.ts`
- Create: `src/components/DynamicField.tsx`
- Create: `src/components/FieldHistoryCombobox.tsx`
- Modify: `package.json` (add test script)

- [ ] **Step 1: Add test script to `package.json`**

In the `scripts` section, add:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 2: Create `vitest.config.ts`**

```typescript
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
  },
});
```

- [ ] **Step 3: Write failing test for schema builder**

Create `src/lib/schema.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { buildZodSchema } from "./schema";
import type { Parameter } from "../types";

const baseParam = (overrides: Partial<Parameter>): Parameter => ({
  key: "k", label: "L", description: "", type: "text",
  options: [], unit: null, min: null, max: null,
  max_length: null, required: false, order: 1,
  ...overrides,
});

describe("buildZodSchema", () => {
  it("requires a field when required is true", () => {
    const schema = buildZodSchema([
      baseParam({ key: "malzeme", type: "text", required: true }),
    ]);
    const bad = schema.safeParse({ malzeme: "" });
    expect(bad.success).toBe(false);
  });

  it("accepts number within range", () => {
    const schema = buildZodSchema([
      baseParam({ key: "adet", type: "number", min: 1, max: 100, required: true }),
    ]);
    expect(schema.safeParse({ adet: 10 }).success).toBe(true);
    expect(schema.safeParse({ adet: 200 }).success).toBe(false);
  });

  it("validates select options", () => {
    const schema = buildZodSchema([
      baseParam({
        key: "m", type: "select", options: ["A", "B"], required: true,
      }),
    ]);
    expect(schema.safeParse({ m: "A" }).success).toBe(true);
    expect(schema.safeParse({ m: "C" }).success).toBe(false);
  });
});
```

- [ ] **Step 4: Create `src/lib/schema.ts`**

```typescript
import { z, ZodTypeAny } from "zod";
import type { Parameter } from "../types";

export function buildZodSchema(params: Parameter[]): z.ZodObject<Record<string, ZodTypeAny>> {
  const shape: Record<string, ZodTypeAny> = {};
  for (const p of params) {
    let field: ZodTypeAny;
    switch (p.type) {
      case "text":
      case "textarea": {
        let s = z.string();
        if (p.max_length) s = s.max(p.max_length, `En fazla ${p.max_length} karakter`);
        field = p.required ? s.min(1, `${p.label} zorunludur`) : s.optional().or(z.literal(""));
        break;
      }
      case "number": {
        let n = z.coerce.number({ invalid_type_error: `${p.label} sayı olmalı` });
        if (p.min !== null) n = n.min(p.min, `En az ${p.min}`);
        if (p.max !== null) n = n.max(p.max, `En fazla ${p.max}`);
        field = p.required ? n : n.optional();
        break;
      }
      case "select": {
        if (p.options.length > 0) {
          field = z.enum(p.options as [string, ...string[]]);
        } else {
          field = z.string();
        }
        if (!p.required) field = (field as z.ZodString).optional();
        break;
      }
      case "multiselect": {
        let arr = z.array(z.string());
        if (p.required) arr = arr.min(1, `${p.label} zorunludur`);
        field = arr;
        break;
      }
      case "boolean":
        field = z.boolean();
        break;
      case "date":
        field = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD formatı");
        if (!p.required) field = (field as z.ZodString).optional();
        break;
    }
    shape[p.key] = field;
  }
  return z.object(shape);
}
```

- [ ] **Step 5: Run tests**

Run: `npm test`
Expected: 3 passed in `schema.test.ts`.

- [ ] **Step 6: Create `src/components/FieldHistoryCombobox.tsx`**

```tsx
import { Autocomplete, NumberInput } from "@mantine/core";
import { useEffect, useState } from "react";
import { api } from "../lib/api";
import type { FieldHistoryEntry } from "../types";

interface Props {
  fieldKey: string;
  label: string;
  required?: boolean;
  description?: string;
  value: string | number | undefined;
  onChange: (value: string | number) => void;
  mode: "text" | "number";
}

export function FieldHistoryCombobox({
  fieldKey, label, required, description, value, onChange, mode,
}: Props) {
  const [history, setHistory] = useState<FieldHistoryEntry[]>([]);

  useEffect(() => {
    api.getFieldHistory(fieldKey, 20).then(setHistory).catch(() => {});
  }, [fieldKey]);

  const options = history.map((h) => String(h.value).replace(/^"|"$/g, ""));

  if (mode === "number") {
    return (
      <NumberInput
        label={label}
        description={description}
        withAsterisk={required}
        value={typeof value === "number" ? value : undefined}
        onChange={(v) => onChange(typeof v === "number" ? v : 0)}
      />
    );
  }

  return (
    <Autocomplete
      label={label}
      description={description}
      withAsterisk={required}
      data={options}
      value={typeof value === "string" ? value : ""}
      onChange={onChange}
    />
  );
}
```

- [ ] **Step 7: Create `src/components/DynamicField.tsx`**

```tsx
import {
  TextInput, Textarea, NumberInput, Select, MultiSelect,
  Checkbox, Tooltip,
} from "@mantine/core";
import { DateInput } from "@mantine/dates";
import { IconInfoCircle } from "@tabler/icons-react";
import { Controller, type Control } from "react-hook-form";
import type { Parameter } from "../types";
import { FieldHistoryCombobox } from "./FieldHistoryCombobox";

interface Props {
  param: Parameter;
  control: Control<Record<string, unknown>>;
  fromLastBadge?: boolean;
}

export function DynamicField({ param, control, fromLastBadge }: Props) {
  const label = (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      {param.label}
      {param.unit && <span style={{ color: "#888" }}>({param.unit})</span>}
      {param.description && (
        <Tooltip label={param.description} multiline w={240}>
          <IconInfoCircle size={14} />
        </Tooltip>
      )}
      {fromLastBadge && (
        <span style={{
          fontSize: 10, color: "#2b8a3e", background: "#e6fcf5",
          padding: "1px 6px", borderRadius: 4,
        }}>
          Son teklifinden
        </span>
      )}
    </span>
  );

  return (
    <Controller
      name={param.key}
      control={control}
      render={({ field, fieldState }) => {
        const error = fieldState.error?.message;
        switch (param.type) {
          case "text":
            return (
              <FieldHistoryCombobox
                fieldKey={param.key}
                label={param.label}
                required={param.required}
                description={param.description}
                value={field.value as string | undefined}
                onChange={field.onChange}
                mode="text"
              />
            );
          case "textarea":
            return (
              <Textarea
                label={label}
                withAsterisk={param.required}
                value={(field.value as string) ?? ""}
                onChange={(e) => field.onChange(e.currentTarget.value)}
                error={error}
                autosize minRows={2}
              />
            );
          case "number":
            return (
              <NumberInput
                label={label}
                withAsterisk={param.required}
                min={param.min ?? undefined}
                max={param.max ?? undefined}
                value={(field.value as number) ?? ""}
                onChange={(v) => field.onChange(typeof v === "number" ? v : undefined)}
                error={error}
              />
            );
          case "select":
            return (
              <Select
                label={label}
                withAsterisk={param.required}
                data={param.options}
                value={(field.value as string) ?? null}
                onChange={(v) => field.onChange(v)}
                error={error}
                searchable
              />
            );
          case "multiselect":
            return (
              <MultiSelect
                label={label}
                withAsterisk={param.required}
                data={param.options}
                value={(field.value as string[]) ?? []}
                onChange={(v) => field.onChange(v)}
                error={error}
                searchable
              />
            );
          case "boolean":
            return (
              <Checkbox
                label={label}
                checked={(field.value as boolean) ?? false}
                onChange={(e) => field.onChange(e.currentTarget.checked)}
              />
            );
          case "date":
            return (
              <DateInput
                label={label}
                withAsterisk={param.required}
                value={field.value ? new Date(field.value as string) : null}
                onChange={(d) => field.onChange(
                  d ? (d as Date).toISOString().slice(0, 10) : null)}
                valueFormat="YYYY-MM-DD"
                error={error}
              />
            );
        }
      }}
    />
  );
}
```

- [ ] **Step 8: Commit**

```bash
git add src/components src/lib/schema.ts src/lib/schema.test.ts package.json vitest.config.ts
git commit -m "feat(frontend): dynamic form engine with schema builder and field history"
```

---

## Task 11: App shell, routing, Mantine theme, Zustand stores

**Files:**
- Modify: `src/main.tsx`
- Modify: `src/App.tsx`
- Create: `src/components/AppShell.tsx`
- Create: `src/stores/settings.ts`
- Create: `src/stores/parameters.ts`

- [ ] **Step 1: Create `src/stores/settings.ts`**

```typescript
import { create } from "zustand";
import { api } from "../lib/api";
import type { Settings } from "../types";

interface SettingsStore {
  settings: Settings | null;
  load: () => Promise<void>;
  update: (patch: Partial<Settings>) => Promise<void>;
}

export const useSettings = create<SettingsStore>((set, get) => ({
  settings: null,
  load: async () => {
    const s = await api.getSettings();
    set({ settings: s });
  },
  update: async (patch) => {
    const updated = await api.updateSettings({
      default_currency: patch.default_currency,
      auto_update_enabled: patch.auto_update_enabled,
      skipped_version: patch.skipped_version,
    });
    set({ settings: updated });
  },
}));
```

- [ ] **Step 2: Create `src/stores/parameters.ts`**

```typescript
import { create } from "zustand";
import { api } from "../lib/api";
import type { ParameterCatalog, Parameter } from "../types";

interface ParametersStore {
  catalog: ParameterCatalog | null;
  load: () => Promise<void>;
  upsert: (param: Parameter) => Promise<void>;
  remove: (key: string) => Promise<void>;
  reorder: (keys: string[]) => Promise<void>;
}

export const useParameters = create<ParametersStore>((set) => ({
  catalog: null,
  load: async () => set({ catalog: await api.getParameters() }),
  upsert: async (param) => set({ catalog: await api.upsertParameter(param) }),
  remove: async (key) => set({ catalog: await api.deleteParameter(key) }),
  reorder: async (keys) => set({ catalog: await api.reorderParameters(keys) }),
}));
```

- [ ] **Step 3: Create `src/components/AppShell.tsx`**

```tsx
import { AppShell as MShell, NavLink, Title } from "@mantine/core";
import {
  IconDashboard, IconUsers, IconFileText, IconSettings,
  IconAdjustments, IconArchive,
} from "@tabler/icons-react";
import { NavLink as RLink, Outlet, useLocation } from "react-router-dom";
import { tr } from "../lib/i18n/tr";

const items = [
  { to: "/", label: tr.nav.dashboard, icon: IconDashboard },
  { to: "/customers", label: tr.nav.customers, icon: IconUsers },
  { to: "/proposals", label: tr.nav.proposals, icon: IconFileText },
  { to: "/parameters", label: tr.nav.parameters, icon: IconAdjustments },
  { to: "/backup", label: tr.nav.backup, icon: IconArchive },
  { to: "/settings", label: tr.nav.settings, icon: IconSettings },
];

export function AppShell() {
  const loc = useLocation();
  return (
    <MShell
      header={{ height: 50 }}
      navbar={{ width: 220, breakpoint: "sm" }}
      padding="md"
    >
      <MShell.Header p="sm">
        <Title order={4}>{tr.app.title}</Title>
      </MShell.Header>
      <MShell.Navbar p="xs">
        {items.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            component={RLink}
            to={to}
            label={label}
            leftSection={<Icon size={18} />}
            active={to === "/" ? loc.pathname === "/" : loc.pathname.startsWith(to)}
          />
        ))}
      </MShell.Navbar>
      <MShell.Main>
        <Outlet />
      </MShell.Main>
    </MShell>
  );
}
```

- [ ] **Step 4: Update `src/main.tsx`**

```tsx
import React from "react";
import ReactDOM from "react-dom/client";
import { MantineProvider } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import { ModalsProvider } from "@mantine/modals";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "@mantine/core/styles.css";
import "@mantine/dates/styles.css";
import "@mantine/notifications/styles.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <MantineProvider>
      <ModalsProvider>
        <Notifications position="top-right" />
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </ModalsProvider>
    </MantineProvider>
  </React.StrictMode>
);
```

- [ ] **Step 5: Replace `src/App.tsx` with routes**

```tsx
import { useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import { Dashboard } from "./routes/Dashboard";
import { CustomersList } from "./routes/Customers/List";
import { CustomerDetail } from "./routes/Customers/Detail";
import { CustomerForm } from "./routes/Customers/Form";
import { ProposalsList } from "./routes/Proposals/List";
import { ProposalForm } from "./routes/Proposals/Form";
import { ParametersPage } from "./routes/Parameters";
import { BackupPage } from "./routes/Backup";
import { SettingsPage } from "./routes/Settings";
import { useSettings } from "./stores/settings";
import { useParameters } from "./stores/parameters";

export default function App() {
  const loadSettings = useSettings((s) => s.load);
  const loadParameters = useParameters((s) => s.load);

  useEffect(() => {
    loadSettings().catch(() => {});
    loadParameters().catch(() => {});
  }, [loadSettings, loadParameters]);

  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/customers" element={<CustomersList />} />
        <Route path="/customers/new" element={<CustomerForm />} />
        <Route path="/customers/:id" element={<CustomerDetail />} />
        <Route path="/customers/:id/edit" element={<CustomerForm />} />
        <Route path="/proposals" element={<ProposalsList />} />
        <Route path="/proposals/new" element={<ProposalForm />} />
        <Route path="/proposals/:id" element={<ProposalForm />} />
        <Route path="/parameters" element={<ParametersPage />} />
        <Route path="/backup" element={<BackupPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Route>
    </Routes>
  );
}
```

- [ ] **Step 6: Create empty route files to satisfy imports**

For each of the following, create a file with a minimal placeholder (to be filled in later tasks):

`src/routes/Dashboard.tsx`:
```tsx
export function Dashboard() { return <div>Özet</div>; }
```

`src/routes/Customers/List.tsx`:
```tsx
export function CustomersList() { return <div>Müşteriler</div>; }
```

`src/routes/Customers/Detail.tsx`:
```tsx
export function CustomerDetail() { return <div>Müşteri Detay</div>; }
```

`src/routes/Customers/Form.tsx`:
```tsx
export function CustomerForm() { return <div>Müşteri Form</div>; }
```

`src/routes/Proposals/List.tsx`:
```tsx
export function ProposalsList() { return <div>Teklifler</div>; }
```

`src/routes/Proposals/Form.tsx`:
```tsx
export function ProposalForm() { return <div>Teklif Form</div>; }
```

`src/routes/Parameters.tsx`:
```tsx
export function ParametersPage() { return <div>Parametreler</div>; }
```

`src/routes/Backup.tsx`:
```tsx
export function BackupPage() { return <div>Yedekle</div>; }
```

`src/routes/Settings.tsx`:
```tsx
export function SettingsPage() { return <div>Ayarlar</div>; }
```

- [ ] **Step 7: Run dev and verify navigation**

Run: `npm run tauri dev`
Expected: App shell with sidebar, clicking items switches routes to placeholder pages.

- [ ] **Step 8: Commit**

```bash
git add src
git commit -m "feat(frontend): app shell, routing, zustand stores"
```

---

## Task 12: Parameters screen

**Files:**
- Modify: `src/routes/Parameters.tsx`
- Create: `src/components/ParameterForm.tsx`

- [ ] **Step 1: Create `src/components/ParameterForm.tsx`**

```tsx
import {
  Modal, Stack, TextInput, Textarea, Select, Checkbox,
  NumberInput, TagsInput, Button, Group,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useEffect } from "react";
import type { Parameter, ParameterType } from "../types";
import { tr } from "../lib/i18n/tr";

interface Props {
  opened: boolean;
  onClose: () => void;
  onSave: (param: Parameter) => Promise<void>;
  initial?: Parameter;
  nextOrder: number;
}

const typeOptions: { value: ParameterType; label: string }[] = [
  { value: "text", label: tr.parameter.types.text },
  { value: "textarea", label: tr.parameter.types.textarea },
  { value: "number", label: tr.parameter.types.number },
  { value: "select", label: tr.parameter.types.select },
  { value: "multiselect", label: tr.parameter.types.multiselect },
  { value: "boolean", label: tr.parameter.types.boolean },
  { value: "date", label: tr.parameter.types.date },
];

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/ç/g, "c").replace(/ğ/g, "g").replace(/ı/g, "i")
    .replace(/ö/g, "o").replace(/ş/g, "s").replace(/ü/g, "u")
    .replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

export function ParameterFormModal({
  opened, onClose, onSave, initial, nextOrder,
}: Props) {
  const form = useForm<Parameter>({
    initialValues: initial ?? {
      key: "", label: "", description: "", type: "text",
      options: [], unit: null, min: null, max: null,
      max_length: null, required: false, order: nextOrder,
    },
  });

  useEffect(() => {
    if (!initial && form.values.key === "" && form.values.label) {
      form.setFieldValue("key", slugify(form.values.label));
    }
  }, [form.values.label]);

  const submit = form.onSubmit(async (values) => {
    await onSave(values);
    onClose();
  });

  const needsOptions =
    form.values.type === "select" || form.values.type === "multiselect";
  const isNumber = form.values.type === "number";
  const isText = form.values.type === "text" || form.values.type === "textarea";

  return (
    <Modal opened={opened} onClose={onClose}
      title={initial ? tr.parameter.singular : "Yeni Parametre"} size="lg">
      <form onSubmit={submit}>
        <Stack>
          <TextInput label={tr.parameter.label} required
            {...form.getInputProps("label")} />
          <TextInput label={tr.parameter.key} required
            {...form.getInputProps("key")}
            disabled={Boolean(initial)} />
          <Textarea label={tr.parameter.description}
            {...form.getInputProps("description")} autosize minRows={2} />
          <Select label={tr.parameter.type} data={typeOptions}
            value={form.values.type}
            onChange={(v) => v && form.setFieldValue("type", v as ParameterType)} />
          <TextInput label={tr.parameter.unit}
            value={form.values.unit ?? ""}
            onChange={(e) =>
              form.setFieldValue("unit",
                e.currentTarget.value || null)} />
          {needsOptions && (
            <TagsInput label={tr.parameter.options}
              value={form.values.options}
              onChange={(v) => form.setFieldValue("options", v)} />
          )}
          {isNumber && (
            <Group grow>
              <NumberInput label="Min"
                value={form.values.min ?? ""}
                onChange={(v) => form.setFieldValue("min",
                  typeof v === "number" ? v : null)} />
              <NumberInput label="Max"
                value={form.values.max ?? ""}
                onChange={(v) => form.setFieldValue("max",
                  typeof v === "number" ? v : null)} />
            </Group>
          )}
          {isText && (
            <NumberInput label="Max karakter"
              value={form.values.max_length ?? ""}
              onChange={(v) => form.setFieldValue("max_length",
                typeof v === "number" ? v : null)} />
          )}
          <Checkbox label={tr.parameter.required}
            checked={form.values.required}
            onChange={(e) =>
              form.setFieldValue("required", e.currentTarget.checked)} />
          <Group justify="flex-end">
            <Button variant="default" onClick={onClose}>{tr.common.cancel}</Button>
            <Button type="submit">{tr.common.save}</Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
```

- [ ] **Step 2: Rewrite `src/routes/Parameters.tsx`**

```tsx
import { Button, Group, Stack, Table, Text, Title, ActionIcon } from "@mantine/core";
import { IconEdit, IconTrash, IconGripVertical, IconPlus } from "@tabler/icons-react";
import { modals } from "@mantine/modals";
import { useState } from "react";
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, verticalListSortingStrategy, useSortable, arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useParameters } from "../stores/parameters";
import { ParameterFormModal } from "../components/ParameterForm";
import type { Parameter } from "../types";
import { showError, showSuccess } from "../lib/errors";
import { tr } from "../lib/i18n/tr";

function Row({ param, onEdit, onDelete }: {
  param: Parameter; onEdit: () => void; onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: param.key });
  const style = { transform: CSS.Transform.toString(transform), transition };
  return (
    <Table.Tr ref={setNodeRef} style={style}>
      <Table.Td {...attributes} {...listeners} style={{ cursor: "grab" }}>
        <IconGripVertical size={16} />
      </Table.Td>
      <Table.Td>{param.label}</Table.Td>
      <Table.Td><Text size="xs" c="dimmed">{param.key}</Text></Table.Td>
      <Table.Td>{tr.parameter.types[param.type]}</Table.Td>
      <Table.Td>{param.required ? "✓" : ""}</Table.Td>
      <Table.Td>
        <Group gap="xs">
          <ActionIcon variant="subtle" onClick={onEdit}><IconEdit size={16} /></ActionIcon>
          <ActionIcon variant="subtle" color="red" onClick={onDelete}><IconTrash size={16} /></ActionIcon>
        </Group>
      </Table.Td>
    </Table.Tr>
  );
}

export function ParametersPage() {
  const { catalog, upsert, remove, reorder } = useParameters();
  const [editing, setEditing] = useState<Parameter | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const sensors = useSensors(useSensor(PointerSensor));
  const params = catalog?.parameters ?? [];

  const onDragEnd = async (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return;
    const oldIndex = params.findIndex((p) => p.key === e.active.id);
    const newIndex = params.findIndex((p) => p.key === e.over!.id);
    const newOrder = arrayMove(params, oldIndex, newIndex);
    try {
      await reorder(newOrder.map((p) => p.key));
    } catch (err) { showError(err); }
  };

  const handleSave = async (param: Parameter) => {
    try {
      await upsert(param);
      showSuccess(tr.common.save + " ✓");
    } catch (err) { showError(err); }
  };

  const handleDelete = (key: string) => {
    modals.openConfirmModal({
      title: tr.common.delete,
      children: <Text size="sm">{tr.parameter.deleteWarn}</Text>,
      labels: { confirm: tr.common.delete, cancel: tr.common.cancel },
      confirmProps: { color: "red" },
      onConfirm: async () => {
        try { await remove(key); }
        catch (err) { showError(err); }
      },
    });
  };

  return (
    <Stack>
      <Group justify="space-between">
        <Title order={2}>{tr.parameter.plural}</Title>
        <Button leftSection={<IconPlus size={16} />}
          onClick={() => { setEditing(null); setModalOpen(true); }}>
          {tr.common.new}
        </Button>
      </Group>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext
          items={params.map((p) => p.key)}
          strategy={verticalListSortingStrategy}
        >
          <Table>
            <Table.Thead>
              <Table.Tr>
                <Table.Th></Table.Th>
                <Table.Th>{tr.parameter.label}</Table.Th>
                <Table.Th>{tr.parameter.key}</Table.Th>
                <Table.Th>{tr.parameter.type}</Table.Th>
                <Table.Th>{tr.parameter.required}</Table.Th>
                <Table.Th></Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {params.length === 0 && (
                <Table.Tr>
                  <Table.Td colSpan={6}>
                    <Text c="dimmed" ta="center">{tr.common.empty}</Text>
                  </Table.Td>
                </Table.Tr>
              )}
              {params.map((p) => (
                <Row key={p.key} param={p}
                  onEdit={() => { setEditing(p); setModalOpen(true); }}
                  onDelete={() => handleDelete(p.key)} />
              ))}
            </Table.Tbody>
          </Table>
        </SortableContext>
      </DndContext>
      <ParameterFormModal
        opened={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        initial={editing ?? undefined}
        nextOrder={params.length + 1}
      />
    </Stack>
  );
}
```

- [ ] **Step 3: Run dev and test manually**

Run: `npm run tauri dev`
Expected: add 2 parameters, edit one, delete one, drag-reorder. Refresh app — order persists.

- [ ] **Step 4: Commit**

```bash
git add src/routes/Parameters.tsx src/components/ParameterForm.tsx
git commit -m "feat(frontend): parameters screen with CRUD and drag-reorder"
```

---

## Task 13: Customers screens

**Files:**
- Modify: `src/routes/Customers/List.tsx`
- Modify: `src/routes/Customers/Detail.tsx`
- Modify: `src/routes/Customers/Form.tsx`

- [ ] **Step 1: Rewrite `src/routes/Customers/List.tsx`**

```tsx
import { Button, Group, Stack, Table, TextInput, Title, ActionIcon, Text } from "@mantine/core";
import { IconPlus, IconSearch, IconEdit, IconTrash } from "@tabler/icons-react";
import { modals } from "@mantine/modals";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../../lib/api";
import { showError, showSuccess } from "../../lib/errors";
import { tr } from "../../lib/i18n/tr";
import type { CustomerSummary } from "../../types";

export function CustomersList() {
  const [rows, setRows] = useState<CustomerSummary[]>([]);
  const [q, setQ] = useState("");
  const nav = useNavigate();

  const load = () => api.listCustomers().then(setRows).catch(showError);
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const needle = q.toLowerCase().trim();
    if (!needle) return rows;
    return rows.filter((r) =>
      r.name.toLowerCase().includes(needle) ||
      r.contact_person.toLowerCase().includes(needle));
  }, [rows, q]);

  const del = (id: string, name: string) => {
    modals.openConfirmModal({
      title: `${name} silinsin mi?`,
      labels: { confirm: tr.common.delete, cancel: tr.common.cancel },
      confirmProps: { color: "red" },
      onConfirm: async () => {
        try {
          await api.deleteCustomer(id);
          showSuccess("Silindi");
          load();
        } catch (err) { showError(err); }
      },
    });
  };

  return (
    <Stack>
      <Group justify="space-between">
        <Title order={2}>{tr.customer.plural}</Title>
        <Button leftSection={<IconPlus size={16} />}
          onClick={() => nav("/customers/new")}>
          {tr.common.new}
        </Button>
      </Group>
      <TextInput
        placeholder={tr.common.search}
        leftSection={<IconSearch size={16} />}
        value={q}
        onChange={(e) => setQ(e.currentTarget.value)}
      />
      <Table highlightOnHover>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>{tr.customer.name}</Table.Th>
            <Table.Th>{tr.customer.contact}</Table.Th>
            <Table.Th>{tr.customer.phone}</Table.Th>
            <Table.Th>{tr.customer.proposalCount}</Table.Th>
            <Table.Th></Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {filtered.length === 0 && (
            <Table.Tr>
              <Table.Td colSpan={5}>
                <Text c="dimmed" ta="center">{tr.common.empty}</Text>
              </Table.Td>
            </Table.Tr>
          )}
          {filtered.map((r) => (
            <Table.Tr key={r.id}>
              <Table.Td>
                <Link to={`/customers/${r.id}`}>{r.name}</Link>
              </Table.Td>
              <Table.Td>{r.contact_person}</Table.Td>
              <Table.Td>{r.phone}</Table.Td>
              <Table.Td>{r.proposal_count}</Table.Td>
              <Table.Td>
                <Group gap="xs">
                  <ActionIcon variant="subtle"
                    onClick={() => nav(`/customers/${r.id}/edit`)}>
                    <IconEdit size={16} />
                  </ActionIcon>
                  <ActionIcon variant="subtle" color="red"
                    onClick={() => del(r.id, r.name)}>
                    <IconTrash size={16} />
                  </ActionIcon>
                </Group>
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Stack>
  );
}
```

- [ ] **Step 2: Rewrite `src/routes/Customers/Form.tsx`**

```tsx
import { Button, Group, Stack, TextInput, Textarea, Title } from "@mantine/core";
import { useForm } from "@mantine/form";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../../lib/api";
import { showError, showSuccess } from "../../lib/errors";
import { tr } from "../../lib/i18n/tr";
import type { CustomerInput } from "../../types";

const empty: CustomerInput = {
  name: "", contact_person: "", email: "", phone: "",
  address: "", tax_office: "", tax_no: "", notes: "",
};

export function CustomerForm() {
  const { id } = useParams<{ id?: string }>();
  const nav = useNavigate();
  const [loading, setLoading] = useState(false);
  const form = useForm<CustomerInput>({
    initialValues: empty,
    validate: {
      name: (v) => (v.trim() ? null : `${tr.customer.name} ${tr.common.required}`),
    },
  });

  useEffect(() => {
    if (id) {
      api.getCustomer(id).then((c) => form.setValues({
        name: c.name, contact_person: c.contact_person,
        email: c.email, phone: c.phone, address: c.address,
        tax_office: c.tax_office, tax_no: c.tax_no, notes: c.notes,
      })).catch(showError);
    }
  }, [id]);

  const submit = form.onSubmit(async (values) => {
    setLoading(true);
    try {
      if (id) {
        await api.updateCustomer(id, values);
      } else {
        await api.createCustomer(values);
      }
      showSuccess("Kaydedildi");
      nav("/customers");
    } catch (err) { showError(err); }
    finally { setLoading(false); }
  });

  return (
    <Stack>
      <Title order={2}>
        {id ? tr.customer.editTitle : tr.customer.newTitle}
      </Title>
      <form onSubmit={submit}>
        <Stack>
          <TextInput label={tr.customer.name} required
            {...form.getInputProps("name")} />
          <Group grow>
            <TextInput label={tr.customer.contact}
              {...form.getInputProps("contact_person")} />
            <TextInput label={tr.customer.phone}
              {...form.getInputProps("phone")} />
          </Group>
          <TextInput label={tr.customer.email}
            {...form.getInputProps("email")} />
          <Textarea label={tr.customer.address} autosize minRows={2}
            {...form.getInputProps("address")} />
          <Group grow>
            <TextInput label={tr.customer.taxOffice}
              {...form.getInputProps("tax_office")} />
            <TextInput label={tr.customer.taxNo}
              {...form.getInputProps("tax_no")} />
          </Group>
          <Textarea label={tr.customer.notes} autosize minRows={2}
            {...form.getInputProps("notes")} />
          <Group justify="flex-end">
            <Button variant="default" onClick={() => nav("/customers")}>
              {tr.common.cancel}
            </Button>
            <Button type="submit" loading={loading}>
              {tr.common.save}
            </Button>
          </Group>
        </Stack>
      </form>
    </Stack>
  );
}
```

- [ ] **Step 3: Rewrite `src/routes/Customers/Detail.tsx`**

```tsx
import { Badge, Button, Group, Paper, Stack, Table, Text, Title } from "@mantine/core";
import { IconPlus } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../../lib/api";
import { showError } from "../../lib/errors";
import { tr } from "../../lib/i18n/tr";
import type { Customer, ProposalSummary } from "../../types";

export function CustomerDetail() {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [proposals, setProposals] = useState<ProposalSummary[]>([]);

  useEffect(() => {
    if (!id) return;
    api.getCustomer(id).then(setCustomer).catch(showError);
    api.listProposals({ customer_id: id }).then(setProposals).catch(showError);
  }, [id]);

  if (!customer) return <Text>{tr.common.loading}</Text>;

  return (
    <Stack>
      <Group justify="space-between">
        <Title order={2}>{customer.name}</Title>
        <Group>
          <Button variant="default"
            onClick={() => nav(`/customers/${id}/edit`)}>
            {tr.common.edit}
          </Button>
          <Button leftSection={<IconPlus size={16} />}
            onClick={() => nav(`/proposals/new?customer=${id}`)}>
            {tr.proposal.newTitle}
          </Button>
        </Group>
      </Group>
      <Paper p="md" withBorder>
        <Stack gap="xs">
          <Text><b>{tr.customer.contact}:</b> {customer.contact_person || "—"}</Text>
          <Text><b>{tr.customer.phone}:</b> {customer.phone || "—"}</Text>
          <Text><b>{tr.customer.email}:</b> {customer.email || "—"}</Text>
          <Text><b>{tr.customer.address}:</b> {customer.address || "—"}</Text>
          {customer.tax_no && (
            <Text><b>{tr.customer.taxNo}:</b> {customer.tax_office} / {customer.tax_no}</Text>
          )}
          {customer.notes && <Text><b>{tr.customer.notes}:</b> {customer.notes}</Text>}
        </Stack>
      </Paper>
      <Title order={4}>{tr.proposal.plural}</Title>
      <Table highlightOnHover>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>{tr.proposal.createdAt}</Table.Th>
            <Table.Th>{tr.proposal.title}</Table.Th>
            <Table.Th>{tr.proposal.status}</Table.Th>
            <Table.Th>{tr.proposal.total}</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {proposals.map((p) => (
            <Table.Tr key={p.id}>
              <Table.Td>{new Date(p.created_at).toLocaleDateString("tr-TR")}</Table.Td>
              <Table.Td>
                <Link to={`/proposals/${p.id}`}>{p.title}</Link>
              </Table.Td>
              <Table.Td>
                <Badge>{tr.proposal.statuses[p.status]}</Badge>
              </Table.Td>
              <Table.Td>
                {p.total_amount.toLocaleString("tr-TR")} {p.currency}
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Stack>
  );
}
```

- [ ] **Step 4: Run dev, test customer flow**

Run: `npm run tauri dev`
Expected: create customer "ACME", edit it, view detail, delete.

- [ ] **Step 5: Commit**

```bash
git add src/routes/Customers
git commit -m "feat(frontend): customers list, form, and detail screens"
```

---

## Task 14: Proposal list with filters

**Files:**
- Modify: `src/routes/Proposals/List.tsx`

- [ ] **Step 1: Write `src/routes/Proposals/List.tsx`**

```tsx
import {
  ActionIcon, Badge, Button, Chip, Group, Select, Stack, Table,
  Text, TextInput, Title,
} from "@mantine/core";
import { DatePickerInput } from "@mantine/dates";
import { IconEdit, IconPlus, IconSearch, IconTrash } from "@tabler/icons-react";
import { modals } from "@mantine/modals";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../../lib/api";
import { showError, showSuccess } from "../../lib/errors";
import { tr } from "../../lib/i18n/tr";
import type {
  CustomerSummary, ProposalFilter, ProposalStatus, ProposalSummary,
} from "../../types";

const statuses: ProposalStatus[] = [
  "taslak", "gonderildi", "kazanildi", "kaybedildi", "beklemede",
];

export function ProposalsList() {
  const [rows, setRows] = useState<ProposalSummary[]>([]);
  const [customers, setCustomers] = useState<CustomerSummary[]>([]);
  const [filter, setFilter] = useState<ProposalFilter>({});
  const [search, setSearch] = useState("");
  const [dates, setDates] = useState<[Date | null, Date | null]>([null, null]);
  const nav = useNavigate();

  const load = () => {
    const f: ProposalFilter = {
      ...filter,
      search: search.trim() || null,
      date_from: dates[0] ? dates[0].toISOString() : null,
      date_to: dates[1] ? dates[1].toISOString() : null,
    };
    api.listProposals(f).then(setRows).catch(showError);
  };

  useEffect(() => { api.listCustomers().then(setCustomers).catch(showError); }, []);
  useEffect(() => {
    const t = setTimeout(load, 200);
    return () => clearTimeout(t);
  }, [filter, search, dates]);

  const del = (id: string, title: string) => {
    modals.openConfirmModal({
      title: `${title} silinsin mi?`,
      labels: { confirm: tr.common.delete, cancel: tr.common.cancel },
      confirmProps: { color: "red" },
      onConfirm: async () => {
        try { await api.deleteProposal(id); showSuccess("Silindi"); load(); }
        catch (err) { showError(err); }
      },
    });
  };

  return (
    <Stack>
      <Group justify="space-between">
        <Title order={2}>{tr.proposal.plural}</Title>
        <Button leftSection={<IconPlus size={16} />}
          onClick={() => nav("/proposals/new")}>
          {tr.common.new}
        </Button>
      </Group>
      <Group>
        <TextInput
          placeholder={tr.common.search}
          leftSection={<IconSearch size={16} />}
          value={search}
          onChange={(e) => setSearch(e.currentTarget.value)}
          style={{ flex: 1 }}
        />
        <Select
          placeholder={tr.customer.singular}
          data={customers.map((c) => ({ value: c.id, label: c.name }))}
          value={filter.customer_id ?? null}
          onChange={(v) => setFilter({ ...filter, customer_id: v })}
          clearable
        />
        <DatePickerInput type="range"
          placeholder="Tarih aralığı"
          value={dates}
          onChange={(v) => setDates(v as [Date | null, Date | null])}
          clearable
        />
      </Group>
      <Chip.Group multiple={false}
        value={filter.status ?? ""}
        onChange={(v) =>
          setFilter({ ...filter, status: (v as ProposalStatus) || null })}>
        <Group gap="xs">
          <Chip value="">Tümü</Chip>
          {statuses.map((s) => (
            <Chip key={s} value={s}>{tr.proposal.statuses[s]}</Chip>
          ))}
        </Group>
      </Chip.Group>
      <Table highlightOnHover>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>{tr.proposal.createdAt}</Table.Th>
            <Table.Th>{tr.customer.singular}</Table.Th>
            <Table.Th>{tr.proposal.title}</Table.Th>
            <Table.Th>{tr.proposal.status}</Table.Th>
            <Table.Th>{tr.proposal.total}</Table.Th>
            <Table.Th></Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {rows.length === 0 && (
            <Table.Tr>
              <Table.Td colSpan={6}>
                <Text c="dimmed" ta="center">{tr.common.empty}</Text>
              </Table.Td>
            </Table.Tr>
          )}
          {rows.map((r) => (
            <Table.Tr key={r.id}>
              <Table.Td>{new Date(r.created_at).toLocaleDateString("tr-TR")}</Table.Td>
              <Table.Td>
                <Link to={`/customers/${r.customer_id}`}>{r.customer_name}</Link>
              </Table.Td>
              <Table.Td>
                <Link to={`/proposals/${r.id}`}>{r.title}</Link>
              </Table.Td>
              <Table.Td>
                <Badge>{tr.proposal.statuses[r.status]}</Badge>
              </Table.Td>
              <Table.Td>
                {r.total_amount.toLocaleString("tr-TR")} {r.currency}
              </Table.Td>
              <Table.Td>
                <Group gap="xs">
                  <ActionIcon variant="subtle"
                    onClick={() => nav(`/proposals/${r.id}`)}>
                    <IconEdit size={16} />
                  </ActionIcon>
                  <ActionIcon variant="subtle" color="red"
                    onClick={() => del(r.id, r.title)}>
                    <IconTrash size={16} />
                  </ActionIcon>
                </Group>
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Stack>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/routes/Proposals/List.tsx
git commit -m "feat(frontend): proposals list with filters"
```

---

## Task 15: Proposal dynamic form with prefill

**Files:**
- Modify: `src/routes/Proposals/Form.tsx`

- [ ] **Step 1: Write `src/routes/Proposals/Form.tsx`**

```tsx
import {
  Button, Divider, Group, Paper, Select, Stack, Textarea,
  TextInput, Title, NumberInput, Text,
} from "@mantine/core";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { api } from "../../lib/api";
import { buildZodSchema } from "../../lib/schema";
import { DynamicField } from "../../components/DynamicField";
import { showError, showSuccess } from "../../lib/errors";
import { tr } from "../../lib/i18n/tr";
import { useParameters } from "../../stores/parameters";
import { useSettings } from "../../stores/settings";
import type {
  CustomerSummary, ProposalInput, ProposalStatus,
} from "../../types";

const statuses: ProposalStatus[] = [
  "taslak", "gonderildi", "kazanildi", "kaybedildi", "beklemede",
];

export function ProposalForm() {
  const { id } = useParams<{ id?: string }>();
  const [search] = useSearchParams();
  const nav = useNavigate();
  const catalog = useParameters((s) => s.catalog);
  const settings = useSettings((s) => s.settings);

  const [customers, setCustomers] = useState<CustomerSummary[]>([]);
  const [prefilledKeys, setPrefilledKeys] = useState<Set<string>>(new Set());

  const coreSchema = z.object({
    customer_id: z.string().min(1, "Müşteri seçilmeli"),
    title: z.string().min(1, "Başlık zorunlu"),
    status: z.enum(["taslak", "gonderildi", "kazanildi", "kaybedildi", "beklemede"]),
    total_amount: z.coerce.number().min(0),
    currency: z.string().min(1),
    notes: z.string().optional(),
  });

  const dynamicSchema = useMemo(
    () => buildZodSchema(catalog?.parameters ?? []),
    [catalog]);

  const fullSchema = useMemo(
    () => coreSchema.merge(dynamicSchema as unknown as typeof coreSchema),
    [dynamicSchema]);

  type FormValues = z.infer<typeof coreSchema> & Record<string, unknown>;

  const { handleSubmit, control, reset, watch, setValue } = useForm<FormValues>({
    resolver: zodResolver(fullSchema),
    defaultValues: {
      customer_id: search.get("customer") ?? "",
      title: "",
      status: "taslak",
      total_amount: 0,
      currency: settings?.default_currency ?? "TRY",
      notes: "",
    },
  });

  const watchedCustomer = watch("customer_id");

  useEffect(() => { api.listCustomers().then(setCustomers).catch(showError); }, []);

  useEffect(() => {
    if (id) {
      api.getProposal(id).then((p) => {
        reset({
          customer_id: p.customer_id,
          title: p.title,
          status: p.status,
          total_amount: p.total_amount,
          currency: p.currency,
          notes: p.notes,
          ...p.custom_fields,
        });
        setPrefilledKeys(new Set());
      }).catch(showError);
    }
  }, [id]);

  useEffect(() => {
    if (id || !catalog || !watchedCustomer) return;
    api.getPrefillValues(watchedCustomer).then((values) => {
      const keys = new Set<string>();
      for (const p of catalog.parameters) {
        if (p.key in values) {
          setValue(p.key, values[p.key] as never);
          keys.add(p.key);
        }
      }
      setPrefilledKeys(keys);
    }).catch(() => {});
  }, [watchedCustomer, catalog, id]);

  const onSubmit = handleSubmit(async (values) => {
    const params = catalog?.parameters ?? [];
    const custom_fields: Record<string, unknown> = {};
    for (const p of params) {
      custom_fields[p.key] = values[p.key];
    }
    const input: ProposalInput = {
      customer_id: values.customer_id,
      title: values.title,
      status: values.status,
      total_amount: values.total_amount,
      currency: values.currency,
      notes: values.notes ?? "",
      custom_fields,
    };
    try {
      if (id) await api.updateProposal(id, input);
      else await api.createProposal(input);
      showSuccess("Kaydedildi");
      nav("/proposals");
    } catch (err) { showError(err); }
  });

  return (
    <Stack>
      <Title order={2}>
        {id ? tr.proposal.editTitle : tr.proposal.newTitle}
      </Title>
      <form onSubmit={onSubmit}>
        <Stack>
          <Paper p="md" withBorder>
            <Stack>
              <Controller name="customer_id" control={control}
                render={({ field, fieldState }) => (
                  <Select label={tr.customer.singular} required
                    data={customers.map((c) => ({ value: c.id, label: c.name }))}
                    value={field.value} onChange={(v) => field.onChange(v ?? "")}
                    error={fieldState.error?.message} searchable
                  />
                )} />
              <Controller name="title" control={control}
                render={({ field, fieldState }) => (
                  <TextInput label={tr.proposal.title} required
                    value={field.value}
                    onChange={(e) => field.onChange(e.currentTarget.value)}
                    error={fieldState.error?.message} />
                )} />
              <Group grow>
                <Controller name="status" control={control}
                  render={({ field }) => (
                    <Select label={tr.proposal.status}
                      data={statuses.map((s) => ({
                        value: s, label: tr.proposal.statuses[s],
                      }))}
                      value={field.value}
                      onChange={(v) => v && field.onChange(v)} />
                  )} />
                <Controller name="total_amount" control={control}
                  render={({ field, fieldState }) => (
                    <NumberInput label={tr.proposal.total}
                      value={field.value}
                      onChange={(v) =>
                        field.onChange(typeof v === "number" ? v : 0)}
                      error={fieldState.error?.message}
                      thousandSeparator="."
                      decimalSeparator=","
                    />
                  )} />
                <Controller name="currency" control={control}
                  render={({ field }) => (
                    <Select label={tr.proposal.currency}
                      data={["TRY", "EUR", "USD"]}
                      value={field.value}
                      onChange={(v) => v && field.onChange(v)} />
                  )} />
              </Group>
              <Controller name="notes" control={control}
                render={({ field }) => (
                  <Textarea label={tr.proposal.notes} autosize minRows={2}
                    value={(field.value as string) ?? ""}
                    onChange={(e) => field.onChange(e.currentTarget.value)} />
                )} />
            </Stack>
          </Paper>
          {catalog && catalog.parameters.length > 0 && (
            <Paper p="md" withBorder>
              <Stack>
                <Group justify="space-between">
                  <Title order={4}>{tr.parameter.plural}</Title>
                  {prefilledKeys.size > 0 && !id && (
                    <Text size="xs" c="dimmed">
                      Bazı alanlar son teklifinden dolduruldu
                    </Text>
                  )}
                </Group>
                <Divider />
                {catalog.parameters.map((p) => (
                  <DynamicField key={p.key} param={p}
                    control={control as never}
                    fromLastBadge={prefilledKeys.has(p.key)} />
                ))}
              </Stack>
            </Paper>
          )}
          <Group justify="flex-end">
            <Button variant="default" onClick={() => nav("/proposals")}>
              {tr.common.cancel}
            </Button>
            <Button type="submit">{tr.common.save}</Button>
          </Group>
        </Stack>
      </form>
    </Stack>
  );
}
```

- [ ] **Step 2: Run dev, test full flow**

Run: `npm run tauri dev`
Expected:
1. Create customer → create parameters → create proposal → dynamic fields show
2. Create second proposal for same customer → custom field values prefilled
3. Number/text fields show combobox history dropdown

- [ ] **Step 3: Commit**

```bash
git add src/routes/Proposals/Form.tsx
git commit -m "feat(frontend): proposal dynamic form with prefill and validation"
```

---

## Task 16: Dashboard, Backup, Settings screens

**Files:**
- Modify: `src/routes/Dashboard.tsx`
- Modify: `src/routes/Backup.tsx`
- Modify: `src/routes/Settings.tsx`

- [ ] **Step 1: Rewrite `src/routes/Dashboard.tsx`**

```tsx
import { Card, Group, SimpleGrid, Stack, Table, Text, Title, Badge } from "@mantine/core";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { showError } from "../lib/errors";
import { tr } from "../lib/i18n/tr";
import type { AppInfo, ProposalSummary } from "../types";

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <Card withBorder>
      <Text c="dimmed" size="sm">{label}</Text>
      <Text fz={28} fw={600}>{value}</Text>
    </Card>
  );
}

export function Dashboard() {
  const [info, setInfo] = useState<AppInfo | null>(null);
  const [recent, setRecent] = useState<ProposalSummary[]>([]);

  useEffect(() => {
    api.getAppInfo().then(setInfo).catch(showError);
    api.listProposals({}).then((list) => setRecent(list.slice(0, 10))).catch(showError);
  }, []);

  const now = new Date();
  const thisMonth = recent.filter((p) => {
    const d = new Date(p.created_at);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  const won = recent.filter((p) => p.status === "kazanildi").length;
  const decided = recent.filter((p) =>
    p.status === "kazanildi" || p.status === "kaybedildi").length;
  const winRate = decided > 0 ? Math.round((won / decided) * 100) : 0;

  if (!info) return <Text>{tr.common.loading}</Text>;

  if (info.proposal_count === 0 && info.customer_count === 0) {
    return (
      <Stack align="center" mt="xl">
        <Title order={3}>{tr.app.title}</Title>
        <Text c="dimmed">
          Henüz teklif yok — ilk müşterini ekleyerek başla
        </Text>
        <Link to="/customers/new">
          <Text c="blue">{tr.customer.newTitle} →</Text>
        </Link>
      </Stack>
    );
  }

  return (
    <Stack>
      <Title order={2}>{tr.nav.dashboard}</Title>
      <SimpleGrid cols={4}>
        <StatCard label={tr.customer.plural} value={info.customer_count} />
        <StatCard label={tr.proposal.plural} value={info.proposal_count} />
        <StatCard label="Bu ay" value={thisMonth} />
        <StatCard label="Kazanma oranı" value={`${winRate}%`} />
      </SimpleGrid>
      <Title order={4}>Son Teklifler</Title>
      <Table>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>{tr.customer.singular}</Table.Th>
            <Table.Th>{tr.proposal.title}</Table.Th>
            <Table.Th>{tr.proposal.status}</Table.Th>
            <Table.Th>{tr.proposal.total}</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {recent.map((p) => (
            <Table.Tr key={p.id}>
              <Table.Td>{p.customer_name}</Table.Td>
              <Table.Td>
                <Link to={`/proposals/${p.id}`}>{p.title}</Link>
              </Table.Td>
              <Table.Td>
                <Badge>{tr.proposal.statuses[p.status]}</Badge>
              </Table.Td>
              <Table.Td>
                {p.total_amount.toLocaleString("tr-TR")} {p.currency}
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Stack>
  );
}
```

- [ ] **Step 2: Rewrite `src/routes/Backup.tsx`**

```tsx
import { Button, Group, Stack, Table, Text, Title, ActionIcon, Radio } from "@mantine/core";
import { IconArchive, IconTrash, IconDownload } from "@tabler/icons-react";
import { modals } from "@mantine/modals";
import { open } from "@tauri-apps/plugin-dialog";
import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { showError, showSuccess } from "../lib/errors";
import { tr } from "../lib/i18n/tr";
import type { BackupEntry, RestoreMode } from "../types";

export function BackupPage() {
  const [entries, setEntries] = useState<BackupEntry[]>([]);

  const load = () => api.listBackups().then(setEntries).catch(showError);
  useEffect(() => { load(); }, []);

  const create = async () => {
    try {
      await api.createBackup();
      showSuccess("Yedek oluşturuldu");
      load();
    } catch (err) { showError(err); }
  };

  const del = (name: string) => {
    modals.openConfirmModal({
      title: `${name} silinsin mi?`,
      labels: { confirm: tr.common.delete, cancel: tr.common.cancel },
      confirmProps: { color: "red" },
      onConfirm: async () => {
        try { await api.deleteBackup(name); load(); }
        catch (err) { showError(err); }
      },
    });
  };

  const restore = async (path: string) => {
    let mode: RestoreMode = "merge";
    modals.open({
      title: tr.backup.restore,
      children: (
        <Stack>
          <Radio.Group defaultValue="merge"
            onChange={(v) => { mode = v as RestoreMode; }}>
            <Stack gap="xs">
              <Radio value="merge" label={tr.backup.merge} />
              <Radio value="replace" label={tr.backup.replace} />
            </Stack>
          </Radio.Group>
          <Text size="sm" c="dimmed">{tr.backup.replaceWarn}</Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={() => modals.closeAll()}>
              {tr.common.cancel}
            </Button>
            <Button onClick={async () => {
              modals.closeAll();
              try {
                await api.restoreBackup(path, mode);
                showSuccess("Geri yüklendi");
                load();
              } catch (err) { showError(err); }
            }}>{tr.common.confirm}</Button>
          </Group>
        </Stack>
      ),
    });
  };

  const restoreExternal = async () => {
    const picked = await open({
      multiple: false, directory: false,
      filters: [{ name: "Zip", extensions: ["zip"] }],
    });
    if (typeof picked === "string") restore(picked);
  };

  return (
    <Stack>
      <Group justify="space-between">
        <Title order={2}>{tr.nav.backup}</Title>
        <Group>
          <Button leftSection={<IconArchive size={16} />} onClick={create}>
            {tr.backup.create}
          </Button>
          <Button variant="default"
            leftSection={<IconDownload size={16} />}
            onClick={restoreExternal}>
            {tr.backup.restore}
          </Button>
        </Group>
      </Group>
      <Table>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Ad</Table.Th>
            <Table.Th>{tr.backup.createdAt}</Table.Th>
            <Table.Th>{tr.backup.size}</Table.Th>
            <Table.Th></Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {entries.length === 0 && (
            <Table.Tr>
              <Table.Td colSpan={4}>
                <Text c="dimmed" ta="center">{tr.common.empty}</Text>
              </Table.Td>
            </Table.Tr>
          )}
          {entries.map((e) => (
            <Table.Tr key={e.name}>
              <Table.Td>{e.name}</Table.Td>
              <Table.Td>
                {new Date(e.created_at).toLocaleString("tr-TR")}
              </Table.Td>
              <Table.Td>{(e.size_bytes / 1024).toFixed(1)} KB</Table.Td>
              <Table.Td>
                <Group gap="xs">
                  <Button size="xs" variant="subtle"
                    onClick={() => restore(e.path)}>
                    {tr.backup.restore}
                  </Button>
                  <ActionIcon variant="subtle" color="red"
                    onClick={() => del(e.name)}>
                    <IconTrash size={16} />
                  </ActionIcon>
                </Group>
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Stack>
  );
}
```

- [ ] **Step 3: Rewrite `src/routes/Settings.tsx`**

```tsx
import { Button, Group, Paper, Select, Stack, Switch, TextInput, Title, Text } from "@mantine/core";
import { open } from "@tauri-apps/plugin-dialog";
import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { showError, showSuccess } from "../lib/errors";
import { useSettings } from "../stores/settings";
import { tr } from "../lib/i18n/tr";
import type { AppInfo } from "../types";

export function SettingsPage() {
  const { settings, load, update } = useSettings();
  const [info, setInfo] = useState<AppInfo | null>(null);

  useEffect(() => {
    load().catch(showError);
    api.getAppInfo().then(setInfo).catch(showError);
  }, []);

  if (!settings) return <Text>{tr.common.loading}</Text>;

  const changeDataDir = async () => {
    const picked = await open({ directory: true, multiple: false });
    if (typeof picked === "string") {
      try {
        await api.initDataDir(picked);
        await load();
        showSuccess("Veri klasörü değişti");
      } catch (err) { showError(err); }
    }
  };

  return (
    <Stack>
      <Title order={2}>{tr.nav.settings}</Title>
      <Paper p="md" withBorder>
        <Stack>
          <Group align="flex-end">
            <TextInput label={tr.settings.dataDir} readOnly
              value={settings.data_dir} style={{ flex: 1 }} />
            <Button variant="default" onClick={changeDataDir}>
              Değiştir
            </Button>
          </Group>
          <Select label={tr.settings.defaultCurrency}
            data={["TRY", "EUR", "USD"]}
            value={settings.default_currency}
            onChange={(v) => v && update({ default_currency: v })}
          />
          <Switch label={tr.settings.autoUpdate}
            checked={settings.auto_update_enabled}
            onChange={(e) =>
              update({ auto_update_enabled: e.currentTarget.checked })}
          />
          {info && (
            <Text size="sm" c="dimmed">
              {tr.settings.version}: {info.version}
            </Text>
          )}
        </Stack>
      </Paper>
    </Stack>
  );
}
```

- [ ] **Step 4: Run dev and smoke-test all screens**

Run: `npm run tauri dev`
Expected: all screens render; backup create+restore works end-to-end.

- [ ] **Step 5: Commit**

```bash
git add src/routes
git commit -m "feat(frontend): dashboard, backup, settings screens"
```

---

## Task 17: Auto-update integration

**Files:**
- Modify: `src-tauri/tauri.conf.json`
- Create: `src/components/UpdateNotifier.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Generate signing keys (one-time)**

Run on the build machine:
```bash
npx @tauri-apps/cli signer generate -w ~/.tauri/fikstur.key
```

Save the printed public key. Store the private key path + password securely (GitHub secrets for CI). Do NOT commit the private key.

- [ ] **Step 2: Configure updater in `src-tauri/tauri.conf.json`**

Add or merge into the `plugins` section:
```json
{
  "plugins": {
    "updater": {
      "active": true,
      "endpoints": [
        "https://github.com/<owner>/<repo>/releases/latest/download/latest.json"
      ],
      "dialog": false,
      "pubkey": "<paste public key here>"
    }
  }
}
```

Replace `<owner>/<repo>` with the real GitHub repo path.

- [ ] **Step 3: Create `src/components/UpdateNotifier.tsx`**

```tsx
import { Button, Group, Notification, Stack, Text } from "@mantine/core";
import { IconDownload } from "@tabler/icons-react";
import { check } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import { useEffect, useState } from "react";
import { useSettings } from "../stores/settings";
import { tr } from "../lib/i18n/tr";

interface Available {
  version: string;
  notes?: string;
  install: () => Promise<void>;
}

export function UpdateNotifier() {
  const { settings, update } = useSettings();
  const [available, setAvailable] = useState<Available | null>(null);

  useEffect(() => {
    if (!settings?.auto_update_enabled) return;
    let cancelled = false;
    const runCheck = async () => {
      try {
        const upd = await check();
        if (!upd || cancelled) return;
        if (settings.skipped_version === upd.version) return;
        setAvailable({
          version: upd.version,
          notes: upd.body ?? "",
          install: async () => {
            await upd.downloadAndInstall();
            await relaunch();
          },
        });
      } catch {
        // offline or no update — ignore
      }
    };
    runCheck();
    const t = setInterval(runCheck, 24 * 60 * 60 * 1000);
    return () => { cancelled = true; clearInterval(t); };
  }, [settings?.auto_update_enabled, settings?.skipped_version]);

  if (!available) return null;

  return (
    <div style={{ position: "fixed", bottom: 20, right: 20, zIndex: 1000, maxWidth: 360 }}>
      <Notification
        title={`${tr.update.available}: ${available.version}`}
        color="blue"
        icon={<IconDownload size={18} />}
        onClose={() => setAvailable(null)}
      >
        <Stack gap="xs">
          {available.notes && <Text size="xs">{available.notes}</Text>}
          <Group gap="xs">
            <Button size="xs" onClick={() => available.install()}>
              {tr.update.install}
            </Button>
            <Button size="xs" variant="subtle"
              onClick={() => setAvailable(null)}>
              {tr.update.later}
            </Button>
            <Button size="xs" variant="subtle" color="gray"
              onClick={async () => {
                await update({ skipped_version: available.version });
                setAvailable(null);
              }}>
              {tr.update.skip}
            </Button>
          </Group>
        </Stack>
      </Notification>
    </div>
  );
}
```

- [ ] **Step 4: Mount notifier in `src/App.tsx`**

Add above the `<Routes>` block:
```tsx
import { UpdateNotifier } from "./components/UpdateNotifier";
```
And inside the component return, before `<Routes>`:
```tsx
<UpdateNotifier />
```

- [ ] **Step 5: Install updater-related plugins**

```bash
npm install @tauri-apps/plugin-updater @tauri-apps/plugin-process @tauri-apps/plugin-dialog
```

Also ensure `src-tauri/Cargo.toml` has `tauri-plugin-process = "2"` in `[dependencies]`, and add `.plugin(tauri_plugin_process::init())` to the builder chain in `lib.rs`.

- [ ] **Step 6: Build and dry-run**

Run: `npm run tauri dev`
Expected: App launches without error. Updater silently no-ops when no release exists yet.

- [ ] **Step 7: Commit**

```bash
git add src-tauri/tauri.conf.json src-tauri/Cargo.toml src-tauri/src/lib.rs src/components/UpdateNotifier.tsx src/App.tsx package.json
git commit -m "feat: auto-update via tauri-plugin-updater with notification"
```

---

## Task 18: Release pipeline

**Files:**
- Create: `.github/workflows/release.yml`
- Create: `docs/manual-test.md`

- [ ] **Step 1: Create `.github/workflows/release.yml`**

```yaml
name: Release

on:
  push:
    tags:
      - 'v*'

jobs:
  build:
    runs-on: windows-latest
    permissions:
      contents: write
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - uses: dtolnay/rust-toolchain@stable
      - uses: swatinem/rust-cache@v2
        with:
          workspaces: 'src-tauri -> target'
      - name: Install frontend dependencies
        run: npm ci
      - name: Build Tauri app
        env:
          TAURI_SIGNING_PRIVATE_KEY: ${{ secrets.TAURI_SIGNING_PRIVATE_KEY }}
          TAURI_SIGNING_PRIVATE_KEY_PASSWORD: ${{ secrets.TAURI_SIGNING_PRIVATE_KEY_PASSWORD }}
        run: npm run tauri build
      - name: Generate latest.json
        shell: pwsh
        run: |
          $version = "${{ github.ref_name }}".TrimStart('v')
          $msi = Get-ChildItem -Path src-tauri/target/release/bundle/msi -Filter *.msi | Select-Object -First 1
          $sig = Get-Content "$($msi.FullName).sig" -Raw
          $url = "https://github.com/${{ github.repository }}/releases/download/${{ github.ref_name }}/$($msi.Name)"
          $json = @{
            version = $version
            notes = "Release $version"
            pub_date = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
            platforms = @{
              "windows-x86_64" = @{ signature = $sig; url = $url }
            }
          } | ConvertTo-Json -Depth 5
          $json | Out-File -Encoding utf8 latest.json
      - name: Create GitHub Release
        uses: softprops/action-gh-release@v2
        with:
          files: |
            src-tauri/target/release/bundle/msi/*.msi
            src-tauri/target/release/bundle/msi/*.msi.sig
            latest.json
```

- [ ] **Step 2: Create `docs/manual-test.md`**

```markdown
# Manuel Smoke Test Kontrol Listesi

Her sürüm yayınlanmadan önce aşağıdaki akış uygulanmalı.

## İlk kurulum
- [ ] .msi dosyasını kur
- [ ] Uygulama açılır, veri klasörü seçimi görünür (veya varsayılan kullanılır)

## Parametreler
- [ ] Yeni parametre ekle (text, number, select)
- [ ] Parametrenin etiketi ve açıklaması form üzerinde görünüyor
- [ ] Parametreyi sürükle-bırak ile yeniden sırala
- [ ] Parametreyi sil, yeni tekliflerde görünmediğini doğrula

## Müşteriler
- [ ] Yeni müşteri oluştur
- [ ] Müşteriyi listede gör
- [ ] Müşteri detay sayfasını aç
- [ ] Müşteriyi düzenle
- [ ] Teklifi olan müşteriyi silmeye çalış (engellendi mi?)

## Teklifler
- [ ] Yeni teklif oluştur (dinamik form dolduruluyor)
- [ ] Zorunlu alan boş bırakılınca hata gösteriliyor
- [ ] Aynı müşteri için ikinci teklif aç — ön-doldurma çalışıyor (rozet görünüyor)
- [ ] Text/number alanında combobox'ta geçmiş değerler listede
- [ ] Filtreleme: müşteri, durum, tarih, arama çalışıyor
- [ ] Teklifi düzenle, kaydet
- [ ] Teklifi sil

## Yedekleme
- [ ] Yedek oluştur → listede görünür
- [ ] Bir veriyi değiştir → yedekten birleştirmeyle geri yükle → eski verinin korunduğunu doğrula
- [ ] Zip dosyasını dışarıdan seçerek geri yükle

## Ayarlar
- [ ] Varsayılan para birimini değiştir → yeni teklifte yansıyor
- [ ] Otomatik güncelleme toggle varsayılan açık
- [ ] Veri klasörünü değiştir → taşıma çalışıyor (veya yeni boş klasörde açılıyor)

## Otomatik Güncelleme
- [ ] Mevcut sürümden daha yüksek bir test sürümü yayınla
- [ ] Uygulama 24 saat içinde bildirimi gösteriyor (hızlı test için interval'i manuel tetikle)
- [ ] "Şimdi güncelle" → indirme + yeniden başlatma
- [ ] Yeni sürümde veri kaybı yok
```

- [ ] **Step 3: Commit**

```bash
git add .github docs/manual-test.md
git commit -m "chore: release workflow and manual smoke test checklist"
```

---

## Task 19: Unsaved guard and keyboard shortcuts

**Files:**
- Create: `src/components/UnsavedGuard.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Create `src/components/UnsavedGuard.tsx`**

```tsx
import { useEffect } from "react";
import { useBlocker } from "react-router-dom";
import { modals } from "@mantine/modals";
import { Text } from "@mantine/core";

export function UnsavedGuard({ dirty }: { dirty: boolean }) {
  const blocker = useBlocker(dirty);

  useEffect(() => {
    if (blocker.state === "blocked") {
      modals.openConfirmModal({
        title: "Kaydedilmemiş değişiklikler",
        children: (
          <Text size="sm">
            Bu sayfadan ayrılırsanız değişiklikler kaybolacak. Devam edilsin mi?
          </Text>
        ),
        labels: { confirm: "Ayrıl", cancel: "Kalmaya devam" },
        confirmProps: { color: "red" },
        onConfirm: () => blocker.proceed?.(),
        onCancel: () => blocker.reset?.(),
      });
    }
  }, [blocker]);

  return null;
}
```

- [ ] **Step 2: Wire into proposal and customer forms**

In `src/routes/Proposals/Form.tsx` and `src/routes/Customers/Form.tsx`, import `UnsavedGuard` and the form's `formState.isDirty` (rhf) / `form.isDirty()` (Mantine form). Add `<UnsavedGuard dirty={isDirty} />` inside the component return.

For Proposals (react-hook-form): destructure `formState: { isDirty }` from `useForm`.
For Customers (Mantine form): use `form.isDirty()` and pass as `dirty={form.isDirty()}`.

- [ ] **Step 3: Add global keyboard shortcuts in `src/App.tsx`**

Add this effect to `App`:

```tsx
import { useNavigate } from "react-router-dom";
// ...
const nav = useNavigate();
useEffect(() => {
  const handler = (e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "n") {
      e.preventDefault();
      nav("/proposals/new");
    }
  };
  window.addEventListener("keydown", handler);
  return () => window.removeEventListener("keydown", handler);
}, [nav]);
```

- [ ] **Step 4: Commit**

```bash
git add src/components/UnsavedGuard.tsx src/App.tsx src/routes/Proposals/Form.tsx src/routes/Customers/Form.tsx
git commit -m "feat(frontend): unsaved guard and Ctrl+N shortcut"
```

---

## Task 20: Final smoke test and first release

**Files:** none (manual)

- [ ] **Step 1: Run full test suite**

```bash
cd src-tauri && cargo test && cd ..
npm test
```
Expected: all green.

- [ ] **Step 2: Build release binary locally**

```bash
npm run tauri build
```
Expected: .msi produced at `src-tauri/target/release/bundle/msi/`.

- [ ] **Step 3: Install the .msi on a clean Windows machine (or VM)**

Run through `docs/manual-test.md` end to end. Fix any issues found as follow-up commits.

- [ ] **Step 4: Tag and push first release**

```bash
git tag v0.1.0
git push origin v0.1.0
```

GitHub Actions runs `release.yml`, produces signed .msi and `latest.json`. Verify the release page shows the files.

- [ ] **Step 5: Install the downloaded .msi and verify updater**

Install v0.1.0 from GitHub. Later, tag v0.1.1 with a trivial change, observe the v0.1.0 instance fetch and install the update.

---

## Self-Review

Checked against the spec:

- **Scope coverage:** all MVP items (customer CRUD, proposal CRUD, parameter catalog, search/filter, backup/restore, auto-update, prefill, field history) have dedicated tasks. Turkish-only i18n covered in Task 9. Dashboard/Settings/Backup covered in Task 16.
- **Spec §5 (data model):** Task 2 (models) + Task 3 (paths) + Tasks 4–7 (storage per entity) + Task 6 (`parameter_snapshot` emission inside `proposals::create`).
- **Spec §6 (screens):** Tasks 11–16 cover every screen listed.
- **Spec §7 (Rust commands):** every command in the spec is registered in Task 8 `lib.rs` handler list.
- **Spec §8 (auto-update):** Task 17 covers plugin, signing, notifier, skip-version. Task 18 ships release pipeline with `latest.json` generation.
- **Spec §10 (test strategy):** Rust unit/integration tests embedded in Tasks 2–7; Vitest added in Task 10; manual smoke in Task 18; final smoke in Task 20.
- **Spec §11 (success criteria):** all 10 criteria exercised by the manual test checklist.

No placeholders, no "similar to Task N" skips, no vague error-handling steps. Types used across tasks are consistent (`Parameter`, `Customer`, `Proposal`, `ProposalFilter`, etc.).

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-04-13-phase1-desktop-app.md`. Two execution options:

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration.

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints.

Which approach?
