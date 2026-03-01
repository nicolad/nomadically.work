use dashmap::DashMap;
use sha2::{Digest, Sha256};
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Arc;
use std::time::{Duration, Instant};

#[derive(Clone)]
pub struct Cache {
    store: Arc<DashMap<String, CacheEntry>>,
    ttl: Duration,
    max_entries: usize,
    insert_count: Arc<AtomicU64>,
}

struct CacheEntry {
    value: String,
    inserted: Instant,
}

impl Cache {
    pub fn new(ttl_secs: u64, max_entries: usize) -> Self {
        Self {
            store: Arc::new(DashMap::with_shard_amount(64)),
            ttl: Duration::from_secs(ttl_secs),
            max_entries,
            insert_count: Arc::new(AtomicU64::new(0)),
        }
    }

    pub fn key(event: &str, tool: Option<&str>, input: &str) -> String {
        let mut hasher = Sha256::new();
        hasher.update(event.as_bytes());
        if let Some(t) = tool {
            hasher.update(b"|");
            hasher.update(t.as_bytes());
        }
        hasher.update(b"|");
        hasher.update(input.as_bytes());
        format!("{:x}", hasher.finalize())
    }

    pub fn get(&self, key: &str) -> Option<String> {
        let entry = self.store.get(key)?;
        if entry.inserted.elapsed() > self.ttl {
            drop(entry);
            self.store.remove(key);
            return None;
        }
        Some(entry.value.clone())
    }

    pub fn set(&self, key: String, value: String) {
        self.store.insert(key, CacheEntry {
            value,
            inserted: Instant::now(),
        });

        let count = self.insert_count.fetch_add(1, Ordering::Relaxed);
        if count % 64 == 0 {
            self.evict();
        }
    }

    fn evict(&self) {
        let ttl = self.ttl;
        self.store.retain(|_, v| v.inserted.elapsed() <= ttl);

        if self.store.len() > self.max_entries {
            let store = self.store.clone();
            let max = self.max_entries;
            tokio::spawn(async move {
                let target = max * 3 / 4;
                let mut entries: Vec<(String, Instant)> = store
                    .iter()
                    .map(|e| (e.key().clone(), e.value().inserted))
                    .collect();
                entries.sort_by_key(|(_, t)| *t);
                let remove_count = entries.len().saturating_sub(target);
                for (k, _) in entries.into_iter().take(remove_count) {
                    store.remove(&k);
                }
            });
        }
    }

    #[allow(dead_code)]
    pub fn len(&self) -> usize {
        self.store.len()
    }
}
