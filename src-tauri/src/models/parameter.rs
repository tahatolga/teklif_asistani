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
