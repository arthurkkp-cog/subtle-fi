import Database, { Database as DatabaseType } from "better-sqlite3";
import path from "path";
import fs from "fs";

const DB_PATH = path.join(process.cwd(), "data", "subtle-fi.db");

let _db: DatabaseType | null = null;

function getDb(): DatabaseType {
  if (_db) return _db;

  // Ensure data directory exists
  const dataDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  _db = new Database(DB_PATH);

  // Enable WAL mode for better performance
  _db.pragma("journal_mode = WAL");

  // Create tables
  _db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    address1 TEXT,
    city TEXT,
    state TEXT,
    postal_code TEXT,
    date_of_birth TEXT,
    ssn TEXT,
    dwolla_customer_id TEXT,
    dwolla_customer_url TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS banks (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    bank_id TEXT NOT NULL,
    account_id TEXT NOT NULL,
    access_token TEXT NOT NULL,
    funding_source_url TEXT,
    shareable_id TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS loan_applications (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    loan_type TEXT NOT NULL CHECK(loan_type IN ('mortgage', 'auto', 'personal', 'education')),
    requested_amount REAL NOT NULL,
    term_months INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'submitted', 'under_review', 'approved', 'denied')),
    estimated_apr REAL NOT NULL DEFAULT 0,
    estimated_monthly_payment REAL NOT NULL DEFAULT 0,
    conditional_fields TEXT DEFAULT '{}',
    first_name TEXT,
    last_name TEXT,
    email TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    postal_code TEXT,
    date_of_birth TEXT,
    annual_income REAL,
    employment_status TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
  CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
  CREATE INDEX IF NOT EXISTS idx_banks_user_id ON banks(user_id);
  CREATE INDEX IF NOT EXISTS idx_banks_account_id ON banks(account_id);
  CREATE INDEX IF NOT EXISTS idx_loan_applications_user_id ON loan_applications(user_id);
  CREATE INDEX IF NOT EXISTS idx_loan_applications_status ON loan_applications(status);
`);

  return _db;
}

export default getDb;
