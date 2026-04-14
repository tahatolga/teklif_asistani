use crate::error::{AppError, AppResult};
use crate::models::customer::Customer;
use crate::models::parameter::{Parameter, ParameterType};
use crate::models::proposal::{
    Proposal, ProposalFilter, ProposalInput, ProposalSummary,
};
use crate::storage::atomic::{atomic_write_json, read_json};
use crate::storage::paths::DataPaths;
use crate::storage::slug::slugify;
use chrono::Datelike;
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

fn build_filename(proposal: &Proposal, seq: u32) -> String {
    let date = proposal.created_at.date_naive();
    let title_slug = slugify(&proposal.title);
    let slug = if title_slug.is_empty() { "teklif".into() } else { title_slug };
    format!("{}-{:03}-{}.json", date.format("%Y-%m-%d"), seq, slug)
}

fn extract_seq_from_filename(path: &std::path::Path) -> u32 {
    let name = path.file_name().and_then(|n| n.to_str()).unwrap_or("");
    let parts: Vec<&str> = name.splitn(4, '-').collect();
    if parts.len() >= 4 {
        parts[3].split_once('-').and_then(|(s, _)| s.parse().ok()).unwrap_or(1)
    } else { 1 }
}

fn titlecase(key: &str) -> String {
    let mut out = String::with_capacity(key.len());
    let mut capitalize = true;
    for ch in key.chars() {
        if ch == '_' || ch == '-' {
            out.push(' ');
            capitalize = true;
        } else if capitalize {
            out.extend(ch.to_uppercase());
            capitalize = false;
        } else {
            out.push(ch);
        }
    }
    out
}

/// Ensure every row key in the input exists in the catalog. Appends missing
/// ones as plain Text parameters and persists the updated catalog.
fn sweep_new_keys(paths: &DataPaths, input: &ProposalInput) -> AppResult<()> {
    let mut cat = crate::storage::parameters::load(paths)?;
    let mut changed = false;
    let next_order = cat.parameters.iter().map(|p| p.order).max().unwrap_or(0) + 1;
    let mut offset = 0u32;
    for interaction in &input.interactions {
        for row in &interaction.rows {
            let key = row.key.trim();
            if key.is_empty() { continue; }
            if cat.parameters.iter().any(|p| p.key == key) { continue; }
            cat.parameters.push(Parameter {
                key: key.to_string(),
                label: titlecase(key),
                description: String::new(),
                parameter_type: ParameterType::Text,
                options: vec![],
                unit: None,
                min: None,
                max: None,
                max_length: None,
                required: false,
                order: next_order + offset,
            });
            offset += 1;
            changed = true;
        }
    }
    if changed {
        cat.updated_at = chrono::Utc::now();
        crate::storage::parameters::save(paths, &cat)?;
    }
    Ok(())
}

