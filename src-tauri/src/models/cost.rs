use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CostItem {
    pub id: String,
    pub label: String,
    pub amount: f64,
    pub currency: String,
    #[serde(default)]
    pub notes: String,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CostCatalog {
    pub schema_version: u32,
    pub items: Vec<CostItem>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

impl CostCatalog {
    pub fn empty() -> Self {
        Self {
            schema_version: 1,
            items: Vec::new(),
            updated_at: chrono::Utc::now(),
        }
    }
}
