use crate::error::AppResult;
use crate::models::proposal::{
    Proposal, ProposalFilter, ProposalInput, ProposalSummary,
};
use crate::state::AppState;
use serde::Serialize;
use serde_json::Value;
use std::collections::HashMap;
use tauri::State;

#[derive(Serialize)]
pub struct FieldHistoryEntry {
    pub value: Value,
    pub frequency: u32,
    pub last_used_at: chrono::DateTime<chrono::Utc>,
}

#[tauri::command]
pub fn list_proposals(
    state: State<'_, AppState>,
    filter: ProposalFilter,
) -> AppResult<Vec<ProposalSummary>> {
    state.with_paths(|p| crate::storage::proposals::list(p, &filter))
}

#[tauri::command]
pub fn get_proposal(state: State<'_, AppState>, id: String) -> AppResult<Proposal> {
    state.with_paths(|p| crate::storage::proposals::get(p, &id))
}

#[tauri::command]
pub fn create_proposal(
    state: State<'_, AppState>,
    input: ProposalInput,
) -> AppResult<Proposal> {
    let _w = state.write_lock.lock().unwrap();
    state.with_paths(|p| {
        let catalog = crate::storage::parameters::load(p)?;
        crate::storage::proposals::create(p, &catalog, input)
    })
}

#[tauri::command]
pub fn update_proposal(
    state: State<'_, AppState>,
    id: String,
    input: ProposalInput,
) -> AppResult<Proposal> {
    let _w = state.write_lock.lock().unwrap();
    state.with_paths(|p| {
        let catalog = crate::storage::parameters::load(p)?;
        crate::storage::proposals::update(p, &catalog, &id, input)
    })
}

#[tauri::command]
pub fn delete_proposal(state: State<'_, AppState>, id: String) -> AppResult<()> {
    let _w = state.write_lock.lock().unwrap();
    state.with_paths(|p| crate::storage::proposals::delete(p, &id))
}

#[tauri::command]
pub fn get_field_history(
    state: State<'_, AppState>,
    key: String,
    limit: usize,
) -> AppResult<Vec<FieldHistoryEntry>> {
    state.with_paths(|p| {
        Ok(crate::storage::proposals::field_history(p, &key, limit)?
            .into_iter()
            .map(|(value, frequency, last_used_at)| FieldHistoryEntry {
                value, frequency, last_used_at,
            })
            .collect())
    })
}

#[tauri::command]
pub fn get_prefill_values(
    state: State<'_, AppState>,
    customer_id: Option<String>,
) -> AppResult<HashMap<String, Value>> {
    state.with_paths(|p| {
        crate::storage::proposals::prefill_values(p, customer_id.as_deref())
    })
}
