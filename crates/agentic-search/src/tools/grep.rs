use regex::Regex;
use std::path::Path;
use walkdir::WalkDir;

/// A single line that matched the search pattern.
pub struct GrepMatch {
    pub file: String,
    pub line: usize,
    pub content: String,
}

/// Regex content search across files. Lightweight — returns matching lines with file:line context.
///
/// `glob_filter` restricts which files are searched (e.g. `"*.ts"`, `"src/**/*.graphql"`).
/// Cap at 200 matches to keep output manageable.
pub fn grep_search(pattern: &str, glob_filter: Option<&str>, root: &Path) -> Vec<GrepMatch> {
    let root_buf = root.canonicalize().unwrap_or_else(|_| root.to_path_buf());
    let root = root_buf.as_path();
    let re = match Regex::new(pattern) {
        Ok(r) => r,
        Err(e) => {
            tracing::warn!("invalid grep pattern '{pattern}': {e}");
            return vec![];
        }
    };

    let mut results = Vec::new();

    for entry in WalkDir::new(root)
        .into_iter()
        .filter_entry(|e| !is_excluded_dir(e, root))
        .filter_map(|e| e.ok())
        .filter(|e| e.file_type().is_file())
    {
        let path = entry.path();

        if let Some(filter) = glob_filter {
            if !matches_glob(path, root, filter) {
                continue;
            }
        }

        // Skip binary files
        let Ok(content) = std::fs::read_to_string(path) else {
            continue;
        };

        let rel = path
            .strip_prefix(root)
            .unwrap_or(path)
            .to_string_lossy()
            .to_string();

        for (i, line) in content.lines().enumerate() {
            if re.is_match(line) {
                results.push(GrepMatch {
                    file: rel.clone(),
                    line: i + 1,
                    content: line.trim().to_string(),
                });
                if results.len() >= 200 {
                    return results;
                }
            }
        }
    }

    results
}

fn is_excluded_dir(entry: &walkdir::DirEntry, root: &Path) -> bool {
    if !entry.file_type().is_dir() {
        return false;
    }
    // Only apply exclusion rules to the relative path — avoids false positives
    // when the root itself contains dot-prefixed components (e.g. macOS /var/.tmpXXX).
    let rel = entry.path().strip_prefix(root).unwrap_or(entry.path());
    rel.components().any(|c| {
        let name = c.as_os_str().to_string_lossy();
        matches!(
            name.as_ref(),
            "node_modules" | "target" | ".git" | ".next" | "dist" | "__generated__"
        ) || name.starts_with('.')
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use tempfile::tempdir;

    fn write(root: &Path, name: &str, content: &str) {
        let p = root.join(name);
        fs::create_dir_all(p.parent().unwrap()).unwrap();
        fs::write(p, content).unwrap();
    }

    #[test]
    fn finds_literal_match() {
        let dir = tempdir().unwrap();
        write(dir.path(), "a.ts", "import { foo } from 'bar';\nconst x = 1;");
        let hits = grep_search("import", None, dir.path());
        assert_eq!(hits.len(), 1);
        assert_eq!(hits[0].line, 1);
    }

    #[test]
    fn regex_pattern() {
        let dir = tempdir().unwrap();
        write(dir.path(), "schema.ts", "const drizzle = require('drizzle-orm');\nconst pg = require('pg');");
        let hits = grep_search(r"require\('drizzle", None, dir.path());
        assert_eq!(hits.len(), 1);
        assert!(hits[0].content.contains("drizzle-orm"));
    }

    #[test]
    fn glob_filter_restricts_files() {
        let dir = tempdir().unwrap();
        write(dir.path(), "a.ts", "hello world");
        write(dir.path(), "b.rs", "hello world");
        let ts_hits = grep_search("hello", Some("*.ts"), dir.path());
        let rs_hits = grep_search("hello", Some("*.rs"), dir.path());
        assert_eq!(ts_hits.len(), 1);
        assert_eq!(rs_hits.len(), 1);
        assert!(ts_hits[0].file.ends_with(".ts"));
        assert!(rs_hits[0].file.ends_with(".rs"));
    }

    #[test]
    fn skips_node_modules() {
        let dir = tempdir().unwrap();
        write(dir.path(), "src/index.ts", "use_me");
        write(dir.path(), "node_modules/pkg/index.ts", "use_me");
        let hits = grep_search("use_me", None, dir.path());
        assert_eq!(hits.len(), 1);
        assert!(hits[0].file.starts_with("src/"));
    }

    #[test]
    fn invalid_regex_returns_empty() {
        let dir = tempdir().unwrap();
        write(dir.path(), "a.ts", "anything");
        assert!(grep_search("[invalid", None, dir.path()).is_empty());
    }

    #[test]
    fn no_match_returns_empty() {
        let dir = tempdir().unwrap();
        write(dir.path(), "a.ts", "hello");
        assert!(grep_search("xyz_not_present", None, dir.path()).is_empty());
    }
}

/// Match a file path against a glob filter pattern.
/// Tries full relative path first, then filename only (handles `*.ts` style patterns).
fn matches_glob(path: &Path, root: &Path, pattern: &str) -> bool {
    let rel = path
        .strip_prefix(root)
        .unwrap_or(path)
        .to_string_lossy()
        .to_string();

    let filename = path
        .file_name()
        .map(|f| f.to_string_lossy().to_string())
        .unwrap_or_default();

    glob::Pattern::new(pattern)
        .map(|p| p.matches(&rel) || p.matches(&filename))
        .unwrap_or(false)
}
