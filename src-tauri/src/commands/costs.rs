use crate::error::{AppError, AppResult};
use crate::models::cost::{CostCatalog, CostItem};
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub fn get_costs(state: State<'_, AppState>) -> AppResult<CostCatalog> {
    state.with_paths(|p| crate::storage::costs::load(p))
}

#[tauri::command]
pub fn save_costs(
    state: State<'_, AppState>,
    items: Vec<CostItem>,
) -> AppResult<CostCatalog> {
    let _w = state.write_lock.lock().unwrap();
    state.with_paths(|p| {
        for item in &items {
            if item.label.trim().is_empty() {
                return Err(AppError::Validation {
                    field: "label".into(),
                    message: "Kalem adı gerekli".into(),
                });
            }
        }
        let cat = CostCatalog {
            schema_version: 1,
            items,
            updated_at: chrono::Utc::now(),
        };
        crate::storage::costs::save(p, &cat)?;
        Ok(cat)
    })
}
