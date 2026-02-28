use serde_json::{json, Value};
use std::collections::HashMap;

// ── 1. ANALYZE TECH STACK ──────────────────────────────────────────
/// Extract programming languages, frameworks, infrastructure from job text.
pub fn analyze_tech_stack(input: Value) -> Result<Value, String> {
    let text = input.get("text").and_then(|v| v.as_str())
        .ok_or("Missing 'text' field")?;
    let lower = text.to_lowercase();

    let languages: Vec<&str> = [
        ("rust", "Rust"), ("python", "Python"), ("typescript", "TypeScript"),
        ("javascript", "JavaScript"), ("golang", "Go"), ("go ", "Go"),
        ("java ", "Java"), ("kotlin", "Kotlin"), ("scala", "Scala"),
        ("c++", "C++"), ("ruby", "Ruby"), ("elixir", "Elixir"),
        ("swift", "Swift"), ("php", "PHP"),
    ].iter()
        .filter(|(kw, _)| lower.contains(kw))
        .map(|(_, name)| *name)
        .collect();

    let frameworks: Vec<&str> = [
        ("react", "React"), ("next.js", "Next.js"), ("nextjs", "Next.js"),
        ("vue", "Vue"), ("angular", "Angular"), ("svelte", "Svelte"),
        ("django", "Django"), ("fastapi", "FastAPI"), ("flask", "Flask"),
        ("express", "Express"), ("nestjs", "NestJS"), ("spring", "Spring"),
        ("rails", "Rails"), ("actix", "Actix"), ("axum", "Axum"),
        ("tokio", "Tokio"), ("graphql", "GraphQL"), ("trpc", "tRPC"),
        ("tailwind", "Tailwind"), ("shadcn", "shadcn/ui"),
    ].iter()
        .filter(|(kw, _)| lower.contains(kw))
        .map(|(_, name)| *name)
        .collect();

    let infrastructure: Vec<&str> = [
        ("aws", "AWS"), ("gcp", "GCP"), ("google cloud", "GCP"),
        ("azure", "Azure"), ("cloudflare", "Cloudflare"), ("vercel", "Vercel"),
        ("docker", "Docker"), ("kubernetes", "Kubernetes"), ("k8s", "Kubernetes"),
        ("terraform", "Terraform"), ("pulumi", "Pulumi"),
        ("postgres", "PostgreSQL"), ("mysql", "MySQL"), ("mongodb", "MongoDB"),
        ("redis", "Redis"), ("kafka", "Kafka"), ("rabbitmq", "RabbitMQ"),
        ("elasticsearch", "Elasticsearch"), ("supabase", "Supabase"),
        ("neon", "Neon"), ("planetscale", "PlanetScale"),
    ].iter()
        .filter(|(kw, _)| lower.contains(kw))
        .map(|(_, name)| *name)
        .collect();

    let ai_ml: Vec<&str> = [
        ("openai", "OpenAI"), ("anthropic", "Anthropic"), ("claude", "Claude"),
        ("gpt", "GPT"), ("llm", "LLM"), ("langchain", "LangChain"),
        ("pytorch", "PyTorch"), ("tensorflow", "TensorFlow"),
        ("hugging face", "HuggingFace"), ("huggingface", "HuggingFace"),
        ("vector", "Vector DB"), ("embedding", "Embeddings"),
        ("rag", "RAG"), ("fine-tun", "Fine-tuning"), ("mlops", "MLOps"),
        ("cursor", "Cursor"), ("copilot", "Copilot"),
    ].iter()
        .filter(|(kw, _)| lower.contains(kw))
        .map(|(_, name)| *name)
        .collect();

    Ok(json!({
        "languages": languages,
        "frameworks": frameworks,
        "infrastructure": infrastructure,
        "ai_ml": ai_ml,
        "total_signals": languages.len() + frameworks.len() + infrastructure.len() + ai_ml.len(),
    }))
}

