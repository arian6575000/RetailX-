// Append-only list of SQL migrations (index + 1 = PRAGMA user_version). NEVER edit an old entry once an APK has shipped:
// add a new string instead. Keep BACKUP_TABLES (tables.ts) in sync with the tables created here.
export const MIGRATIONS: string[] = [
  // v1 — core
  `
  CREATE TABLE settings (id TEXT PRIMARY KEY NOT NULL, data TEXT NOT NULL);
  `,
  // v2 — RetailX register
  `
  CREATE TABLE staff (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'cashier',
    pin_hash TEXT NOT NULL,
    pin_salt TEXT NOT NULL,
    active INTEGER NOT NULL DEFAULT 1,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT NOT NULL DEFAULT '',
    notes TEXT NOT NULL DEFAULT '',
    total_spent REAL NOT NULL DEFAULT 0,
    visits INTEGER NOT NULL DEFAULT 0,
    last_visit INTEGER,
    created_at INTEGER NOT NULL
  );
  CREATE INDEX idx_customers_name ON customers(name);

  CREATE TABLE products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'Uncategorized',
    price REAL NOT NULL,
    cost REAL,
    stock REAL,                       -- NULL = unlimited / not tracked
    unit TEXT NOT NULL DEFAULT 'ea',
    barcode TEXT NOT NULL DEFAULT '',
    sku TEXT NOT NULL DEFAULT '',
    created_at INTEGER NOT NULL
  );
  CREATE INDEX idx_products_barcode ON products(barcode);
  CREATE INDEX idx_products_name ON products(name);

  CREATE TABLE sales (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    number TEXT NOT NULL UNIQUE,
    subtotal REAL NOT NULL,
    discount REAL NOT NULL DEFAULT 0,
    tax REAL NOT NULL DEFAULT 0,
    total REAL NOT NULL,
    payment_method TEXT NOT NULL DEFAULT 'cash',
    tendered REAL,
    customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
    staff_id INTEGER REFERENCES staff(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'completed',
    refunded_at INTEGER,
    refunded_by INTEGER,
    created_at INTEGER NOT NULL
  );
  CREATE INDEX idx_sales_created ON sales(created_at);
  CREATE INDEX idx_sales_staff ON sales(staff_id);

  CREATE TABLE sale_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sale_id INTEGER NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'Other',   -- snapshot: reports stay correct after a product is deleted
    price REAL NOT NULL,
    cost REAL,
    qty REAL NOT NULL,
    line_total REAL NOT NULL
  );
  CREATE INDEX idx_sale_items_sale ON sale_items(sale_id);

  CREATE TABLE expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    category TEXT NOT NULL,
    amount REAL NOT NULL,
    note TEXT NOT NULL DEFAULT '',
    staff_id INTEGER REFERENCES staff(id) ON DELETE SET NULL,
    created_at INTEGER NOT NULL
  );
  CREATE INDEX idx_expenses_date ON expenses(date);
  `,
];
