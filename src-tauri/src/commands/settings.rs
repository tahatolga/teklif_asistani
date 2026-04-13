use crate::error::AppResult;
use crate::models::settings::{AppInfo, Settings, SettingsInput};
use crate::state::AppState;
use crate::storage::paths::DataPaths;
use tauri::State;

#[tauri::command]
pub fn get_settings(state: State<'_, AppState>) -> AppResult<Settings> {
    state.with_paths(|p| crate::storage::settings::load(p))
}

#[tauri::command]
pub fn update_settings(
    state: State<'_, AppState>,
    input: SettingsInput,
) -> AppResult<Settings> {
    state.with_paths(|p| {
        let mut s = crate::storage::settings::load(p)?;
        if let Some(c) = input.default_currency { s.default_currency = c; }
        if let Some(a) = input.auto_update_enabled { s.auto_update_enabled = a; }
        if input.skipped_version.is_some() { s.skipped_version = input.skipped_version; }
        crate::storage::settings::save(p, &s)?;
        Ok(s)
    })
}

#[tauri::command]
pub fn init_data_dir(state: State<'_, AppState>, path: String) -> AppResult<Settings> {
    let new_paths = DataPaths::new(std::path::PathBuf::from(&path));
    new_paths.ensure_structure()?;
    {
        let mut guard = state.paths.lock().unwrap();
        *guard = new_paths.clone();
    }
    let mut s = crate::storage::settings::load(&new_paths)?;
    s.data_dir = path;
    crate::storage::settings::save(&new_paths, &s)?;
    Ok(s)
}

#[tauri::command]
pub fn get_app_info(state: State<'_, AppState>) -> AppResult<AppInfo> {
    state.with_paths(|p| {
        let customers = crate::storage::customers::list(p)?;
        let proposals = crate::storage::proposals::list(
            p, &crate::models::proposal::ProposalFilter::default())?;
        let parameters = crate::storage::parameters::load(p)?;
        Ok(AppInfo {
            version: env!("CARGO_PKG_VERSION").to_string(),
            data_dir: p.root().display().to_string(),
            customer_count: customers.len() as u32,
            proposal_count: proposals.len() as u32,
            parameter_count: parameters.parameters.len() as u32,
        })
    })
}
