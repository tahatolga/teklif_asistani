use crate::error::AppResult;
use crate::models::settings::Settings;
use crate::storage::atomic::{atomic_write_json, read_json};
use crate::storage::paths::DataPaths;

pub fn load(paths: &DataPaths) -> AppResult<Settings> {
    let p = paths.settings_json();
    if !p.exists() {
        let mut s = Settings::default();
        s.data_dir = paths.root().display().to_string();
        atomic_write_json(&p, &s)?;
        return Ok(s);
    }
    read_json(&p)
}

pub fn save(paths: &DataPaths, s: &Settings) -> AppResult<()> {
    atomic_write_json(&paths.settings_json(), s)
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[test]
    fn load_creates_default_when_missing() {
        let dir = tempdir().unwrap();
        let paths = DataPaths::new(dir.path());
        let s = load(&paths).unwrap();
        assert!(s.auto_update_enabled);
        assert_eq!(s.default_currency, "TRY");
        assert!(paths.settings_json().exists());
    }
}
