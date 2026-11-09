CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',   -- pending | approved | denied
  created_at INTEGER NOT NULL
);

-- One table for every secret link/session. Only the SHA-256 of the token is stored.
CREATE TABLE tokens (
  hash TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  purpose TEXT NOT NULL,                    -- approve | login | session
  expires_at INTEGER NOT NULL,
  used_at INTEGER
);
CREATE INDEX tokens_user ON tokens(user_id, purpose);

CREATE TABLE comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  day TEXT NOT NULL,                        -- page slug, e.g. 2026-11-09-athanasius
  panel TEXT NOT NULL DEFAULT '',           -- '' = whole-day thread; else saint | fathers | summa
  parent_id INTEGER REFERENCES comments(id),
  user_id INTEGER NOT NULL REFERENCES users(id),
  body TEXT NOT NULL,
  quote TEXT,                               -- highlighted passage (text-quote anchor)
  prefix TEXT,
  suffix TEXT,
  created_at INTEGER NOT NULL,
  deleted INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX comments_day ON comments(day);

CREATE TABLE hits (
  key TEXT NOT NULL,
  at INTEGER NOT NULL
);
CREATE INDEX hits_key ON hits(key, at);
