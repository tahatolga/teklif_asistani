use crate::error::{AppError, AppResult};
use crate::models::customer::Customer;
use crate::models::parameter::{ParameterCatalog, ParameterSnapshot};
use crate::models::proposal::{
    Proposal, ProposalFilter, ProposalInput, ProposalStatus, ProposalSummary,
};
use crate::storage::atomic::{atomic_write_json, read_json};
use crate::storage::paths::DataPaths;
use crate::storage::slug::slugify;
use crate::validation::parameters::validate_custom_fields;
use chrono::Datelike;
use serde_json::Value;
use std::collections::HashMap;
use walkdir::WalkDir;

fn next_sequence(dir: &std::path::Path, date: chrono::NaiveDate) -> u32 {
    let prefix = date.format("%Y-%m-%d").to_string();
    let mut max = 0u32;
    if !dir.exists() { return 1; }
    for entry in std::fs::read_dir(dir).into_iter().flatten().flatten() {
        let name = entry.file_name().to_string_lossy().to_string();
        if let Some(rest) = name.strip_prefix(&format!("{}-", prefix)) {
            if let Some((seq, _)) = rest.split_once('-') {
                if let Ok(n) = seq.parse::<u32>() {
                    max = max.max(n);
                }
            }
        }
    }
    max + 1
}

fn build_filename(proposal: &Proposal) -> String {
    let date = proposal.created_at.date_naive();
    let seq_str = format!("{:03}", extract_seq(&proposal.id).unwrap_or(1));
    let title_slug = slugify(&proposal.title);
    let slug = if title_slug.is_empty() { "teklif".into() } else { title_slug };
    format!("{}-{}-{}.json", date.format("%Y-%m-%d"), seq_str, slug)
}

fn extract_seq(id: &str) -> Option<u32> {
    id.rsplit('-').next().and_then(|s| s.parse().ok())
}

pub fn create(
    paths: &DataPaths,
    catalog: &ParameterCatalog,
    input: ProposalInput,
) -> AppResult<Proposal> {
    if input.title.trim().is_empty() {
        return Err(AppError::Validation {
            field: "title".into(), message: "Başlık gerekli".into(),
        });
    }
    let _customer: Customer = crate::storage::customers::get(paths, &input.customer_id)?;
    validate_custom_fields(catalog, &input.custom_fields)?;

    let now = chrono::Utc::now();
    let date = now.date_naive();
    let proposals_dir = paths.proposals_dir(&input.customer_id);
    std::fs::create_dir_all(&proposals_dir)?;
    let seq = next_sequence(&proposals_dir, date);
    let id = format!(
        "prop-{}{:02}{:02}-{:03}",
        date.year(), date.month(), date.day(), seq
    );

    let snapshot: Vec<ParameterSnapshot> = catalog.parameters.iter().map(Into::into).collect();

    let proposal = Proposal {
        id: id.clone(),
        schema_version: 1,
        customer_id: input.customer_id,
        title: input.title,
        status: input.status,
        created_at: now,
        updated_at: now,
        total_amount: input.total_amount,
        currency: input.currency,
        notes: input.notes,
        custom_fields: input.custom_fields,
        parameter_snapshot: snapshot,
    };
    let filename = build_filename(&proposal);
    let path = proposals_dir.join(filename);
    atomic_write_json(&path, &proposal)?;
    Ok(proposal)
}

pub fn get(paths: &DataPaths, id: &str) -> AppResult<Proposal> {
    let (_, path) = find_proposal_path(paths, id)?;
    read_json(&path)
}

pub fn update(
    paths: &DataPaths,
    catalog: &ParameterCatalog,
    id: &str,
    input: ProposalInput,
) -> AppResult<Proposal> {
    validate_custom_fields(catalog, &input.custom_fields)?;
    let mut existing = get(paths, id)?;
    let old_filename = build_filename(&existing);
    existing.customer_id = input.customer_id;
    existing.title = input.title;
    existing.status = input.status;
    existing.total_amount = input.total_amount;
    existing.currency = input.currency;
    existing.notes = input.notes;
    existing.custom_fields = input.custom_fields;
    existing.updated_at = chrono::Utc::now();

    let proposals_dir = paths.proposals_dir(&existing.customer_id);
    std::fs::create_dir_all(&proposals_dir)?;
    let new_filename = build_filename(&existing);
    let new_path = proposals_dir.join(&new_filename);
    atomic_write_json(&new_path, &existing)?;
    if new_filename != old_filename {
        let _ = std::fs::remove_file(proposals_dir.join(old_filename));
    }
    Ok(existing)
}

