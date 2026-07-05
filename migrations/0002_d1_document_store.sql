-- GiftCash Cloudflare D1 document compatibility store
-- Temporary compatibility layer used while server routes are moved from
-- Firebase Admin/Firestore APIs to first-class relational D1 repositories.

CREATE TABLE IF NOT EXISTS documents (
  collection_name TEXT NOT NULL,
  document_id TEXT NOT NULL,
  data_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  PRIMARY KEY (collection_name, document_id)
);

CREATE INDEX IF NOT EXISTS idx_documents_collection_updated
  ON documents(collection_name, updated_at DESC);
