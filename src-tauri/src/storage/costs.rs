use crate::error::AppResult;
use crate::models::cost::CostCatalog;
use crate::storage::atomic::{atomic_write_json, read_json};
use crate::storage::paths::DataPaths;

pub fn load(paths: &DataPaths) -> AppResult<CostCatalog> {
    let path = paths.costs_json();
    if !path.exists() {
        return Ok(CostCatalog::empty());
    }
    read_json(&path)
}

pub fn save(paths: &DataPaths, catalog: &CostCatalog) -> AppResult<()> {
    atomic_write_json(&paths.costs_json(), catalog)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::cost::CostItem;
    use tempfile::tempdir;

    #[test]
    fn load_returns_empty_when_missing() {
        let dir = tempdir().unwrap();
        let paths = DataPaths::new(dir.path());
        let cat = load(&paths).unwrap();
        assert_eq!(cat.items.len(), 0);
    }

    #[test]
    fn save_then_load_roundtrip() {
        let dir = tempdir().unwrap();
        let paths = DataPaths::new(dir.path());
        let mut cat = CostCatalog::empty();
        cat.items.push(CostItem {
            id: "cnc-saatlik".into(),
            label: "CNC Saatlik Ücret".into(),
            amount: 750.0,
            currency: "TRY".into(),
            notes: String::new(),
            updated_at: chrono::Utc::now(),
        });
        save(&paths, &cat).unwrap();
        let back = load(&paths).unwrap();
        assert_eq!(back.items.len(), 1);
        assert_eq!(back.items[0].label, "CNC Saatlik Ücret");
        assert_eq!(back.items[0].amount, 750.0);
    }
}
