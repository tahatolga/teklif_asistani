use crate::error::AppResult;
use crate::models::customer::{Customer, CustomerInput, CustomerSummary};
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub fn list_customers(state: State<'_, AppState>) -> AppResult<Vec<CustomerSummary>> {
    state.with_paths(|p| crate::storage::customers::list(p))
}

#[tauri::command]
pub fn get_customer(state: State<'_, AppState>, id: String) -> AppResult<Customer> {
    state.with_paths(|p| crate::storage::customers::get(p, &id))
}

#[tauri::command]
pub fn create_customer(state: State<'_, AppState>, input: CustomerInput) -> AppResult<Customer> {
    let _w = state.write_lock.lock().unwrap();
    state.with_paths(|p| crate::storage::customers::create(p, input))
}

#[tauri::command]
pub fn update_customer(
    state: State<'_, AppState>,
    id: String,
    input: CustomerInput,
) -> AppResult<Customer> {
    let _w = state.write_lock.lock().unwrap();
    state.with_paths(|p| crate::storage::customers::update(p, &id, input))
}

#[tauri::command]
pub fn delete_customer(state: State<'_, AppState>, id: String) -> AppResult<()> {
    let _w = state.write_lock.lock().unwrap();
    state.with_paths(|p| crate::storage::customers::delete(p, &id))
}
