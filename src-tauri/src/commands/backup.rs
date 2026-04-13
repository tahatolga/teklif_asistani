use crate::error::AppResult;
use crate::models::settings::{BackupEntry, RestoreMode};
use crate::state::AppState;
use std::path::Path;
use tauri::State;

#[tauri::command]
pub fn create_backup(state: State<'_, AppState>) -> AppResult<BackupEntry> {
    let _w = state.write_lock.lock().unwrap();
    state.with_paths(|p| crate::storage::backup::create(p))
}

#[tauri::command]
pub fn list_backups(state: State<'_, AppState>) -> AppResult<Vec<BackupEntry>> {
    state.with_paths(|p| crate::storage::backup::list(p))
}

#[tauri::command]
pub fn delete_backup(state: State<'_, AppState>, name: String) -> AppResult<()> {
    state.with_paths(|p| crate::storage::backup::delete(p, &name))
}

#[tauri::command]
pub fn restore_backup(
    state: State<'_, AppState>,
    path: String,
    mode: RestoreMode,
) -> AppResult<()> {
    let _w = state.write_lock.lock().unwrap();
    state.with_paths(|p| crate::storage::backup::restore(p, Path::new(&path), mode))
}
