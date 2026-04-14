use crate::error::{AppError, AppResult};
use crate::models::proposal::{
    Proposal, ProposalFilter, ProposalInput, ProposalSummary,
};
use crate::state::AppState;
use tauri::State;

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
    state.with_paths(|p| crate::storage::proposals::create(p, input))
}

#[tauri::command]
pub fn update_proposal(
    state: State<'_, AppState>,
    id: String,
    input: ProposalInput,
) -> AppResult<Proposal> {
    let _w = state.write_lock.lock().unwrap();
    state.with_paths(|p| crate::storage::proposals::update(p, &id, input))
}

#[tauri::command]
pub fn delete_proposal(state: State<'_, AppState>, id: String) -> AppResult<()> {
    let _w = state.write_lock.lock().unwrap();
    state.with_paths(|p| crate::storage::proposals::delete(p, &id))
}

#[tauri::command]
pub fn open_attachment(
    state: State<'_, AppState>,
    rel_path: String,
) -> AppResult<()> {
    state.with_paths(|paths| {
        let full = paths.root().join(&rel_path);
        if !full.exists() {
            return Err(AppError::NotFound {
                entity: "file".into(),
                id: rel_path.clone(),
            });
        }
        #[cfg(target_os = "windows")]
        {
            std::process::Command::new("cmd")
                .args(["/C", "start", "", full.to_string_lossy().as_ref()])
                .spawn()
                .map_err(|e| AppError::Io { message: e.to_string() })?;
        }
        #[cfg(not(target_os = "windows"))]
        {
            std::process::Command::new("xdg-open")
                .arg(full.as_os_str())
                .spawn()
                .map_err(|e| AppError::Io { message: e.to_string() })?;
        }
        Ok(())
    })
}

#[tauri::command]
pub fn upload_attachment(
    state: State<'_, AppState>,
    proposal_id: String,
    interaction_id: String,
    source_path: String,
) -> AppResult<String> {
    let _w = state.write_lock.lock().unwrap();
    state.with_paths(|paths| {
        let proposal = crate::storage::proposals::get(paths, &proposal_id)?;
        let source = std::path::PathBuf::from(&source_path);
        if !source.exists() {
            return Err(AppError::NotFound {
                entity: "file".into(),
                id: source_path.clone(),
            });
        }
        let filename = source.file_name()
            .ok_or_else(|| AppError::Validation {
                field: "source_path".into(),
                message: "Geçersiz dosya yolu".into(),
            })?
            .to_string_lossy()
            .to_string();
        let dest_dir = paths
            .attachments_dir(&proposal.customer_id)
            .join(&interaction_id);
        std::fs::create_dir_all(&dest_dir)?;
        let dest = dest_dir.join(&filename);
        std::fs::copy(&source, &dest)?;
        let rel = format!(
            "customers/{}/attachments/{}/{}",
            proposal.customer_id, interaction_id, filename
        );
        Ok(rel)
    })
}
