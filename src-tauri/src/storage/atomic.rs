use crate::error::{AppError, AppResult};
use serde::Serialize;
use std::fs;
use std::io::Write;
use std::path::Path;

pub fn atomic_write_json<T: Serialize>(path: &Path, value: &T) -> AppResult<()> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)?;
    }
    let tmp = path.with_extension("json.tmp");
    {
        let mut file = fs::File::create(&tmp)?;
        let data = serde_json::to_vec_pretty(value)
            .map_err(|e| AppError::Io { message: e.to_string() })?;
        file.write_all(&data)?;
        file.sync_all()?;
    }
    fs::rename(&tmp, path)?;
    Ok(())
}

pub fn read_json<T: for<'de> serde::Deserialize<'de>>(path: &Path) -> AppResult<T> {
    let bytes = fs::read(path)
        .map_err(|e| AppError::Io { message: format!("{}: {}", path.display(), e) })?;
    serde_json::from_slice(&bytes).map_err(|e| AppError::Corrupt {
        path: path.display().to_string(),
        reason: e.to_string(),
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[test]
    fn write_then_read_roundtrip() {
        let dir = tempdir().unwrap();
        let path = dir.path().join("sub").join("data.json");
        let value = serde_json::json!({"a": 1, "b": "hello"});
        atomic_write_json(&path, &value).unwrap();
        let back: serde_json::Value = read_json(&path).unwrap();
        assert_eq!(back["a"], 1);
    }

    #[test]
    fn no_tmp_file_left_behind() {
        let dir = tempdir().unwrap();
        let path = dir.path().join("data.json");
        atomic_write_json(&path, &serde_json::json!({"k": 1})).unwrap();
        let tmp = path.with_extension("json.tmp");
        assert!(!tmp.exists());
    }
}
