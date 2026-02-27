CREATE TABLE `study_topics` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `category` text NOT NULL,
  `topic` text NOT NULL,
  `title` text NOT NULL,
  `summary` text,
  `body_md` text,
  `difficulty` text NOT NULL DEFAULT 'intermediate',
  `tags` text,
  `created_at` text NOT NULL DEFAULT (datetime('now')),
  `updated_at` text NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX `idx_study_topics_category_topic` ON `study_topics` (`category`, `topic`);

INSERT INTO `study_topics` (`category`, `topic`, `title`, `summary`, `body_md`, `difficulty`, `tags`)
VALUES (
  'db',
  'acid',
  'ACID Properties',
  'The four guarantees that database transactions provide: Atomicity, Consistency, Isolation, and Durability.',
  '# ACID Properties

ACID is an acronym describing four key properties that database transactions must guarantee to ensure data integrity, even in the face of errors, power failures, or concurrent access.

## Atomicity

A transaction is an **all-or-nothing** operation. Either every statement in the transaction succeeds, or none of them take effect. If any part fails, the entire transaction is rolled back to its previous state.

**Example:** Transferring money between accounts — both the debit and credit must succeed, or neither should.

```sql
BEGIN TRANSACTION;
UPDATE accounts SET balance = balance - 100 WHERE id = 1;
UPDATE accounts SET balance = balance + 100 WHERE id = 2;
COMMIT;
-- If either UPDATE fails, both are rolled back
```

## Consistency

A transaction moves the database from one **valid state** to another valid state. All defined rules — constraints, cascades, triggers — are enforced. If a transaction would violate any integrity constraint, it is aborted.

**Key points:**
- Foreign key constraints remain valid
- CHECK constraints are enforced
- NOT NULL and UNIQUE constraints hold
- Application-level invariants (e.g., "total balance across all accounts is constant") are preserved

## Isolation

Concurrent transactions execute as if they were **serialized** — each transaction is unaware of other in-flight transactions. The degree of isolation is configurable via isolation levels:

| Level | Dirty Read | Non-Repeatable Read | Phantom Read |
|-------|-----------|-------------------|-------------|
| Read Uncommitted | Possible | Possible | Possible |
| Read Committed | No | Possible | Possible |
| Repeatable Read | No | No | Possible |
| Serializable | No | No | No |

**Trade-off:** Higher isolation = more correctness but lower concurrency and throughput.

## Durability

Once a transaction is **committed**, its changes are permanent — they survive system crashes, power failures, and restarts. This is typically implemented via write-ahead logging (WAL) or journaling.

**Implementation mechanisms:**
- Write-Ahead Log (WAL) — changes written to log before data files
- Checkpointing — periodic flushing of in-memory state to disk
- Replication — copies on multiple nodes for fault tolerance

## ACID in Practice

### SQLite (D1)
SQLite provides full ACID compliance using a journal file or WAL mode. Each transaction is atomic, and the database file is always in a consistent state.

### PostgreSQL
Full ACID with MVCC (Multi-Version Concurrency Control) for isolation. Default isolation level is Read Committed.

### NoSQL Trade-offs
Many NoSQL databases relax ACID guarantees for better performance and scalability (see BASE: Basically Available, Soft state, Eventually consistent).

## Interview Tips

- Be ready to explain each letter with a concrete example
- Understand the trade-off between isolation levels and performance
- Know when ACID is overkill (e.g., analytics pipelines, event logs)
- Be able to compare ACID vs BASE and when each is appropriate
- Mention WAL as the standard durability mechanism
',
  'intermediate',
  '["databases", "transactions", "consistency", "interviews"]'
);
