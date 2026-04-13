use regex::Regex;
use std::path::Path;

pub fn slugify(name: &str) -> String {
    let lower = name.to_lowercase();
    let mut mapped = String::with_capacity(lower.len());
    for ch in lower.chars() {
        let replacement: Option<&str> = match ch {
            'ç' => Some("c"),
            'ğ' => Some("g"),
            'ı' => Some("i"),
            'ö' => Some("o"),
            'ş' => Some("s"),
            'ü' => Some("u"),
            _ => None,
        };
        if let Some(r) = replacement {
            mapped.push_str(r);
        } else {
            mapped.push(ch);
        }
    }
    let re = Regex::new(r"[^a-z0-9]+").unwrap();
    let cleaned = re.replace_all(&mapped, "-");
    cleaned.trim_matches('-').to_string()
}

pub fn unique_slug(base: &str, parent_dir: &Path) -> String {
    let mut candidate = base.to_string();
    let mut n = 2;
    while parent_dir.join(&candidate).exists() {
        candidate = format!("{}-{}", base, n);
        n += 1;
    }
    candidate
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[test]
    fn slugify_turkish() {
        assert_eq!(slugify("ACME Makina A.Ş."), "acme-makina-a-s");
        assert_eq!(slugify("Öz Çelik Ğürgen"), "oz-celik-gurgen");
    }

    #[test]
    fn unique_slug_appends_suffix() {
        let dir = tempdir().unwrap();
        std::fs::create_dir_all(dir.path().join("acme")).unwrap();
        assert_eq!(unique_slug("acme", dir.path()), "acme-2");
        std::fs::create_dir_all(dir.path().join("acme-2")).unwrap();
        assert_eq!(unique_slug("acme", dir.path()), "acme-3");
    }
}