// ── 2. SCORE REMOTE EU ─────────────────────────────────────────────
/// Score job's remote-EU compatibility (0-100).
pub fn score_remote_eu(input: Value) -> Result<Value, String> {
    let text = input.get("text").and_then(|v| v.as_str())
        .ok_or("Missing 'text' field")?;
    let lower = text.to_lowercase();

    let mut score: i32 = 0;
    let mut signals: Vec<&str> = Vec::new();
    let mut red_flags: Vec<&str> = Vec::new();

    let positives: &[(&[&str], &str, i32)] = &[
        (&["remote", "fully remote", "100% remote"], "remote_mentioned", 15),
        (&["europe", "eu ", "european"], "eu_mentioned", 20),
        (&["emea", "cet", "cest", "gmt+1", "gmt+2"], "eu_timezone", 15),
        (&["anywhere", "global", "worldwide"], "global_remote", 10),
        (&["async", "asynchronous"], "async_culture", 10),
        (&["work from anywhere", "location agnostic", "location independent"], "location_flexible", 15),
        (&["visa sponsor", "relocation"], "visa_support", 5),
        (&["gdpr", "data protection"], "eu_compliance", 5),
    ];

    for (keywords, signal, points) in positives {
        if keywords.iter().any(|kw| lower.contains(kw)) {
            score += points;
            signals.push(signal);
        }
    }

    let negatives: &[(&[&str], &str, i32)] = &[
        (&["us only", "united states only", "usa only"], "us_only", -30),
        (&["on-site", "onsite", "in-office", "in office"], "onsite_required", -25),
        (&["hybrid"], "hybrid", -10),
        (&["security clearance", "us citizen"], "us_restricted", -40),
        (&["est ", "pst ", "pacific time", "eastern time"], "us_timezone", -15),
    ];

    for (keywords, flag, penalty) in negatives {
        if keywords.iter().any(|kw| lower.contains(kw)) {
            score += penalty;
            red_flags.push(flag);
        }
    }

    let final_score = score.max(0).min(100);
    let tier = match final_score {
        80..=100 => "excellent",
        60..=79 => "good",
        40..=59 => "possible",
        20..=39 => "unlikely",
        _ => "poor",
    };

    Ok(json!({
        "score": final_score,
        "tier": tier,
        "positive_signals": signals,
        "red_flags": red_flags,
    }))
}

// ── 3. EXTRACT AGENTIC PATTERNS ────────────────────────────────────
/// Detect agentic/AI coding patterns in job descriptions.
pub fn extract_agentic_patterns(input: Value) -> Result<Value, String> {
    let text = input.get("text").and_then(|v| v.as_str())
        .ok_or("Missing 'text' field")?;
    let lower = text.to_lowercase();

    let patterns: Vec<(&str, &str, &str)> = vec![
        ("prompt engineering", "prompt_engineering", "core"),
        ("prompt design", "prompt_engineering", "core"),
        ("llm integration", "llm_integration", "core"),
        ("ai agent", "agent_building", "advanced"),
        ("agentic", "agent_building", "advanced"),
        ("tool use", "tool_use", "advanced"),
        ("function calling", "tool_use", "advanced"),
        ("rag", "rag_pipeline", "advanced"),
        ("retrieval augmented", "rag_pipeline", "advanced"),
        ("vector search", "vector_ops", "advanced"),
        ("embedding", "embedding_ops", "intermediate"),
        ("fine-tun", "fine_tuning", "advanced"),
        ("model evaluation", "eval", "intermediate"),
        ("eval", "eval", "intermediate"),
        ("chain of thought", "reasoning", "advanced"),
        ("multi-agent", "multi_agent", "expert"),
        ("orchestrat", "orchestration", "advanced"),
        ("cursor", "ai_ide", "basic"),
        ("copilot", "ai_ide", "basic"),
        ("code generation", "code_gen", "intermediate"),
        ("ai-assisted", "ai_assisted", "basic"),
    ];

    let mut detected: Vec<Value> = Vec::new();
    let mut categories: HashMap<&str, u32> = HashMap::new();

    for (keyword, category, level) in &patterns {
        if lower.contains(keyword) {
            *categories.entry(category).or_default() += 1;
            detected.push(json!({
                "keyword": keyword,
                "category": category,
                "level": level,
            }));
        }
    }

    let agentic_score = detected.len() as u32 * 10;
    let maturity = match agentic_score {
        0..=10 => "none",
        11..=30 => "basic",
        31..=60 => "intermediate",
        61..=80 => "advanced",
        _ => "expert",
    };

    Ok(json!({
        "detected_patterns": detected,
        "categories": categories,
        "agentic_score": agentic_score.min(100),
        "maturity_level": maturity,
        "pattern_count": detected.len(),
    }))
}

