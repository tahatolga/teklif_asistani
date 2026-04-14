pub mod error;
pub mod models;
pub mod storage;
pub mod validation;
pub mod state;
pub mod commands;

use state::AppState;
use storage::paths::DataPaths;

fn default_data_dir() -> std::path::PathBuf {
    dirs::data_dir()
        .unwrap_or_else(|| std::env::current_dir().unwrap())
        .join("FiksturTeklifAsistani")
        .join("data")
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let data_dir = default_data_dir();
    let paths = DataPaths::new(data_dir);
    let _ = paths.ensure_structure();
    let state = AppState::new(paths);

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .manage(state)
        .invoke_handler(tauri::generate_handler![
            commands::customers::list_customers,
            commands::customers::get_customer,
            commands::customers::create_customer,
            commands::customers::update_customer,
            commands::customers::delete_customer,
            commands::parameters::get_parameters,
            commands::parameters::upsert_parameter,
            commands::parameters::delete_parameter,
            commands::parameters::reorder_parameters,
            commands::proposals::list_proposals,
            commands::proposals::get_proposal,
            commands::proposals::create_proposal,
            commands::proposals::update_proposal,
            commands::proposals::delete_proposal,
            commands::proposals::get_field_history,
            commands::proposals::get_prefill_values,
            commands::backup::create_backup,
            commands::backup::list_backups,
            commands::backup::delete_backup,
            commands::backup::restore_backup,
            commands::settings::get_settings,
            commands::settings::update_settings,
            commands::settings::init_data_dir,
            commands::settings::get_app_info,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
