use crate::storage::paths::DataPaths;
use std::sync::Mutex;

pub struct AppState {
    pub paths: Mutex<DataPaths>,
    pub write_lock: Mutex<()>,
}

impl AppState {
    pub fn new(paths: DataPaths) -> Self {
        Self {
            paths: Mutex::new(paths),
            write_lock: Mutex::new(()),
        }
    }

    pub fn with_paths<R>(&self, f: impl FnOnce(&DataPaths) -> R) -> R {
        let guard = self.paths.lock().unwrap();
        f(&*guard)
    }
}
