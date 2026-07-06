-- Occasion event commerce tables: invites, RSVP, tickets, tables, seating, check-in.

CREATE TABLE IF NOT EXISTS event_ticket_types (
  id TEXT PRIMARY KEY,
  event_slug TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  price INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'NGN',
  quantity INTEGER NOT NULL DEFAULT 0,
  sold INTEGER NOT NULL DEFAULT 0,
  benefits_json TEXT NOT NULL DEFAULT '[]',
  sale_starts_at TEXT,
  sale_ends_at TEXT,
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0,1)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  FOREIGN KEY (event_slug) REFERENCES events(slug) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_event_ticket_types_event ON event_ticket_types(event_slug, active);

CREATE TABLE IF NOT EXISTS event_tables (
  id TEXT PRIMARY KEY,
  event_slug TEXT NOT NULL,
  name TEXT NOT NULL,
  section TEXT,
  capacity INTEGER NOT NULL,
  price INTEGER,
  currency TEXT NOT NULL DEFAULT 'NGN',
  buyer_name TEXT,
  buyer_email TEXT,
  payment_status TEXT,
  assigned_guest_ids_json TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  FOREIGN KEY (event_slug) REFERENCES events(slug) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_event_tables_event ON event_tables(event_slug, section);

CREATE TABLE IF NOT EXISTS event_guests (
  id TEXT PRIMARY KEY,
  event_slug TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  category TEXT,
  rsvp_status TEXT NOT NULL DEFAULT 'invited',
  plus_ones INTEGER NOT NULL DEFAULT 0,
  table_id TEXT,
  seat_label TEXT,
  invite_code TEXT NOT NULL UNIQUE,
  ticket_id TEXT,
  checked_in_at TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  FOREIGN KEY (event_slug) REFERENCES events(slug) ON DELETE CASCADE,
  FOREIGN KEY (table_id) REFERENCES event_tables(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_event_guests_event_status ON event_guests(event_slug, rsvp_status);
CREATE INDEX IF NOT EXISTS idx_event_guests_invite_code ON event_guests(invite_code);

CREATE TABLE IF NOT EXISTS event_tickets (
  id TEXT PRIMARY KEY,
  event_slug TEXT NOT NULL,
  ticket_type_id TEXT NOT NULL,
  buyer_name TEXT NOT NULL,
  buyer_email TEXT,
  quantity INTEGER NOT NULL,
  total_amount INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'NGN',
  status TEXT NOT NULL DEFAULT 'pending_payment',
  qr_code TEXT NOT NULL UNIQUE,
  table_id TEXT,
  guest_ids_json TEXT NOT NULL DEFAULT '[]',
  payment_reference TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  checked_in_at TEXT,
  FOREIGN KEY (event_slug) REFERENCES events(slug) ON DELETE CASCADE,
  FOREIGN KEY (ticket_type_id) REFERENCES event_ticket_types(id) ON DELETE RESTRICT,
  FOREIGN KEY (table_id) REFERENCES event_tables(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_event_tickets_event_status ON event_tickets(event_slug, status);
CREATE INDEX IF NOT EXISTS idx_event_tickets_qr_code ON event_tickets(qr_code);
