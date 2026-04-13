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
