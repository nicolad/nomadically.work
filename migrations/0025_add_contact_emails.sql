CREATE TABLE IF NOT EXISTS contact_emails (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  contact_id INTEGER NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  resend_id TEXT NOT NULL,
  from_email TEXT NOT NULL,
  to_emails TEXT NOT NULL, -- JSON array
  subject TEXT NOT NULL,
  text_content TEXT,
  status TEXT NOT NULL DEFAULT 'sent',
  sent_at TEXT,
  recipient_name TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_contact_emails_contact_id ON contact_emails(contact_id);
CREATE INDEX idx_contact_emails_resend_id ON contact_emails(resend_id);
