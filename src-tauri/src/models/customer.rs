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
