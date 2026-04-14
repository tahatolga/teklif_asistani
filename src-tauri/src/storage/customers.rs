use crate::error::{AppError, AppResult};
use crate::models::customer::{Customer, CustomerInput, CustomerSummary};
use crate::storage::atomic::{atomic_write_json, read_json};
use crate::storage::paths::DataPaths;
use crate::storage::slug::{slugify, unique_slug};
use walkdir::WalkDir;

pub fn create(paths: &DataPaths, input: CustomerInput) -> AppResult<Customer> {
    if input.name.trim().is_empty() {
        return Err(AppError::Validation {
            field: "name".into(),
            message: "Firma adı gerekli".into(),
        });
    }
    if name_exists(paths, &input.name, None)? {
        return Err(AppError::Conflict {
            message: "Bu firma adıyla kayıtlı bir müşteri zaten var".into(),
        });
    }
    std::fs::create_dir_all(paths.customers_dir())?;
    let base = slugify(&input.name);
    let id = unique_slug(&base, &paths.customers_dir());
    let now = chrono::Utc::now();
    let customer = Customer {
        id: id.clone(),
        schema_version: 1,
        name: input.name,
        contact_person: input.contact_person,
        email: input.email,
        phone: input.phone,
        address: input.address,
        tax_office: input.tax_office,
        tax_no: input.tax_no,
        notes: input.notes,
        created_at: now,
        updated_at: now,
    };
    std::fs::create_dir_all(paths.proposals_dir(&id))?;
    std::fs::create_dir_all(paths.attachments_dir(&id))?;
    atomic_write_json(&paths.customer_json(&id), &customer)?;
    Ok(customer)
}

pub fn get(paths: &DataPaths, id: &str) -> AppResult<Customer> {
    let path = paths.customer_json(id);
    if !path.exists() {
        return Err(AppError::NotFound { entity: "customer".into(), id: id.into() });
    }
    read_json(&path)
}

pub fn update(paths: &DataPaths, id: &str, input: CustomerInput) -> AppResult<Customer> {
    let mut existing = get(paths, id)?;
    if input.name.trim().is_empty() {
        return Err(AppError::Validation {
            field: "name".into(),
            message: "Firma adı gerekli".into(),
        });
    }
    if name_exists(paths, &input.name, Some(id))? {
        return Err(AppError::Conflict {
            message: "Bu firma adıyla kayıtlı başka bir müşteri var".into(),
        });
    }
    existing.name = input.name;
    existing.contact_person = input.contact_person;
    existing.email = input.email;
    existing.phone = input.phone;
    existing.address = input.address;
    existing.tax_office = input.tax_office;
    existing.tax_no = input.tax_no;
    existing.notes = input.notes;
    existing.updated_at = chrono::Utc::now();
    atomic_write_json(&paths.customer_json(id), &existing)?;
    Ok(existing)
}

pub fn delete(paths: &DataPaths, id: &str) -> AppResult<()> {
    let proposals_dir = paths.proposals_dir(id);
    if proposals_dir.exists() {
        let has_proposals = std::fs::read_dir(&proposals_dir)?
            .filter_map(|e| e.ok())
            .any(|e| e.path().extension().map(|x| x == "json").unwrap_or(false));
        if has_proposals {
            return Err(AppError::Conflict {
                message: "Müşterinin teklifleri var, önce silin".into(),
            });
        }
    }
    std::fs::remove_dir_all(paths.customer_dir(id))?;
    Ok(())
}

pub fn list(paths: &DataPaths) -> AppResult<Vec<CustomerSummary>> {
    let dir = paths.customers_dir();
    if !dir.exists() { return Ok(Vec::new()); }
    let mut out = Vec::new();
    for entry in std::fs::read_dir(&dir)? {
        let entry = entry?;
        if !entry.file_type()?.is_dir() { continue; }
        let id = entry.file_name().to_string_lossy().to_string();
        let cj = paths.customer_json(&id);
        if !cj.exists() { continue; }
        let customer: Customer = read_json(&cj)?;
        let (count, last) = proposal_stats(paths, &id);
        out.push(CustomerSummary {
            id: customer.id,
            name: customer.name,
            contact_person: customer.contact_person,
            phone: customer.phone,
            proposal_count: count,
            last_activity: last,
        });
    }
    out.sort_by(|a, b| a.name.cmp(&b.name));
    Ok(out)
}

