CREATE TABLE IF NOT EXISTS papers (
  id TEXT PRIMARY KEY,
  school TEXT NOT NULL,
  author TEXT NOT NULL,
  coauthors TEXT,
  email TEXT,
  title TEXT NOT NULL,
  link TEXT,
  file_key TEXT,
  file_name TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_status ON papers(status, created);
