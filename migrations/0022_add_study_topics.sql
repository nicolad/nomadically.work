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
INSERT INTO study_topics (category, topic, title, summary, body_md, difficulty, tags, created_at, updated_at)
VALUES (
  'db',
  'foreign-key',
  'Foreign Keys',
  'A foreign key is a column (or set of columns) in one table that references the primary key of another table, enforcing referential integrity between related data.',
  '## What is a Foreign Key?

A **foreign key** is a constraint that links a column in one table (the *child* table) to the primary key (or unique key) of another table (the *parent* table). It enforces **referential integrity** — the database guarantees that a referenced row actually exists.

```sql
CREATE TABLE orders (
  id       INTEGER PRIMARY KEY,
  user_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  total    DECIMAL(10,2)
);
```

---

## Why They Matter

| Without FK | With FK |
|---|---|
| Orphaned rows accumulate silently | DB rejects inserts/updates that violate the constraint |
| Application code must enforce consistency | Constraint enforced at the storage layer |
| Bugs surface late (at query time) | Bugs surface immediately (at write time) |

---

## Referential Actions

What happens when the parent row is deleted or updated:

| Action | Behavior |
|---|---|
| `RESTRICT` / `NO ACTION` | Reject the delete/update if child rows exist (default) |
| `CASCADE` | Automatically delete/update child rows |
| `SET NULL` | Set FK column to NULL in child rows |
| `SET DEFAULT` | Set FK column to its default value |

```sql
-- Cascade delete: removing a user deletes their posts too
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE

-- Set null: removing a category un-assigns its products
FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
```

---

## Composite Foreign Keys

A FK can span multiple columns when the parent has a composite primary key:

```sql
CREATE TABLE order_items (
  order_id   INTEGER,
  product_id INTEGER,
  qty        INTEGER,
  PRIMARY KEY (order_id, product_id),
  FOREIGN KEY (order_id, product_id) REFERENCES inventory(order_id, product_id)
);
```

---

## Indexing FKs

Foreign key columns should almost always be indexed — without an index, every parent delete triggers a full table scan of the child table.

```sql
CREATE INDEX idx_orders_user_id ON orders(user_id);
```

Most databases (PostgreSQL, MySQL) do NOT automatically create an index on FK columns. SQLite does not enforce FK constraints unless `PRAGMA foreign_keys = ON` is set.

---

## SQLite / D1 Gotcha

SQLite parses FK syntax but **does not enforce it by default**:

```sql
PRAGMA foreign_keys = ON;  -- must be set per connection
```

In Cloudflare D1, enable this pragma at the start of each connection if you rely on FK constraints.

---

## Common Interview Questions

1. **What is referential integrity?** The guarantee that a FK value always points to an existing parent row (or is NULL).
2. **FK vs JOIN** — A FK enforces a relationship; a JOIN uses it. You can JOIN without a FK, but the FK makes the relationship explicit and safe.
3. **Can a FK reference a non-PK column?** Yes — it must reference a column with a `UNIQUE` constraint.
4. **Circular FKs** — Two tables can reference each other, but inserting requires deferrable constraints or inserting NULLs first.
5. **Performance** — FKs add a lookup cost on every write to the child table. Always index the FK column.

---

## Quick Reference

```sql
-- Inline FK declaration
user_id INTEGER NOT NULL REFERENCES users(id)

-- Table-level constraint with action
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE

-- Add FK to existing table (PostgreSQL/MySQL)
ALTER TABLE orders ADD CONSTRAINT fk_orders_user
  FOREIGN KEY (user_id) REFERENCES users(id);

-- Check for orphaned rows
SELECT * FROM orders WHERE user_id NOT IN (SELECT id FROM users);
```',
  'intermediate',
  '["referential integrity","constraints","SQL","relational databases","indexes","SQLite"]',
  datetime('now'),
  datetime('now')
);