pub fn create(paths: &DataPaths, input: ProposalInput) -> AppResult<Proposal> {
    if input.title.trim().is_empty() {
        return Err(AppError::Validation {
            field: "title".into(), message: "Başlık gerekli".into(),
        });
    }
    let _customer: Customer = crate::storage::customers::get(paths, &input.customer_id)?;
    sweep_new_keys(paths, &input)?;

    let now = chrono::Utc::now();
    let date = now.date_naive();
    let proposals_dir = paths.proposals_dir(&input.customer_id);
    std::fs::create_dir_all(&proposals_dir)?;
    let seq = next_sequence(&proposals_dir, date);
    let id = format!(
        "prop-{}{:02}{:02}-{:03}",
        date.year(), date.month(), date.day(), seq
    );

    let proposal = Proposal {
        id,
        schema_version: 2,
        customer_id: input.customer_id,
        title: input.title,
        notes: input.notes,
        created_at: now,
        updated_at: now,
        interactions: input.interactions,
        cost_lines: input.cost_lines,
    };
    let filename = build_filename(&proposal, seq);
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
    id: &str,
    input: ProposalInput,
) -> AppResult<Proposal> {
    if input.title.trim().is_empty() {
        return Err(AppError::Validation {
            field: "title".into(), message: "Başlık gerekli".into(),
        });
    }
    sweep_new_keys(paths, &input)?;

    let (_, old_path) = find_proposal_path(paths, id)?;
    let mut existing: Proposal = read_json(&old_path)?;
    let seq = extract_seq_from_filename(&old_path);

    existing.customer_id = input.customer_id;
    existing.title = input.title;
    existing.notes = input.notes;
    existing.interactions = input.interactions;
    existing.cost_lines = input.cost_lines;
    existing.updated_at = chrono::Utc::now();

    let proposals_dir = paths.proposals_dir(&existing.customer_id);
    std::fs::create_dir_all(&proposals_dir)?;
    let new_filename = build_filename(&existing, seq);
    let new_path = proposals_dir.join(&new_filename);
    atomic_write_json(&new_path, &existing)?;
    if new_path != old_path {
        let _ = std::fs::remove_file(&old_path);
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
    let mut out = Vec::new();
    for entry in std::fs::read_dir(&customers_dir)? {
        let entry = entry?;
        if !entry.file_type()?.is_dir() { continue; }
        let cid = entry.file_name().to_string_lossy().to_string();
        if let Some(only) = &filter.customer_id {
            if only != &cid { continue; }
        }
        let Ok(customer) = crate::storage::customers::get(paths, &cid) else { continue };
        let dir = paths.proposals_dir(&cid);
        if !dir.exists() { continue; }
        for entry in WalkDir::new(&dir).min_depth(1).max_depth(1) {
            let Ok(entry) = entry else { continue };
            if !entry.path().extension().map(|x| x == "json").unwrap_or(false) { continue; }
            let p: Proposal = match read_json(entry.path()) {
                Ok(p) => p,
                Err(_) => continue,
            };
            if let Some(q) = &filter.search {
                let needle = q.to_lowercase();
                let hay = format!("{} {}", p.title, p.notes).to_lowercase();
                if !hay.contains(&needle) { continue; }
            }
            out.push(ProposalSummary {
                id: p.id,
                customer_id: p.customer_id,
                customer_name: customer.name.clone(),
                title: p.title,
                created_at: p.created_at,
                updated_at: p.updated_at,
                interaction_count: p.interactions.len() as u32,
            });
        }
    }
    out.sort_by(|a, b| b.updated_at.cmp(&a.updated_at));
    Ok(out)
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
    use crate::models::proposal::{Interaction, InteractionDirection, InteractionRow};
    use serde_json::json;
    use tempfile::tempdir;
    use uuid::Uuid;

    fn setup() -> (tempfile::TempDir, DataPaths, String) {
        let dir = tempdir().unwrap();
        let paths = DataPaths::new(dir.path());
        let c = crate::storage::customers::create(&paths, CustomerInput {
            name: "ACME".into(), contact_person: String::new(), email: String::new(),
            phone: String::new(), address: String::new(), tax_office: String::new(),
            tax_no: String::new(), notes: String::new(),
        }).unwrap();
        (dir, paths, c.id)
    }

    fn input(customer_id: &str, title: &str) -> ProposalInput {
        ProposalInput {
            customer_id: customer_id.into(),
            title: title.into(),
            notes: String::new(),
            interactions: vec![],
            cost_lines: vec![],
        }
    }

    fn interaction_with(direction: InteractionDirection, rows: Vec<(&str, serde_json::Value)>) -> Interaction {
        Interaction {
            id: Uuid::new_v4().to_string(),
            direction,
            created_at: chrono::Utc::now(),
            rows: rows.into_iter()
                .map(|(k, v)| InteractionRow {
                    key: k.into(),
                    value: v,
                    value_type: Default::default(),
                })
                .collect(),
        }
    }

    #[test]
    fn create_list_delete() {
        let (_d, paths, cid) = setup();
        let p = create(&paths, input(&cid, "Flanş")).unwrap();
        let listed = list(&paths, &ProposalFilter::default()).unwrap();
        assert_eq!(listed.len(), 1);
        assert_eq!(listed[0].interaction_count, 0);
        delete(&paths, &p.id).unwrap();
        assert_eq!(list(&paths, &ProposalFilter::default()).unwrap().len(), 0);
    }

    #[test]
    fn update_replaces_interactions_and_sweeps_new_keys() {
        let (_d, paths, cid) = setup();
        let p = create(&paths, input(&cid, "Flanş")).unwrap();
        let mut inp = input(&cid, "Flanş");
        inp.interactions = vec![
            interaction_with(InteractionDirection::Incoming, vec![
                ("malzeme", json!("Paslanmaz")),
                ("adet", json!(50)),
            ]),
            interaction_with(InteractionDirection::Outgoing, vec![
                ("hedef_fiyat", json!(12500)),
            ]),
        ];
        let updated = update(&paths, &p.id, inp).unwrap();
        assert_eq!(updated.interactions.len(), 2);
        assert_eq!(updated.interactions[0].rows.len(), 2);

        let cat = crate::storage::parameters::load(&paths).unwrap();
        assert!(cat.parameters.iter().any(|p| p.key == "malzeme"));
        assert!(cat.parameters.iter().any(|p| p.key == "adet"));
        assert!(cat.parameters.iter().any(|p| p.key == "hedef_fiyat"));
        let hedef = cat.parameters.iter().find(|p| p.key == "hedef_fiyat").unwrap();
        assert_eq!(hedef.label, "Hedef Fiyat");
    }

    #[test]
    fn filter_by_search() {
        let (_d, paths, cid) = setup();
        create(&paths, input(&cid, "Flanş büyük")).unwrap();
        create(&paths, input(&cid, "Mil küçük")).unwrap();
        let out = list(&paths, &ProposalFilter {
            search: Some("flan".into()), ..Default::default()
        }).unwrap();
        assert_eq!(out.len(), 1);
        assert!(out[0].title.contains("Flanş"));
    }

    #[test]
    fn list_sorts_by_updated_at_desc() {
        let (_d, paths, cid) = setup();
        let first = create(&paths, input(&cid, "A")).unwrap();
        std::thread::sleep(std::time::Duration::from_millis(5));
        let _second = create(&paths, input(&cid, "B")).unwrap();
        std::thread::sleep(std::time::Duration::from_millis(5));
        update(&paths, &first.id, input(&cid, "A edited")).unwrap();
        let rows = list(&paths, &ProposalFilter::default()).unwrap();
        assert_eq!(rows[0].title, "A edited");
    }
}
