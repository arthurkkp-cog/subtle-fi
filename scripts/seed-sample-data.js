/**
 * Seed script to create sample data for testing
 * Run with: node scripts/seed-sample-data.js
 */

const Database = require("better-sqlite3");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
function uuidv4() {
  return crypto.randomUUID();
}
const path = require("path");
const fs = require("fs");

const DB_PATH = path.join(process.cwd(), "data", "subtle-fi.db");

// Ensure data directory exists
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");

// Create tables if they don't exist
db.exec(`
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

  CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
  CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
  CREATE INDEX IF NOT EXISTS idx_banks_user_id ON banks(user_id);
  CREATE INDEX IF NOT EXISTS idx_banks_account_id ON banks(account_id);
`);

async function seedData() {
  const email = "alekchen96@gmail.com";
  const password = "password123";
  
  // Check if user already exists
  const existingUser = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
  
  let userId;
  
  if (existingUser) {
    console.log(`User ${email} already exists, using existing account`);
    userId = existingUser.id;
  } else {
    // Create user
    userId = uuidv4();
    const passwordHash = await bcrypt.hash(password, 10);
    
    db.prepare(`
      INSERT INTO users (id, email, password_hash, first_name, last_name, address1, city, state, postal_code, date_of_birth, ssn, dwolla_customer_id, dwolla_customer_url)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      userId,
      email,
      passwordHash,
      "Alek",
      "Chen",
      "123 Main Street",
      "San Francisco",
      "CA",
      "94102",
      "1996-05-15",
      "1234",
      "sample-dwolla-id-123",
      "https://api-sandbox.dwolla.com/customers/sample-dwolla-id-123"
    );
    
    console.log(`Created user: ${email} with password: ${password}`);
  }
  
  // Check if banks already exist for this user
  const existingBanks = db.prepare("SELECT COUNT(*) as count FROM banks WHERE user_id = ?").get(userId);
  
  if (existingBanks.count > 0) {
    console.log(`User already has ${existingBanks.count} bank account(s), skipping bank creation`);
  } else {
    // Create sample bank accounts
    const banks = [
      {
        id: uuidv4(),
        bankId: "mizuho-bank-item-123",
        accountId: "chase-checking-456",
        accessToken: "sample-access-token-mizuho",
        fundingSourceUrl: "https://api-sandbox.dwolla.com/funding-sources/mizuho-123",
        shareableId: "enc_mizuho_456",
        name: "Mizuho Bank Checking"
      },
      {
        id: uuidv4(),
        bankId: "mizuho-trust-item-789",
        accountId: "bofa-savings-012",
        accessToken: "sample-access-token-mizuho-trust",
        fundingSourceUrl: "https://api-sandbox.dwolla.com/funding-sources/mizuho-trust-789",
        shareableId: "enc_mizuho_trust_012",
        name: "Mizuho Trust Savings"
      }
    ];
    
    for (const bank of banks) {
      db.prepare(`
        INSERT INTO banks (id, user_id, bank_id, account_id, access_token, funding_source_url, shareable_id)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        bank.id,
        userId,
        bank.bankId,
        bank.accountId,
        bank.accessToken,
        bank.fundingSourceUrl,
        bank.shareableId
      );
      console.log(`Created bank account: ${bank.name}`);
    }
  }
  
  // Create a session for easy login
  const sessionId = uuidv4();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);
  
  db.prepare(`
    INSERT INTO sessions (id, user_id, expires_at)
    VALUES (?, ?, ?)
  `).run(sessionId, userId, expiresAt.toISOString());
  
  console.log(`\n✅ Sample data created successfully!`);
  console.log(`\nLogin credentials:`);
  console.log(`  Email: ${email}`);
  console.log(`  Password: ${password}`);
  console.log(`\nSession token (for cookie): ${sessionId}`);
  
  db.close();
}

seedData().catch(console.error);
