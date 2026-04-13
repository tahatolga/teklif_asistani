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
