use crate::error::{AppError, AppResult};
use crate::models::parameter::{Parameter, ParameterCatalog};
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub fn get_parameters(state: State<'_, AppState>) -> AppResult<ParameterCatalog> {
    state.with_paths(|p| crate::storage::parameters::load(p))
}

#[tauri::command]
pub fn upsert_parameter(
    state: State<'_, AppState>,
    param: Parameter,
) -> AppResult<ParameterCatalog> {
    let _w = state.write_lock.lock().unwrap();
    state.with_paths(|p| {
        let mut cat = crate::storage::parameters::load(p)?;
        if param.key.trim().is_empty() {
            return Err(AppError::Validation {
                field: "key".into(),
                message: "Anahtar gerekli".into(),
            });
        }
        if let Some(existing) = cat.parameters.iter_mut().find(|x| x.key == param.key) {
            *existing = param;
        } else {
            cat.parameters.push(param);
        }
        cat.parameters.sort_by_key(|x| x.order);
        cat.updated_at = chrono::Utc::now();
        crate::storage::parameters::save(p, &cat)?;
        Ok(cat)
    })
}

#[tauri::command]
pub fn delete_parameter(
    state: State<'_, AppState>,
    key: String,
) -> AppResult<ParameterCatalog> {
    let _w = state.write_lock.lock().unwrap();
    state.with_paths(|p| {
        let mut cat = crate::storage::parameters::load(p)?;
        cat.parameters.retain(|x| x.key != key);
        cat.updated_at = chrono::Utc::now();
        crate::storage::parameters::save(p, &cat)?;
        Ok(cat)
    })
}

#[tauri::command]
pub fn reorder_parameters(
    state: State<'_, AppState>,
    keys: Vec<String>,
) -> AppResult<ParameterCatalog> {
    let _w = state.write_lock.lock().unwrap();
    state.with_paths(|p| {
        let mut cat = crate::storage::parameters::load(p)?;
        let mut new_order: Vec<Parameter> = Vec::with_capacity(cat.parameters.len());
        for (i, key) in keys.iter().enumerate() {
            if let Some(pos) = cat.parameters.iter().position(|x| &x.key == key) {
                let mut param = cat.parameters.remove(pos);
                param.order = (i + 1) as u32;
                new_order.push(param);
            }
        }
        new_order.extend(cat.parameters);
        cat.parameters = new_order;
        cat.updated_at = chrono::Utc::now();
        crate::storage::parameters::save(p, &cat)?;
        Ok(cat)
    })
}
