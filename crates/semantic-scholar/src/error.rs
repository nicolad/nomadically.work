use thiserror::Error;

#[derive(Debug, Error)]
pub enum Error {
    #[error("HTTP error: {0}")]
    Http(#[from] reqwest::Error),

    #[error("API error {status}: {message}")]
    Api { status: u16, message: String },

    #[error("Rate limited (429): retry after {retry_after}s")]
    RateLimited { retry_after: u64 },

    #[error("Deserialization error: {0}")]
    Json(#[from] serde_json::Error),
}
