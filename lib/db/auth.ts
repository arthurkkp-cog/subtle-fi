"use server";

import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import getDb from "./schema";

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  address1?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  dateOfBirth?: string;
  ssn?: string;
  dwollaCustomerId?: string;
  dwollaCustomerUrl?: string;
  $id?: string; // Alias for compatibility with existing code
}

export interface Session {
  id: string;
  userId: string;
  expiresAt: Date;
}

const SALT_ROUNDS = 10;
const SESSION_DURATION_DAYS = 30;

// User operations
export async function createUser(userData: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  address1?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  dateOfBirth?: string;
  ssn?: string;
}): Promise<User> {
  const id = uuidv4();
  const passwordHash = await bcrypt.hash(userData.password, SALT_ROUNDS);

  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO users (id, email, password_hash, first_name, last_name, address1, city, state, postal_code, date_of_birth, ssn)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    id,
    userData.email,
    passwordHash,
    userData.firstName,
    userData.lastName,
    userData.address1 || null,
    userData.city || null,
    userData.state || null,
    userData.postalCode || null,
    userData.dateOfBirth || null,
    userData.ssn || null
  );

  return getUserById(id) as Promise<User>;
}

export async function getUserById(id: string): Promise<User | null> {
  const db = getDb();
  const stmt = db.prepare(`SELECT * FROM users WHERE id = ?`);
  const row = stmt.get(id) as any;

  if (!row) return null;

  return mapRowToUser(row);
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const db = getDb();
  const stmt = db.prepare(`SELECT * FROM users WHERE email = ?`);
  const row = stmt.get(email) as any;

  if (!row) return null;

  return mapRowToUser(row);
}

export async function verifyPassword(
  email: string,
  password: string
): Promise<User | null> {
  const db = getDb();
  const stmt = db.prepare(`SELECT * FROM users WHERE email = ?`);
  const row = stmt.get(email) as any;

  if (!row) return null;

  const isValid = await bcrypt.compare(password, row.password_hash);
  if (!isValid) return null;

  return mapRowToUser(row);
}

export async function updateUser(
  id: string,
  updates: Partial<Omit<User, "id" | "$id">>
): Promise<User | null> {
  const fields: string[] = [];
  const values: any[] = [];

  if (updates.dwollaCustomerId !== undefined) {
    fields.push("dwolla_customer_id = ?");
    values.push(updates.dwollaCustomerId);
  }
  if (updates.dwollaCustomerUrl !== undefined) {
    fields.push("dwolla_customer_url = ?");
    values.push(updates.dwollaCustomerUrl);
  }

  if (fields.length === 0) return getUserById(id);

  fields.push("updated_at = datetime('now')");
  values.push(id);

  const db = getDb();
  const stmt = db.prepare(`UPDATE users SET ${fields.join(", ")} WHERE id = ?`);
  stmt.run(...values);

  return getUserById(id);
}

// Session operations
export async function createSession(userId: string): Promise<Session> {
  const id = uuidv4();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SESSION_DURATION_DAYS);

  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO sessions (id, user_id, expires_at)
    VALUES (?, ?, ?)
  `);

  stmt.run(id, userId, expiresAt.toISOString());

  return { id, userId, expiresAt };
}

export async function getSession(sessionId: string): Promise<Session | null> {
  const db = getDb();
  const stmt = db.prepare(`SELECT * FROM sessions WHERE id = ?`);
  const row = stmt.get(sessionId) as any;

  if (!row) return null;

  const expiresAt = new Date(row.expires_at);
  if (expiresAt < new Date()) {
    // Session expired, delete it
    await deleteSession(sessionId);
    return null;
  }

  return {
    id: row.id,
    userId: row.user_id,
    expiresAt,
  };
}

export async function deleteSession(sessionId: string): Promise<void> {
  const db = getDb();
  const stmt = db.prepare(`DELETE FROM sessions WHERE id = ?`);
  stmt.run(sessionId);
}

export async function deleteUserSessions(userId: string): Promise<void> {
  const db = getDb();
  const stmt = db.prepare(`DELETE FROM sessions WHERE user_id = ?`);
  stmt.run(userId);
}

// Helper function to map database row to User object
function mapRowToUser(row: any): User {
  return {
    id: row.id,
    $id: row.id, // Alias for compatibility
    email: row.email,
    firstName: row.first_name,
    lastName: row.last_name,
    address1: row.address1,
    city: row.city,
    state: row.state,
    postalCode: row.postal_code,
    dateOfBirth: row.date_of_birth,
    ssn: row.ssn,
    dwollaCustomerId: row.dwolla_customer_id,
    dwollaCustomerUrl: row.dwolla_customer_url,
  };
}
