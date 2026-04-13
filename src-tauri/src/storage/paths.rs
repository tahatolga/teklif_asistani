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