// ── 4. MATCH SKILLS (BM25-based) ───────────────────────────────────
/// BM25 match job requirements against candidate skills.
pub fn match_skills(input: Value) -> Result<Value, String> {
    let text = input.get("text").and_then(|v| v.as_str())
        .ok_or("Missing 'text' field")?;
    let lower = text.to_lowercase();

    let candidate_skills: &[(&str, &[&str], u32)] = &[
        ("TypeScript", &["typescript", "ts "], 95),
        ("React", &["react", "nextjs", "next.js"], 90),
        ("GraphQL", &["graphql", "apollo"], 90),
        ("Rust", &["rust", "wasm", "webassembly"], 75),
        ("Python", &["python"], 70),
        ("Node.js", &["node.js", "nodejs", "node "], 90),
        ("Cloudflare Workers", &["cloudflare", "workers", "d1", "r2"], 85),
        ("AI/ML", &["ai", "ml", "llm", "agent", "anthropic", "openai"], 80),
        ("PostgreSQL", &["postgres", "postgresql", "sql"], 80),
        ("Docker", &["docker", "container"], 70),
        ("Kubernetes", &["kubernetes", "k8s"], 50),
        ("AWS", &["aws", "s3", "lambda", "ec2"], 60),
        ("RAG", &["rag", "retrieval", "vector", "embedding"], 75),
        ("Drizzle ORM", &["drizzle", "orm"], 90),
        ("Vercel", &["vercel", "deployment"], 85),
    ];

    let mut matched: Vec<Value> = Vec::new();
    let mut total_weight = 0u32;
    let mut matched_weight = 0u32;

    for (skill, keywords, proficiency) in candidate_skills {
        let is_required = keywords.iter().any(|kw| lower.contains(kw));
        if is_required {
            total_weight += 100;
            matched_weight += proficiency;
            matched.push(json!({
                "skill": skill,
                "proficiency": proficiency,
                "required": true,
            }));
        }
    }

    let fit_score = if total_weight > 0 {
        (matched_weight as f64 / total_weight as f64 * 100.0) as u32
    } else {
        0
    };

    Ok(json!({
        "matched_skills": matched,
        "fit_score": fit_score,
        "skills_matched": matched.len(),
        "skills_total": candidate_skills.len(),
    }))
}

// ── 5. CLASSIFY SENIORITY ──────────────────────────────────────────
/// Classify seniority level from job description signals.
pub fn classify_seniority(input: Value) -> Result<Value, String> {
    let text = input.get("text").and_then(|v| v.as_str())
        .ok_or("Missing 'text' field")?;
    let lower = text.to_lowercase();

    let mut score: i32 = 0;
    let mut signals: Vec<&str> = Vec::new();

    let checks: &[(&[&str], &str, i32)] = &[
        (&["principal", "distinguished", "fellow"], "principal", 50),
        (&["staff engineer", "staff software"], "staff", 40),
        (&["senior", "sr.", "sr "], "senior", 30),
        (&["lead", "tech lead", "team lead"], "lead", 35),
        (&["architect"], "architect", 40),
        (&["junior", "jr.", "jr ", "entry level", "entry-level"], "junior", -20),
        (&["intern", "internship", "graduate"], "intern", -30),
        (&["mid-level", "mid level", "intermediate"], "mid", 10),
        (&["10+ years", "8+ years", "7+ years"], "high_experience", 20),
        (&["5+ years", "4+ years"], "mid_experience", 10),
        (&["1+ year", "2+ years", "1-3 years"], "low_experience", -10),
        (&["mentor", "guide", "coach"], "mentorship", 15),
        (&["architecture", "system design", "technical direction"], "design_scope", 15),
    ];

    for (keywords, signal, points) in checks {
        if keywords.iter().any(|kw| lower.contains(kw)) {
            score += points;
            signals.push(signal);
        }
    }

    let level = match score {
        x if x >= 40 => "staff+",
        x if x >= 25 => "senior",
        x if x >= 10 => "mid",
        x if x >= 0 => "junior",
        _ => "entry",
    };

    Ok(json!({
        "level": level,
        "confidence_score": score.max(0).min(100),
        "signals": signals,
    }))
}