pub fn delete(paths: &DataPaths, id: &str) -> AppResult<()> {
    let (_, path) = find_proposal_path(paths, id)?;
    std::fs::remove_file(path)?;
    Ok(())
}

pub fn list(paths: &DataPaths, filter: &ProposalFilter) -> AppResult<Vec<ProposalSummary>> {
    let customers_dir = paths.customers_dir();
    if !customers_dir.exists() { return Ok(Vec::new()); }
    let mut customer_names: HashMap<String, String> = HashMap::new();
    for entry in std::fs::read_dir(&customers_dir)? {
        let entry = entry?;
        if !entry.file_type()?.is_dir() { continue; }
        let id = entry.file_name().to_string_lossy().to_string();
        if let Ok(c) = crate::storage::customers::get(paths, &id) {
            customer_names.insert(id, c.name);
        }
    }

    let mut out = Vec::new();
    for (cid, cname) in &customer_names {
        if let Some(only) = &filter.customer_id {
            if only != cid { continue; }
        }
        let dir = paths.proposals_dir(cid);
        if !dir.exists() { continue; }
        for entry in WalkDir::new(&dir).min_depth(1).max_depth(1) {
            let Ok(entry) = entry else { continue };
            if !entry.path().extension().map(|x| x == "json").unwrap_or(false) { continue; }
            let p: Proposal = match read_json(entry.path()) {
                Ok(p) => p,
                Err(_) => continue,
            };
            if let Some(status) = &filter.status {
                if &p.status != status { continue; }
            }
            if let Some(from) = filter.date_from {
                if p.created_at < from { continue; }
            }
            if let Some(to) = filter.date_to {
                if p.created_at > to { continue; }
            }
            if let Some(q) = &filter.search {
                let needle = q.to_lowercase();
                let hay = format!("{} {}", p.title, p.notes).to_lowercase();
                if !hay.contains(&needle) { continue; }
            }
            out.push(ProposalSummary {
                id: p.id,
                customer_id: p.customer_id,
                customer_name: cname.clone(),
                title: p.title,
                status: p.status,
                total_amount: p.total_amount,
                currency: p.currency,
                created_at: p.created_at,
            });
        }
    }
    out.sort_by(|a, b| b.created_at.cmp(&a.created_at));
    Ok(out)
}

pub fn field_history(
    paths: &DataPaths,
    key: &str,
    limit: usize,
) -> AppResult<Vec<(Value, u32, chrono::DateTime<chrono::Utc>)>> {
    let customers_dir = paths.customers_dir();
    if !customers_dir.exists() { return Ok(Vec::new()); }
    let mut freq: HashMap<String, (Value, u32, chrono::DateTime<chrono::Utc>)> = HashMap::new();
    for entry in WalkDir::new(&customers_dir) {
        let Ok(entry) = entry else { continue };
        if !entry.path().extension().map(|x| x == "json").unwrap_or(false) { continue; }
        if entry.path().file_name().map(|n| n == "customer.json").unwrap_or(false) { continue; }
        let Ok(p): Result<Proposal, _> = read_json(entry.path()) else { continue };
        if let Some(v) = p.custom_fields.get(key) {
            if v.is_null() { continue; }
            let k = v.to_string();
            freq.entry(k)
                .and_modify(|(_, c, t)| { *c += 1; *t = (*t).max(p.updated_at); })
                .or_insert((v.clone(), 1, p.updated_at));
        }
    }
    let mut entries: Vec<_> = freq.into_values().collect();
    entries.sort_by(|a, b| b.1.cmp(&a.1).then(b.2.cmp(&a.2)));
    entries.truncate(limit);
    Ok(entries)
}

pub fn prefill_values(
    paths: &DataPaths,
    customer_id: Option<&str>,
) -> AppResult<HashMap<String, Value>> {
    let filter = ProposalFilter {
        customer_id: customer_id.map(String::from),
        ..Default::default()
    };
    let mut candidates = list(paths, &filter)?;
    if candidates.is_empty() && customer_id.is_some() {
        candidates = list(paths, &ProposalFilter::default())?;
    }
    let Some(first) = candidates.first() else {
        return Ok(HashMap::new());
    };
    let proposal = get(paths, &first.id)?;
    Ok(proposal.custom_fields)
}

