CREATE TABLE IF NOT EXISTS orders (
  id              TEXT PRIMARY KEY,
  created_at      TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'pending',
  customer_email  TEXT NOT NULL,
  customer_name   TEXT,
  customer_phone  TEXT,
  address_line1   TEXT,
  address_line2   TEXT,
  address_city    TEXT,
  address_state   TEXT,
  address_postal  TEXT,
  amount_total    INTEGER NOT NULL,
  client_ref      TEXT,
  tracking_code   TEXT,
  error_log       TEXT
);

CREATE INDEX IF NOT EXISTS idx_created ON orders(created_at DESC);
