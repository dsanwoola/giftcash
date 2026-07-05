-- GiftCash Cloudflare D1 initial schema
-- Mirrors current Firestore collections while moving high-contention/append-only
-- data into relational rows. Domain objects that are nested in Firestore are kept
-- as JSON TEXT at first to minimize UI/data-layer churn.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  photo_url TEXT,
  country TEXT NOT NULL DEFAULT 'NG',
  currency TEXT NOT NULL DEFAULT 'NGN',
  kyc_status TEXT NOT NULL DEFAULT 'none' CHECK (kyc_status IN ('none','pending','verified','rejected')),
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user','admin')),
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON profiles(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_kyc_status ON profiles(kyc_status);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

CREATE TABLE IF NOT EXISTS gifts (
  slug TEXT PRIMARY KEY,
  id TEXT NOT NULL UNIQUE,
  sender_id TEXT NOT NULL,
  sender_name TEXT NOT NULL,
  anonymous INTEGER NOT NULL CHECK (anonymous IN (0,1)),
  occasion TEXT NOT NULL,
  theme TEXT NOT NULL,
  recipient_name TEXT NOT NULL,
  recipient_nickname TEXT,
  recipient_phone TEXT,
  recipient_email TEXT,
  amount INTEGER NOT NULL,
  currency TEXT NOT NULL,
  service_fee INTEGER NOT NULL,
  add_ons_json TEXT NOT NULL DEFAULT '{}',
  message TEXT NOT NULL,
  media_json TEXT NOT NULL DEFAULT '[]',
  delivery TEXT NOT NULL,
  scheduled_at TEXT,
  reveal_gate TEXT NOT NULL,
  reveal_question TEXT,
  reveal_answer TEXT,
  mystery INTEGER NOT NULL CHECK (mystery IN (0,1)),
  private_gift INTEGER NOT NULL CHECK (private_gift IN (0,1)),
  status TEXT NOT NULL,
  payment_status TEXT NOT NULL,
  claim_status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  opened_at TEXT,
  claimed_at TEXT,
  claimed_by_user_id TEXT,
  thank_you_json TEXT,
  FOREIGN KEY (sender_id) REFERENCES profiles(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_gifts_sender_created ON gifts(sender_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_gifts_claimed_by_claimed_at ON gifts(claimed_by_user_id, claimed_at DESC);
CREATE INDEX IF NOT EXISTS idx_gifts_status ON gifts(status);
CREATE INDEX IF NOT EXISTS idx_gifts_payment_status ON gifts(payment_status);

CREATE TABLE IF NOT EXISTS ledger_entries (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  wallet_id TEXT NOT NULL,
  transaction_type TEXT NOT NULL,
  amount INTEGER NOT NULL,
  currency TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('credit','debit')),
  reference TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending','settled','reversed')),
  metadata_json TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_ledger_user_created ON ledger_entries(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ledger_user_reference_type ON ledger_entries(user_id, reference, transaction_type);
CREATE INDEX IF NOT EXISTS idx_ledger_reference ON ledger_entries(reference);

CREATE TABLE IF NOT EXISTS withdrawals (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  amount INTEGER NOT NULL,
  currency TEXT NOT NULL,
  bank_json TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  processed_at TEXT,
  processed_by TEXT,
  reference TEXT NOT NULL UNIQUE,
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_withdrawals_user_created ON withdrawals(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_withdrawals_status_created ON withdrawals(status, created_at DESC);

CREATE TABLE IF NOT EXISTS group_gifts (
  slug TEXT PRIMARY KEY,
  id TEXT NOT NULL UNIQUE,
  organizer_id TEXT NOT NULL,
  organizer_name TEXT NOT NULL,
  occasion TEXT NOT NULL,
  theme TEXT NOT NULL,
  recipient_name TEXT NOT NULL,
  title TEXT NOT NULL,
  story TEXT,
  target_amount INTEGER NOT NULL,
  currency TEXT NOT NULL,
  deadline TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (organizer_id) REFERENCES profiles(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_group_gifts_organizer_created ON group_gifts(organizer_id, created_at DESC);

CREATE TABLE IF NOT EXISTS group_contributions (
  id TEXT PRIMARY KEY,
  group_slug TEXT NOT NULL,
  name TEXT NOT NULL,
  anonymous INTEGER NOT NULL CHECK (anonymous IN (0,1)),
  amount INTEGER NOT NULL,
  message TEXT,
  table_label TEXT,
  payment_reference TEXT,
  settlement_status TEXT,
  settlement_account_last4 TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (group_slug) REFERENCES group_gifts(slug) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_group_contributions_group_created ON group_contributions(group_slug, created_at DESC);

CREATE TABLE IF NOT EXISTS events (
  slug TEXT PRIMARY KEY,
  id TEXT NOT NULL UNIQUE,
  organizer_id TEXT NOT NULL,
  organizer_name TEXT NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  celebrants TEXT NOT NULL,
  date TEXT NOT NULL,
  starts_at TEXT,
  ends_at TEXT,
  story TEXT,
  gradient_json TEXT NOT NULL,
  currency TEXT NOT NULL,
  show_total INTEGER NOT NULL CHECK (show_total IN (0,1)),
  goal_amount INTEGER,
  sound_theme TEXT,
  campaign_mode INTEGER CHECK (campaign_mode IN (0,1)),
  max_contribution INTEGER,
  settlement_account_json TEXT,
  payout_provider TEXT,
  is_public INTEGER NOT NULL CHECK (is_public IN (0,1)),
  created_at TEXT NOT NULL,
  FOREIGN KEY (organizer_id) REFERENCES profiles(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_events_organizer_created ON events(organizer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_public_created ON events(is_public, created_at DESC);

CREATE TABLE IF NOT EXISTS event_contributions (
  id TEXT PRIMARY KEY,
  event_slug TEXT NOT NULL,
  name TEXT NOT NULL,
  anonymous INTEGER NOT NULL CHECK (anonymous IN (0,1)),
  amount INTEGER NOT NULL,
  message TEXT,
  table_label TEXT,
  payment_reference TEXT UNIQUE,
  settlement_status TEXT,
  settlement_account_last4 TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (event_slug) REFERENCES events(slug) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_event_contributions_event_created ON event_contributions(event_slug, created_at DESC);

CREATE TABLE IF NOT EXISTS payment_intents (
  id TEXT PRIMARY KEY,
  provider TEXT,
  reference TEXT NOT NULL UNIQUE,
  event_slug TEXT NOT NULL,
  event_id TEXT NOT NULL,
  expected_amount INTEGER NOT NULL,
  service_fee INTEGER NOT NULL,
  total_transfer_amount INTEGER,
  total_charge_amount INTEGER,
  currency TEXT NOT NULL,
  contribution_json TEXT NOT NULL,
  status TEXT NOT NULL,
  settlement_account_json TEXT,
  alert_id TEXT,
  bank_document_number TEXT,
  review_reason TEXT,
  authorization_url TEXT,
  access_code TEXT,
  provider_status TEXT,
  provider_channel TEXT,
  provider_message TEXT,
  created_at TEXT NOT NULL,
  expires_at TEXT,
  confirmed_at TEXT,
  failed_at TEXT,
  FOREIGN KEY (event_slug) REFERENCES events(slug) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_payment_intents_event_created ON payment_intents(event_slug, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_intents_status_created ON payment_intents(status, created_at DESC);

CREATE TABLE IF NOT EXISTS bank_alerts (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL,
  is_credit INTEGER NOT NULL CHECK (is_credit IN (0,1)),
  sender_email TEXT,
  recipient_email TEXT,
  subject TEXT,
  account_last4 TEXT,
  amount INTEGER,
  currency TEXT,
  description TEXT,
  document_number TEXT,
  value_date TEXT,
  transaction_time TEXT,
  payment_reference TEXT,
  raw_text TEXT NOT NULL,
  received_at TEXT NOT NULL,
  status TEXT NOT NULL,
  matched_intent_id TEXT,
  matched_reference TEXT,
  match_score INTEGER NOT NULL,
  review_reason TEXT,
  reviewed_by TEXT,
  reviewed_at TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_bank_alerts_status_created ON bank_alerts(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bank_alerts_reference ON bank_alerts(matched_reference);

CREATE TABLE IF NOT EXISTS payment_reconciliation_logs (
  id TEXT PRIMARY KEY,
  action TEXT NOT NULL,
  reference TEXT,
  event_slug TEXT,
  alert_id TEXT,
  amount INTEGER,
  contribution_amount INTEGER,
  service_fee INTEGER,
  reviewed_by TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_reconciliation_logs_created ON payment_reconciliation_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reconciliation_logs_reference ON payment_reconciliation_logs(reference);

CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id TEXT PRIMARY KEY,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id TEXT,
  reference TEXT,
  reviewed_by TEXT,
  from_value TEXT,
  to_value TEXT,
  note TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_created ON admin_audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_target ON admin_audit_logs(target_type, target_id);

CREATE TABLE IF NOT EXISTS fraud_flags (
  id TEXT PRIMARY KEY,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  metadata_json TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_fraud_flags_status_created ON fraud_flags(status, created_at DESC);