// ── 6. DETECT ATS PROVIDER ─────────────────────────────────────────
/// Detect ATS provider from URL or text.
pub fn detect_ats_provider(input: Value) -> Result<Value, String> {
    let url = input.get("url").and_then(|v| v.as_str())
        .or_else(|| input.get("text").and_then(|v| v.as_str()))
        .ok_or("Missing 'url' or 'text' field")?;
    let lower = url.to_lowercase();

    let providers: &[(&[&str], &str, &str)] = &[
        (&["ashbyhq.com", "ashby"], "Ashby", "modern"),
        (&["greenhouse.io", "boards.greenhouse"], "Greenhouse", "established"),
        (&["lever.co"], "Lever", "established"),
        (&["workable.com"], "Workable", "established"),
        (&["breezy.hr"], "BreezyHR", "mid"),
        (&["recruitee.com"], "Recruitee", "mid"),
        (&["jobvite.com"], "Jobvite", "enterprise"),
        (&["icims.com"], "iCIMS", "enterprise"),
        (&["taleo.net"], "Taleo", "legacy"),
        (&["workday.com"], "Workday", "enterprise"),
        (&["smartrecruiters.com"], "SmartRecruiters", "established"),
        (&["careers.kula.ai"], "Kula", "modern"),
    ];

    for (patterns, name, tier) in providers {
        if patterns.iter().any(|p| lower.contains(p)) {
            return Ok(json!({
                "provider": name,
                "tier": tier,
                "detected_from": url,
            }));
        }
    }

    Ok(json!({
        "provider": "unknown",
        "tier": "unknown",
        "detected_from": url,
    }))
}

// ── 7. EXTRACT SALARY SIGNALS ──────────────────────────────────────
/// Extract salary, compensation, and benefits signals from job text.
pub fn extract_salary_signals(input: Value) -> Result<Value, String> {
    let text = input.get("text").and_then(|v| v.as_str())
        .ok_or("Missing 'text' field")?;
    let lower = text.to_lowercase();

    let mut signals: Vec<Value> = Vec::new();

    let currencies: &[(&str, &str)] = &[
        ("€", "EUR"), ("eur", "EUR"), ("£", "GBP"), ("gbp", "GBP"),
        ("$", "USD"), ("usd", "USD"), ("chf", "CHF"),
    ];
    let detected_currency: Option<&str> = currencies.iter()
        .find(|(kw, _)| lower.contains(kw))
        .map(|(_, c)| *c);

    let bands: &[(&str, &str)] = &[
        ("competitive salary", "competitive"),
        ("above market", "above_market"),
        ("equity", "has_equity"),
        ("stock option", "has_equity"),
        ("rsu", "has_equity"),
        ("esop", "has_equity"),
        ("bonus", "has_bonus"),
        ("on-target earnings", "has_ote"),
        ("ote", "has_ote"),
    ];

    for (kw, signal) in bands {
        if lower.contains(kw) {
            signals.push(json!({ "type": signal, "keyword": kw }));
        }
    }

    let benefits: Vec<&str> = [
        "health insurance", "dental", "401k", "pension", "pto",
        "unlimited pto", "learning budget", "home office", "equipment",
        "coworking", "retreat", "conference",
    ].iter()
        .filter(|kw| lower.contains(**kw))
        .copied()
        .collect();

    Ok(json!({
        "currency": detected_currency,
        "compensation_signals": signals,
        "benefits": benefits,
        "has_salary_info": detected_currency.is_some() || !signals.is_empty(),
    }))
}

// ── 8. SCORE COMPANY CULTURE ───────────────────────────────────────
/// Score company engineering culture from job description signals.
pub fn score_company_culture(input: Value) -> Result<Value, String> {
    let text = input.get("text").and_then(|v| v.as_str())
        .ok_or("Missing 'text' field")?;
    let lower = text.to_lowercase();

    let mut score: u32 = 0;
    let mut signals: Vec<&str> = Vec::new();

    let checks: &[(&[&str], &str, u32)] = &[
        (&["async", "asynchronous", "written communication"], "async_first", 15),
        (&["documentation", "docs-first", "rfc"], "docs_culture", 10),
        (&["open source", "open-source", "oss"], "open_source", 10),
        (&["pair programming", "mob programming", "code review"], "collaborative_coding", 10),
        (&["ci/cd", "continuous", "deployment pipeline"], "devops_maturity", 10),
        (&["test", "tdd", "testing"], "testing_culture", 10),
        (&["autonomy", "ownership", "self-directed"], "autonomy", 15),
        (&["learning", "growth", "conference", "education budget"], "learning_culture", 10),
        (&["diverse", "inclusion", "belonging", "dei"], "dei", 5),
        (&["flat", "no hierarchy", "startup"], "flat_structure", 5),
        (&["agile", "scrum", "kanban", "sprint"], "agile", 5),
    ];

    for (keywords, signal, points) in checks {
        if keywords.iter().any(|kw| lower.contains(kw)) {
            score += points;
            signals.push(signal);
        }
    }

    let tier = match score {
        80..=100 => "excellent",
        60..=79 => "strong",
        40..=59 => "good",
        20..=39 => "basic",
        _ => "minimal",
    };

    Ok(json!({
        "culture_score": score.min(100),
        "tier": tier,
        "signals": signals,
    }))
}

