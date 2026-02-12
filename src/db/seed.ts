import type Database from 'better-sqlite3';

const CUSTOMERS = [
  ['cus_alice', 'Alice Alder', 'alice@example.test'],
  ['cus_bob', 'Bob Birch', 'bob@example.test'],
  ['cus_carol', 'Carol Cedar', 'carol@example.test'],
] as const;

// sku, name, unit price (cents), tax category, on-hand stock
const PRODUCTS = [
  ['SKU-TENT-2P', 'Trailhead 2-Person Tent', 18900, 'GENERAL', 25],
  ['SKU-BAG-20F', 'Summit 20F Sleeping Bag', 12900, 'GENERAL', 40],
  ['SKU-PAD-REG', 'Insulated Sleeping Pad', 6500, 'GENERAL', 60],
  ['SKU-STOVE-1', 'Pocket Stove', 4500, 'GENERAL', 80],
  ['SKU-FUEL-8', 'Fuel Canister 8oz', 899, 'GENERAL', 200],
  ['SKU-JKT-M', 'Trail Shell Jacket (M)', 14900, 'APPAREL', 30],
  ['SKU-SOCK-L', 'Wool Hiking Socks (L)', 1050, 'APPAREL', 150],
  ['SKU-HAT-OS', 'Sun Hat', 2500, 'APPAREL', 100],
  ['SKU-BAR-12', 'Trail Bars 12-pack', 1800, 'EXEMPT', 300],
  ['SKU-WATER-1', 'Water Bottle 1L', 1500, 'GENERAL', 120],
  ['SKU-HEAD-LED', 'Headlamp', 3500, 'GENERAL', 70],
  ['SKU-KNIFE-F', 'Field Knife', 5500, 'GENERAL', 45],
] as const;

const PROMOS = [
  ['SAVE10', 10],
  ['SAVE20', 20],
] as const;

/** Idempotent: does nothing when products already exist. */
export function seedIfEmpty(db: Database.Database): void {
  const existing = db.prepare('SELECT COUNT(*) AS n FROM products').get() as { n: number };
  if (existing.n > 0) {
    return;
  }
  const insertCustomer = db.prepare('INSERT INTO customers (id, name, email) VALUES (?, ?, ?)');
  const insertProduct = db.prepare(
    'INSERT INTO products (sku, name, unit_price_cents, tax_category) VALUES (?, ?, ?, ?)',
  );
  const insertStock = db.prepare('INSERT INTO stock_items (sku, on_hand, reserved) VALUES (?, ?, 0)');
  const insertPromo = db.prepare('INSERT INTO promo_codes (code, percent) VALUES (?, ?)');
  db.transaction(() => {
    for (const c of CUSTOMERS) insertCustomer.run(...c);
    for (const [sku, name, price, tax, stock] of PRODUCTS) {
      insertProduct.run(sku, name, price, tax);
      insertStock.run(sku, stock);
    }
    for (const p of PROMOS) insertPromo.run(...p);
  })();
}
