use std::path::Path;

/// Match file paths by glob pattern. Near-zero token cost — returns paths only.
///
/// Returns paths relative to `root`. Skips hidden directories and `node_modules`/`target`.
pub fn glob_search(pattern: &str, root: &Path) -> Vec<String> {
    let root = root.canonicalize().unwrap_or_else(|_| root.to_path_buf());
    let root = root.as_path();
    let full_pattern = root.join(pattern).to_string_lossy().to_string();

    let paths: Vec<String> = glob::glob(&full_pattern)
        .unwrap_or_else(|_| glob::glob("__no_match__").unwrap())
        .filter_map(|entry| entry.ok())
        .filter_map(|p| {
            // Strip root first — only apply exclusion to the relative portion
            p.strip_prefix(root)
                .ok()
                .map(|rel| (p.clone(), rel.to_path_buf()))
        })
        .filter(|(_, rel)| !is_excluded(rel))
        .map(|(_, rel)| rel.to_string_lossy().to_string())
        .collect();

    paths
}

fn is_excluded(rel: &Path) -> bool {
    rel.components().any(|c| {
        let s = c.as_os_str().to_string_lossy();
        matches!(
            s.as_ref(),
            "node_modules" | "target" | ".git" | ".next" | "dist" | "__generated__"
        ) || s.starts_with('.')
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use tempfile::tempdir;

    fn make_tree(root: &Path, files: &[&str]) {
        for f in files {
            let p = root.join(f);
            fs::create_dir_all(p.parent().unwrap()).unwrap();
            fs::write(p, "").unwrap();
        }
    }

    #[test]
    fn matches_simple_extension() {
        let dir = tempdir().unwrap();
        make_tree(dir.path(), &["a.ts", "b.ts", "c.js"]);
        let hits = glob_search("*.ts", dir.path());
        assert_eq!(hits.len(), 2);
        assert!(hits.iter().all(|h| h.ends_with(".ts")));
    }

    #[test]
    fn recursive_pattern() {
        let dir = tempdir().unwrap();
        make_tree(dir.path(), &["src/a.ts", "src/sub/b.ts", "other.ts"]);
        let hits = glob_search("src/**/*.ts", dir.path());
        assert_eq!(hits.len(), 2);
    }

    #[test]
    fn excludes_node_modules_and_target() {
        let dir = tempdir().unwrap();
        make_tree(dir.path(), &[
            "src/good.ts",
            "node_modules/pkg/index.ts",
            "target/debug/build.ts",
            ".git/config",
        ]);
        let hits = glob_search("**/*.ts", dir.path());
        assert_eq!(hits, vec!["src/good.ts"]);
    }

    #[test]
    fn no_match_returns_empty() {
        let dir = tempdir().unwrap();
        make_tree(dir.path(), &["a.js"]);
        assert!(glob_search("*.rs", dir.path()).is_empty());
    }

    #[test]
    fn returns_relative_paths() {
        let dir = tempdir().unwrap();
        make_tree(dir.path(), &["src/foo.ts"]);
        let hits = glob_search("**/*.ts", dir.path());
        assert_eq!(hits, vec!["src/foo.ts"]);
    }
}
