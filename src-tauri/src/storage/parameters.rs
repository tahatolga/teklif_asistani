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