// ── 9. GENERATE APPLICATION BRIEF ──────────────────────────────────
/// Generate a comprehensive application brief by combining all analysis tools.
pub fn generate_application_brief(input: Value) -> Result<Value, String> {
    let text = input.get("text").and_then(|v| v.as_str())
        .ok_or("Missing 'text' field")?;
    let job_title = input.get("job_title").and_then(|v| v.as_str()).unwrap_or("Unknown");
    let company = input.get("company").and_then(|v| v.as_str()).unwrap_or("Unknown");

    let tech = analyze_tech_stack(json!({"text": text}))?;
    let remote = score_remote_eu(json!({"text": text}))?;
    let agentic = extract_agentic_patterns(json!({"text": text}))?;
    let skills = match_skills(json!({"text": text}))?;
    let seniority = classify_seniority(json!({"text": text}))?;
    let salary = extract_salary_signals(json!({"text": text}))?;
    let culture = score_company_culture(json!({"text": text}))?;

    let requirements: Vec<&str> = text.split(|c: char| c == '.' || c == '\n')
        .map(|s| s.trim())
        .filter(|s| {
            let l = s.to_lowercase();
            (l.contains("must") || l.contains("require") || l.contains("experience")
             || l.contains("proficien") || l.contains("strong"))
            && s.len() > 20 && s.len() < 300
        })
        .take(10)
        .collect();

    let mut red_flags: Vec<&str> = Vec::new();
    let lower = text.to_lowercase();
    if lower.contains("on-call") || lower.contains("oncall") { red_flags.push("on-call required"); }
    if lower.contains("travel") { red_flags.push("travel required"); }
    if lower.contains("relocation required") { red_flags.push("relocation required"); }
    if lower.contains("security clearance") { red_flags.push("security clearance"); }
    if lower.contains("drug test") { red_flags.push("drug testing"); }

    Ok(json!({
        "job_title": job_title,
        "company": company,
        "key_requirements": requirements,
        "red_flags": red_flags,
        "tech_stack": tech,
        "remote_eu": remote,
        "agentic_patterns": agentic,
        "skills_match": skills,
        "seniority": seniority,
        "salary": salary,
        "culture": culture,
    }))
}

// ── 10. RANK JOB FIT (composite scoring pipeline) ──────────────────
/// Composite scoring pipeline that ranks overall job fit.
pub fn rank_job_fit(input: Value) -> Result<Value, String> {
    let text = input.get("text").and_then(|v| v.as_str())
        .ok_or("Missing 'text' field")?;

    let remote = score_remote_eu(json!({"text": text}))?;
    let skills = match_skills(json!({"text": text}))?;
    let agentic = extract_agentic_patterns(json!({"text": text}))?;
    let seniority = classify_seniority(json!({"text": text}))?;
    let culture = score_company_culture(json!({"text": text}))?;

    let remote_score = remote.get("score").and_then(|v| v.as_f64()).unwrap_or(0.0);
    let skills_score = skills.get("fit_score").and_then(|v| v.as_f64()).unwrap_or(0.0);
    let agentic_score = agentic.get("agentic_score").and_then(|v| v.as_f64()).unwrap_or(0.0);
    let culture_score = culture.get("culture_score").and_then(|v| v.as_f64()).unwrap_or(0.0);

    let composite = (remote_score * 0.30) + (skills_score * 0.30) + (agentic_score * 0.20) + (culture_score * 0.20);

    let seniority_level = seniority.get("level").and_then(|v| v.as_str()).unwrap_or("unknown");
    let seniority_bonus: f64 = match seniority_level {
        "senior" | "staff+" => 5.0,
        "mid" => 0.0,
        _ => -10.0,
    };

    let final_score = (composite + seniority_bonus).max(0.0).min(100.0);
    let recommendation = match final_score as u32 {
        80..=100 => "strong_apply",
        60..=79 => "apply",
        40..=59 => "consider",
        20..=39 => "low_priority",
        _ => "skip",
    };

    Ok(json!({
        "composite_score": final_score as u32,
        "recommendation": recommendation,
        "breakdown": {
            "remote_eu": remote_score,
            "skills_match": skills_score,
            "agentic_focus": agentic_score,
            "culture": culture_score,
            "seniority_bonus": seniority_bonus,
        },
        "seniority": seniority,
        "remote_eu_detail": remote,
        "skills_detail": skills,
        "agentic_detail": agentic,
        "culture_detail": culture,
    }))
}
