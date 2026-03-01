use anyhow::{bail, Context, Result};
use dashmap::DashMap;
use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use std::time::Duration;
use tokio::sync::{broadcast, Semaphore};
use tracing::{debug, warn};

use crate::cache::Cache;
use crate::config::{DeepSeekConfig, BASE_URL, MODEL, TEMPERATURE};

#[derive(Clone)]
pub struct DeepSeek {
    client: Client,
    api_key: Arc<String>,
    semaphore: Arc<Semaphore>,
    in_flight: Arc<DashMap<String, broadcast::Sender<Decision>>>,
    pub cache: Cache,
}

#[derive(Serialize)]
struct ChatRequest {
    model: &'static str,
    messages: Vec<Message>,
    max_tokens: u32,
    temperature: f32,
}

#[derive(Serialize, Deserialize, Clone)]
struct Message {
    role: String,
    content: String,
}

#[derive(Deserialize)]
struct ChatResponse {
    choices: Vec<Choice>,
}

#[derive(Deserialize)]
struct Choice {
    message: MessageContent,
}

#[derive(Deserialize)]
struct MessageContent {
    content: String,
    #[serde(default)]
    reasoning_content: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct Decision {
    pub ok: bool,
    #[serde(default)]
    pub reason: Option<String>,
    #[serde(default)]
    pub reasoning: Option<String>,
}

impl DeepSeek {
    pub fn new(api_key: String, config: &DeepSeekConfig, cache: Cache) -> Self {
        let client = Client::builder()
            .timeout(Duration::from_secs(config.timeout_secs))
            .pool_max_idle_per_host(config.max_concurrent)
            .pool_idle_timeout(Duration::from_secs(90))
            .tcp_keepalive(Duration::from_secs(30))
            .build()
            .expect("failed to build HTTP client");

        let semaphore = Arc::new(Semaphore::new(config.max_concurrent));

        Self {
            client,
            api_key: Arc::new(api_key),
            semaphore,
            in_flight: Arc::new(DashMap::with_shard_amount(32)),
            cache,
        }
    }

    pub async fn evaluate(
        &self,
        system_prompt: &str,
        user_prompt: &str,
        cache_key: Option<&str>,
    ) -> Result<Decision> {
        // Layer 1: Cache
        if let Some(key) = cache_key {
            if let Some(cached) = self.cache.get(key) {
                debug!("cache hit: {}", &key[..16]);
                return serde_json::from_str(&cached)
                    .context("deserializing cached decision");
            }
        }

        let dedup_key = cache_key.map(|k| k.to_string());

        // Layer 2: In-flight deduplication
        if let Some(ref key) = dedup_key {
            use dashmap::mapref::entry::Entry;
            match self.in_flight.entry(key.clone()) {
                Entry::Occupied(entry) => {
                    let mut rx = entry.get().subscribe();
                    drop(entry);
                    debug!("dedup: waiting on in-flight {}", &key[..16]);
                    let decision = rx.recv().await
                        .context("in-flight sender dropped")?;
                    return Ok(decision);
                }
                Entry::Vacant(entry) => {
                    let (tx, _) = broadcast::channel(4);
                    entry.insert(tx);
                }
            }
        }

        // Layer 3: Semaphore-bounded API call
        let result = self.call_api(system_prompt, user_prompt).await;

        if let Some(ref key) = dedup_key {
            if let Some((_, tx)) = self.in_flight.remove(key) {
                if let Ok(ref decision) = result {
                    let _ = tx.send(decision.clone());
                }
            }

            if let Ok(ref decision) = result {
                if let Ok(json) = serde_json::to_string(decision) {
                    self.cache.set(key.clone(), json);
                }
            }
        }

        result
    }

    async fn call_api(
        &self,
        system_prompt: &str,
        user_prompt: &str,
    ) -> Result<Decision> {
        let _permit = self.semaphore.acquire().await
            .context("semaphore closed")?;

        debug!("calling DeepSeek Reasoner");

        let body = ChatRequest {
            model: MODEL,
            messages: vec![
                Message { role: "system".into(), content: system_prompt.to_string() },
                Message { role: "user".into(), content: user_prompt.to_string() },
            ],
            max_tokens: 1024,
            temperature: TEMPERATURE,
        };

        let resp = self.client
            .post(format!("{BASE_URL}/v1/chat/completions"))
            .bearer_auth(self.api_key.as_str())
            .json(&body)
            .send()
            .await
            .context("DeepSeek API request failed")?;

        if !resp.status().is_success() {
            let status = resp.status();
            let text = resp.text().await.unwrap_or_default();
            bail!("DeepSeek API error {status}: {text}");
        }

        let chat_resp: ChatResponse = resp.json().await
            .context("parsing DeepSeek response")?;

        let choice = chat_resp.choices.into_iter().next()
            .context("empty response from DeepSeek")?;

        let content = choice.message.content.trim().to_string();

        let mut decision: Decision = parse_decision(&content)
            .unwrap_or_else(|e| {
                warn!("failed to parse decision JSON, defaulting to ok=true: {e}");
                Decision { ok: true, reason: None, reasoning: None }
            });

        if let Some(reasoning) = choice.message.reasoning_content {
            decision.reasoning = Some(reasoning);
        }

        Ok(decision)
    }

    #[allow(dead_code)]
    pub fn evaluate_background(
        &self,
        system_prompt: String,
        user_prompt: String,
        cache_key: Option<String>,
    ) {
        let this = self.clone();
        tokio::spawn(async move {
            match this.evaluate(&system_prompt, &user_prompt, cache_key.as_deref()).await {
                Ok(d) => debug!("background eval: ok={} reason={:?}", d.ok, d.reason),
                Err(e) => warn!("background eval failed: {e}"),
            }
        });
    }
}

fn parse_decision(content: &str) -> Result<Decision> {
    if let Ok(d) = serde_json::from_str::<Decision>(content) {
        return Ok(d);
    }
    let stripped = content
        .trim_start_matches("```json")
        .trim_start_matches("```")
        .trim_end_matches("```")
        .trim();
    serde_json::from_str(stripped).context("not valid decision JSON")
}
