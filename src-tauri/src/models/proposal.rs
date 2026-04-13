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
