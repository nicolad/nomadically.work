pub mod glob;
pub mod grep;
pub mod read;

pub use glob::glob_search;
pub use grep::grep_search;
#[allow(unused_imports)]
pub use grep::GrepMatch;
pub use read::read_file;

use std::path::Path;

/// Shared tool dispatcher used by both search workers and discovery workers.
pub fn execute(name: &str, args_json: &str, root: &Path) -> String {
    let args: serde_json::Value =
        serde_json::from_str(args_json).unwrap_or(serde_json::Value::Null);

    match name {
        "glob" => {
            const GLOB_CAP: usize = 300;
            let pattern = args["pattern"].as_str().unwrap_or("**/*");
            let paths = glob_search(pattern, root);
            if paths.is_empty() {
                "No files matched.".into()
            } else {
                let capped = paths.len() > GLOB_CAP;
                let shown = &paths[..paths.len().min(GLOB_CAP)];
                let mut out = format!("{} files:\n{}", paths.len(), shown.join("\n"));
                if capped {
                    out.push_str(&format!("\n… showing first {GLOB_CAP} — use a more specific pattern"));
                }
                out
            }
        }

        "grep" => {
            let pattern = args["pattern"].as_str().unwrap_or("");
            let glob = args["glob"].as_str();
            let matches = grep_search(pattern, glob, root);
            if matches.is_empty() {
                "No matches.".into()
            } else {
                let capped = matches.len() >= 200;
                let mut out = matches
                    .iter()
                    .map(|m| format!("{}:{}: {}", m.file, m.line, m.content))
                    .collect::<Vec<_>>()
                    .join("\n");
                if capped {
                    out.push_str("\n… capped at 200 — refine the pattern");
                }
                out
            }
        }

        "read" => match read_file(Path::new(args["path"].as_str().unwrap_or("")), root) {
            Ok(c) => c,
            Err(e) => e,
        },

        other => format!("unknown tool: {other}"),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use tempfile::tempdir;

    #[test]
    fn glob_tool_caps_at_300() {
        let dir = tempdir().unwrap();
        for i in 0..350 {
            fs::write(dir.path().join(format!("f{i}.ts")), "").unwrap();
        }
        let out = execute(r#"glob"#, r#"{"pattern":"*.ts"}"#, dir.path());
        let lines: Vec<&str> = out.lines().collect();
        // Header + 300 paths + truncation notice
        assert!(lines.len() <= 302, "got {} lines", lines.len());
        assert!(out.contains("showing first 300"));
    }

    #[test]
    fn grep_tool_finds_match() {
        let dir = tempdir().unwrap();
        fs::write(dir.path().join("a.ts"), "import { drizzle } from 'drizzle-orm';").unwrap();
        let out = execute("grep", r#"{"pattern":"drizzle"}"#, dir.path());
        assert!(out.contains("drizzle"));
        assert!(!out.contains("No matches"));
    }

    #[test]
    fn read_tool_returns_content() {
        let dir = tempdir().unwrap();
        fs::write(dir.path().join("x.ts"), "export const x = 1;").unwrap();
        let out = execute("read", r#"{"path":"x.ts"}"#, dir.path());
        assert!(out.contains("export const x = 1;"));
    }

    #[test]
    fn unknown_tool_returns_error_message() {
        let dir = tempdir().unwrap();
        let out = execute("fly", "{}", dir.path());
        assert!(out.contains("unknown tool: fly"));
    }
}
