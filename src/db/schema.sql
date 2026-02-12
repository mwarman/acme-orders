CREATE TABLE IF NOT EXISTS customers (
  id    TEXT PRIMARY KEY,
  name  TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS products (
  sku              TEXT PRIMARY KEY,
  name             TEXT NOT NULL,
  unit_price_cents INTEGER NOT NULL CHECK (unit_price_cents >= 0),
  tax_category     TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS promo_codes (
  code    TEXT PRIMARY KEY,
  percent INTEGER NOT NULL CHECK (percent BETWEEN 1 AND 90)
);

CREATE TABLE IF NOT EXISTS stock_items (
  sku      TEXT PRIMARY KEY REFERENCES products (sku),
  on_hand  INTEGER NOT NULL CHECK (on_hand >= 0),
  reserved INTEGER NOT NULL CHECK (reserved >= 0),
  CHECK (reserved <= on_hand)
);

CREATE TABLE IF NOT EXISTS orders (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id     TEXT NOT NULL REFERENCES customers (id),
  status          TEXT NOT NULL,
  promo_code      TEXT,
  subtotal_cents  INTEGER NOT NULL DEFAULT 0,
  discount_cents  INTEGER NOT NULL DEFAULT 0,
  tax_cents       INTEGER NOT NULL DEFAULT 0,
  shipping_cents  INTEGER NOT NULL DEFAULT 0,
  total_cents     INTEGER NOT NULL DEFAULT 0,
  paid_cents      INTEGER NOT NULL DEFAULT 0,
  refunded_cents  INTEGER NOT NULL DEFAULT 0,
  placed_at       TEXT,
  delivered_at    TEXT,
  created_at      TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS order_items (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id         INTEGER NOT NULL REFERENCES orders (id),
  sku              TEXT NOT NULL REFERENCES products (sku),
  qty              INTEGER NOT NULL CHECK (qty > 0),
  unit_price_cents INTEGER NOT NULL,
  promo_code       TEXT
);

CREATE TABLE IF NOT EXISTS payments (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id        INTEGER NOT NULL REFERENCES orders (id),
  amount_cents    INTEGER NOT NULL,
  gateway_ref     TEXT,
  status          TEXT NOT NULL,
  idempotency_key TEXT,
  created_at      TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS refunds (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id       INTEGER NOT NULL REFERENCES orders (id),
  status         TEXT NOT NULL,
  reason         TEXT NOT NULL,
  amount_cents   INTEGER NOT NULL,
  shipping_cents INTEGER NOT NULL DEFAULT 0,
  fee_cents      INTEGER NOT NULL DEFAULT 0,
  requested_by   TEXT NOT NULL,
  approved_by    TEXT,
  gateway_ref    TEXT,
  notes          TEXT,
  created_at     TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS refund_lines (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  refund_id       INTEGER NOT NULL REFERENCES refunds (id),
  order_item_id   INTEGER NOT NULL REFERENCES order_items (id),
  qty             INTEGER NOT NULL CHECK (qty > 0),
  amount_cents    INTEGER NOT NULL,
  return_to_stock INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS outbox_events (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  type       TEXT NOT NULL,
  payload    TEXT NOT NULL,
  status     TEXT NOT NULL DEFAULT 'PENDING',
  created_at TEXT NOT NULL
);
