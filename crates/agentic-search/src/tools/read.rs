use std::path::Path;

/// Read full file contents with line numbers. Heavy — 500–5,000 tokens per file.
/// Only call after glob/grep has confirmed the file is relevant.
pub fn read_file(path: &Path, root: &Path) -> Result<String, String> {
    let full = if path.is_absolute() {
        path.to_path_buf()
    } else {
        root.join(path)
    };

    match std::fs::read_to_string(&full) {
        Ok(content) => {
            const READ_CAP: usize = 300;
            let all_lines: Vec<&str> = content.lines().collect();
            let capped = all_lines.len() > READ_CAP;
            let lines: Vec<String> = all_lines[..all_lines.len().min(READ_CAP)]
                .iter()
                .enumerate()
                .map(|(i, line)| format!("{:4}\t{}", i + 1, line))
                .collect();
            let mut out = lines.join("\n");
            if capped {
                out.push_str(&format!(
                    "\n… truncated at {READ_CAP} lines (file has {} total) — use grep for specific content",
                    all_lines.len()
                ));
            }
            Ok(out)
        }
        Err(e) => Err(format!("cannot read {}: {e}", full.display())),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use tempfile::tempdir;

    #[test]
    fn reads_small_file_with_line_numbers() {
        let dir = tempdir().unwrap();
        let p = dir.path().join("file.ts");
        fs::write(&p, "line one\nline two\nline three").unwrap();
        let out = read_file(Path::new("file.ts"), dir.path()).unwrap();
        assert!(out.contains("   1\tline one"));
        assert!(out.contains("   3\tline three"));
    }

    #[test]
    fn truncates_at_300_lines() {
        let dir = tempdir().unwrap();
        let content = (1..=350).map(|i| format!("line {i}")).collect::<Vec<_>>().join("\n");
        fs::write(dir.path().join("big.ts"), &content).unwrap();
        let out = read_file(Path::new("big.ts"), dir.path()).unwrap();
        // Line 300 present, line 301 absent
        assert!(out.contains("line 300"));
        assert!(!out.contains("line 301"));
        assert!(out.contains("truncated at 300 lines"));
    }

    #[test]
    fn missing_file_returns_error() {
        let dir = tempdir().unwrap();
        let result = read_file(Path::new("nonexistent.ts"), dir.path());
        assert!(result.is_err());
    }

    #[test]
    fn absolute_path_works() {
        let dir = tempdir().unwrap();
        let p = dir.path().join("abs.ts");
        fs::write(&p, "hello").unwrap();
        let out = read_file(&p, dir.path()).unwrap();
        assert!(out.contains("hello"));
    }
}
