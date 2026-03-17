"use server";

import { v4 as uuidv4 } from "uuid";
import getDb from "./schema";

export interface Bank {
  id: string;
  $id?: string; // Alias for compatibility
  userId: string;
  bankId: string;
  accountId: string;
  accessToken: string;
  fundingSourceUrl?: string;
  shareableId?: string;
}

export async function createBank(bankData: {
  userId: string;
  bankId: string;
  accountId: string;
  accessToken: string;
  fundingSourceUrl?: string;
  shareableId?: string;
}): Promise<Bank> {
  const id = uuidv4();

  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO banks (id, user_id, bank_id, account_id, access_token, funding_source_url, shareable_id)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    id,
    bankData.userId,
    bankData.bankId,
    bankData.accountId,
    bankData.accessToken,
    bankData.fundingSourceUrl || null,
    bankData.shareableId || null
  );

  return getBankById(id) as Promise<Bank>;
}

export async function getBankById(id: string): Promise<Bank | null> {
  const db = getDb();
  const stmt = db.prepare(`SELECT * FROM banks WHERE id = ?`);
  const row = stmt.get(id) as any;

  if (!row) return null;

  return mapRowToBank(row);
}

export async function getBanksByUserId(userId: string): Promise<Bank[]> {
  const db = getDb();
  const stmt = db.prepare(`SELECT * FROM banks WHERE user_id = ?`);
  const rows = stmt.all(userId) as any[];

  return rows.map(mapRowToBank);
}

export async function getBankByAccountId(accountId: string): Promise<Bank | null> {
  const db = getDb();
  const stmt = db.prepare(`SELECT * FROM banks WHERE account_id = ?`);
  const row = stmt.get(accountId) as any;

  if (!row) return null;

  return mapRowToBank(row);
}

function mapRowToBank(row: any): Bank {
  return {
    id: row.id,
    $id: row.id, // Alias for compatibility
    userId: row.user_id,
    bankId: row.bank_id,
    accountId: row.account_id,
    accessToken: row.access_token,
    fundingSourceUrl: row.funding_source_url,
    shareableId: row.shareable_id,
  };
}
