use crate::error::{AppError, AppResult};
use crate::models::settings::{BackupEntry, RestoreMode};
use crate::storage::paths::DataPaths;
use std::fs::File;
use std::io::{Read, Write};
use std::path::Path;
use walkdir::WalkDir;
use zip::write::FileOptions;

pub fn create(paths: &DataPaths) -> AppResult<BackupEntry> {
    std::fs::create_dir_all(paths.backups_dir())?;
    let ts = chrono::Local::now().format("%Y-%m-%d-%H%M%S").to_string();
    let name = format!("backup-{}.zip", ts);
    let zip_path = paths.backups_dir().join(&name);
    let file = File::create(&zip_path)?;
    let mut zip = zip::ZipWriter::new(file);
    let options: FileOptions = FileOptions::default()
        .compression_method(zip::CompressionMethod::Deflated);

    let targets = [
        ("parameters.json", paths.parameters_json()),
        ("settings.json", paths.settings_json()),
        ("app.json", paths.app_json()),
    ];
    for (entry_name, path) in &targets {
        if path.exists() {
            zip.start_file(*entry_name, options).map_err(zip_err)?;
            let mut buf = Vec::new();
            File::open(path)?.read_to_end(&mut buf)?;
            zip.write_all(&buf)?;
        }
    }

    let customers_dir = paths.customers_dir();
    if customers_dir.exists() {
        for entry in WalkDir::new(&customers_dir) {
            let entry = entry.map_err(|e| AppError::Io { message: e.to_string() })?;
            let path = entry.path();
            let rel = path.strip_prefix(paths.root()).unwrap()
                .to_string_lossy().replace('\\', "/");
            if entry.file_type().is_dir() {
                if rel.is_empty() { continue; }
                zip.add_directory(format!("{}/", rel), options).map_err(zip_err)?;
            } else if entry.file_type().is_file() {
                zip.start_file(rel, options).map_err(zip_err)?;
                let mut buf = Vec::new();
                File::open(path)?.read_to_end(&mut buf)?;
                zip.write_all(&buf)?;
            }
        }
    }

    zip.finish().map_err(zip_err)?;
    let meta = std::fs::metadata(&zip_path)?;
    Ok(BackupEntry {
        name,
        path: zip_path.display().to_string(),
        size_bytes: meta.len(),
        created_at: chrono::Utc::now(),
    })
}

pub fn list(paths: &DataPaths) -> AppResult<Vec<BackupEntry>> {
    let dir = paths.backups_dir();
    if !dir.exists() { return Ok(Vec::new()); }
    let mut out = Vec::new();
    for entry in std::fs::read_dir(&dir)? {
        let entry = entry?;
        let path = entry.path();
        if path.extension().map(|x| x != "zip").unwrap_or(true) { continue; }
        let meta = entry.metadata()?;
        let created: chrono::DateTime<chrono::Utc> = meta.created()
            .or_else(|_| meta.modified())
            .map(Into::into)
            .unwrap_or_else(|_| chrono::Utc::now());
        out.push(BackupEntry {
            name: entry.file_name().to_string_lossy().into(),
            path: path.display().to_string(),
            size_bytes: meta.len(),
            created_at: created,
        });
    }
    out.sort_by(|a, b| b.created_at.cmp(&a.created_at));
    Ok(out)
}

pub fn delete(paths: &DataPaths, name: &str) -> AppResult<()> {
    let p = paths.backups_dir().join(name);
    if !p.exists() {
        return Err(AppError::NotFound { entity: "backup".into(), id: name.into() });
    }
    std::fs::remove_file(p)?;
    Ok(())
}

pub fn restore(paths: &DataPaths, zip_path: &Path, mode: RestoreMode) -> AppResult<()> {
    if !zip_path.exists() {
        return Err(AppError::NotFound { entity: "backup".into(), id: zip_path.display().to_string() });
    }
    if mode == RestoreMode::Replace {
        let ts = chrono::Local::now().format("%Y-%m-%d-%H%M%S").to_string();
        let backup_current = paths.root().with_file_name(format!(
            "{}.backup-{}",
            paths.root().file_name().unwrap().to_string_lossy(),
            ts
        ));
        if paths.root().exists() {
            std::fs::rename(paths.root(), &backup_current)?;
        }
        std::fs::create_dir_all(paths.root())?;
    }
    let file = File::open(zip_path)?;
    let mut archive = zip::ZipArchive::new(file).map_err(zip_err)?;
    for i in 0..archive.len() {
        let mut zf = archive.by_index(i).map_err(zip_err)?;
        let rel = zf.enclosed_name()
            .ok_or_else(|| AppError::Corrupt {
                path: zip_path.display().to_string(),
                reason: "unsafe zip path".into(),
            })?
            .to_path_buf();
        let out_path = paths.root().join(&rel);
        if zf.is_dir() {
            std::fs::create_dir_all(&out_path)?;
            continue;
        }
        if mode == RestoreMode::Merge && out_path.exists() { continue; }
        if let Some(p) = out_path.parent() { std::fs::create_dir_all(p)?; }
        let mut out_file = File::create(&out_path)?;
        std::io::copy(&mut zf, &mut out_file)?;
    }
    Ok(())
}

fn zip_err(e: zip::result::ZipError) -> AppError {
    AppError::Io { message: e.to_string() }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::customer::CustomerInput;
    use tempfile::tempdir;

    #[test]
    fn create_and_list_backup() {
        let dir = tempdir().unwrap();
        let paths = DataPaths::new(dir.path());
        paths.ensure_structure().unwrap();
        crate::storage::customers::create(&paths, CustomerInput {
            name: "A".into(), contact_person: String::new(), email: String::new(),
            phone: String::new(), address: String::new(), tax_office: String::new(),
            tax_no: String::new(), notes: String::new(),
        }).unwrap();
        let entry = create(&paths).unwrap();
        assert!(entry.size_bytes > 0);
        assert_eq!(list(&paths).unwrap().len(), 1);
    }

    #[test]
    fn restore_merge_preserves_existing() {
        let dir = tempdir().unwrap();
        let paths = DataPaths::new(dir.path());
        paths.ensure_structure().unwrap();
        crate::storage::customers::create(&paths, CustomerInput {
            name: "Original".into(), contact_person: String::new(), email: String::new(),
            phone: String::new(), address: String::new(), tax_office: String::new(),
            tax_no: String::new(), notes: String::new(),
        }).unwrap();
        let backup = create(&paths).unwrap();
        crate::storage::customers::create(&paths, CustomerInput {
            name: "Newer".into(), contact_person: String::new(), email: String::new(),
            phone: String::new(), address: String::new(), tax_office: String::new(),
            tax_no: String::new(), notes: String::new(),
        }).unwrap();
        restore(&paths, std::path::Path::new(&backup.path), RestoreMode::Merge).unwrap();
        let list = crate::storage::customers::list(&paths).unwrap();
        assert_eq!(list.len(), 2);
    }
}
