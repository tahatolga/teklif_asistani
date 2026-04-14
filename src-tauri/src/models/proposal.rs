use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum InteractionDirection {
    Incoming,
    Outgoing,
    Internal,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum RowValueType {
    Text,
    Textarea,
    Number,
    Price,
    File,
}

impl Default for RowValueType {
    fn default() -> Self { Self::Text }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InteractionRow {
    pub key: String,
    #[serde(default)]
    pub value: serde_json::Value,
    #[serde(default)]
    pub value_type: RowValueType,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CostLine {
    pub cost_id: String,
    pub quantity: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Interaction {
    pub id: String,
    pub direction: InteractionDirection,
    pub created_at: chrono::DateTime<chrono::Utc>,
    #[serde(default)]
    pub rows: Vec<InteractionRow>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Proposal {
    pub id: String,
    pub schema_version: u32,
    pub customer_id: String,
    pub title: String,
    #[serde(default)]
    pub notes: String,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
    #[serde(default)]
    pub interactions: Vec<Interaction>,
    #[serde(default)]
    pub cost_lines: Vec<CostLine>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProposalInput {
    pub customer_id: String,
    pub title: String,
    #[serde(default)]
    pub notes: String,
    #[serde(default)]
    pub interactions: Vec<Interaction>,
    #[serde(default)]
    pub cost_lines: Vec<CostLine>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProposalSummary {
    pub id: String,
    pub customer_id: String,
    pub customer_name: String,
    pub title: String,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
    pub interaction_count: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct ProposalFilter {
    pub customer_id: Option<String>,
    pub search: Option<String>,
}