fn name_exists(paths: &DataPaths, name: &str, exclude_id: Option<&str>) -> AppResult<bool> {
    let dir = paths.customers_dir();
    if !dir.exists() { return Ok(false); }
    let target = name.trim().to_lowercase();
    for entry in std::fs::read_dir(&dir)? {
        let entry = entry?;
        if !entry.file_type()?.is_dir() { continue; }
        let id = entry.file_name().to_string_lossy().to_string();
        if exclude_id.map_or(false, |x| x == id) { continue; }
        let cj = paths.customer_json(&id);
        if !cj.exists() { continue; }
        let customer: Customer = read_json(&cj)?;
        if customer.name.trim().to_lowercase() == target {
            return Ok(true);
        }
    }
    Ok(false)
}

fn proposal_stats(paths: &DataPaths, customer_id: &str) -> (u32, Option<chrono::DateTime<chrono::Utc>>) {
    let dir = paths.proposals_dir(customer_id);
    if !dir.exists() { return (0, None); }
    let mut count = 0u32;
    let mut latest: Option<chrono::DateTime<chrono::Utc>> = None;
    for entry in WalkDir::new(&dir).min_depth(1).max_depth(1) {
        let Ok(entry) = entry else { continue };
        if entry.path().extension().map(|x| x == "json").unwrap_or(false) {
            count += 1;
            if let Ok(meta) = entry.metadata() {
                if let Ok(modified) = meta.modified() {
                    let dt: chrono::DateTime<chrono::Utc> = modified.into();
                    latest = Some(latest.map_or(dt, |l| l.max(dt)));
                }
            }
        }
    }
    (count, latest)
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    fn input(name: &str) -> CustomerInput {
        CustomerInput {
            name: name.into(),
            contact_person: String::new(), email: String::new(),
            phone: String::new(), address: String::new(),
            tax_office: String::new(), tax_no: String::new(), notes: String::new(),
        }
    }

    #[test]
    fn create_and_list() {
        let dir = tempdir().unwrap();
        let paths = DataPaths::new(dir.path());
        let c1 = create(&paths, input("ACME Makina A.Ş.")).unwrap();
        assert_eq!(c1.id, "acme-makina-a-s");
        let list = list(&paths).unwrap();
        assert_eq!(list.len(), 1);
        assert_eq!(list[0].proposal_count, 0);
    }

    #[test]
    fn delete_blocks_when_proposals_exist() {
        let dir = tempdir().unwrap();
        let paths = DataPaths::new(dir.path());
        let c = create(&paths, input("Beta")).unwrap();
        let proposal_file = paths.proposals_dir(&c.id).join("2026-04-13-001-x.json");
        std::fs::write(&proposal_file, "{}").unwrap();
        let err = delete(&paths, &c.id).unwrap_err();
        assert!(matches!(err, AppError::Conflict { .. }));
    }

    #[test]
    fn create_dedupes_slug_on_distinct_names() {
        let dir = tempdir().unwrap();
        let paths = DataPaths::new(dir.path());
        let a = create(&paths, input("ACME")).unwrap();
        let b = create(&paths, input("acme ")).unwrap_err();
        assert_eq!(a.id, "acme");
        assert!(matches!(b, AppError::Conflict { .. }));
        let c = create(&paths, input("ACME Ltd")).unwrap();
        assert_eq!(c.id, "acme-ltd");
    }

    #[test]
    fn update_blocks_duplicate_name() {
        let dir = tempdir().unwrap();
        let paths = DataPaths::new(dir.path());
        let a = create(&paths, input("Alpha")).unwrap();
        let b = create(&paths, input("Beta")).unwrap();
        let err = update(&paths, &b.id, input("alpha")).unwrap_err();
        assert!(matches!(err, AppError::Conflict { .. }));
        let ok = update(&paths, &a.id, input("Alpha")).unwrap();
        assert_eq!(ok.name, "Alpha");
    }
}