fn find_proposal_path(paths: &DataPaths, id: &str) -> AppResult<(String, std::path::PathBuf)> {
    let customers_dir = paths.customers_dir();
    for entry in WalkDir::new(&customers_dir) {
        let Ok(entry) = entry else { continue };
        if !entry.path().extension().map(|x| x == "json").unwrap_or(false) { continue; }
        if entry.path().file_name().map(|n| n == "customer.json").unwrap_or(false) { continue; }
        let p: Proposal = match read_json(entry.path()) {
            Ok(p) => p,
            Err(_) => continue,
        };
        if p.id == id {
            return Ok((p.customer_id, entry.path().to_path_buf()));
        }
    }
    Err(AppError::NotFound { entity: "proposal".into(), id: id.into() })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::customer::CustomerInput;
    use crate::models::parameter::{Parameter, ParameterType};
    use serde_json::json;

    fn setup() -> (tempfile::TempDir, DataPaths, ParameterCatalog, String) {
        let dir = tempfile::tempdir().unwrap();
        let paths = DataPaths::new(dir.path());
        let c = crate::storage::customers::create(&paths, CustomerInput {
            name: "ACME".into(), contact_person: String::new(), email: String::new(),
            phone: String::new(), address: String::new(), tax_office: String::new(),
            tax_no: String::new(), notes: String::new(),
        }).unwrap();
        let mut cat = ParameterCatalog::empty();
        cat.parameters.push(Parameter {
            key: "adet".into(), label: "Adet".into(), description: String::new(),
            parameter_type: ParameterType::Number, options: vec![], unit: Some("adet".into()),
            min: Some(1.0), max: Some(1000.0), max_length: None, required: true, order: 1,
        });
        (dir, paths, cat, c.id)
    }

    fn input(customer_id: &str, title: &str, adet: i64) -> ProposalInput {
        let mut cf = HashMap::new();
        cf.insert("adet".into(), json!(adet));
        ProposalInput {
            customer_id: customer_id.into(),
            title: title.into(),
            status: ProposalStatus::Taslak,
            total_amount: 1000.0,
            currency: "TRY".into(),
            notes: String::new(),
            custom_fields: cf,
        }
    }

    #[test]
    fn create_list_delete() {
        let (_d, paths, cat, cid) = setup();
        let p = create(&paths, &cat, input(&cid, "Flanş", 10)).unwrap();
        let listed = list(&paths, &ProposalFilter::default()).unwrap();
        assert_eq!(listed.len(), 1);
        delete(&paths, &p.id).unwrap();
        assert_eq!(list(&paths, &ProposalFilter::default()).unwrap().len(), 0);
    }

    #[test]
    fn filter_by_search() {
        let (_d, paths, cat, cid) = setup();
        create(&paths, &cat, input(&cid, "Flanş büyük", 10)).unwrap();
        create(&paths, &cat, input(&cid, "Mil küçük", 5)).unwrap();
        let filter = ProposalFilter { search: Some("flan".into()), ..Default::default() };
        let out = list(&paths, &filter).unwrap();
        assert_eq!(out.len(), 1);
        assert!(out[0].title.contains("Flanş"));
    }

    #[test]
    fn field_history_counts() {
        let (_d, paths, cat, cid) = setup();
        create(&paths, &cat, input(&cid, "A", 10)).unwrap();
        create(&paths, &cat, input(&cid, "B", 10)).unwrap();
        create(&paths, &cat, input(&cid, "C", 5)).unwrap();
        let h = field_history(&paths, "adet", 10).unwrap();
        assert_eq!(h[0].1, 2);
        assert_eq!(h[0].0, json!(10));
    }

    #[test]
    fn prefill_uses_customer_last() {
        let (_d, paths, cat, cid) = setup();
        create(&paths, &cat, input(&cid, "A", 7)).unwrap();
        std::thread::sleep(std::time::Duration::from_millis(10));
        create(&paths, &cat, input(&cid, "B", 42)).unwrap();
        let pre = prefill_values(&paths, Some(&cid)).unwrap();
        assert_eq!(pre.get("adet"), Some(&json!(42)));
    }
}
