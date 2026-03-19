"use server";

import { v4 as uuidv4 } from "uuid";
import getDb from "./schema";

export interface LoanApplicationRecord {
  id: string;
  userId: string;
  loanType: string;
  requestedAmount: number;
  termMonths: number;
  status: string;
  estimatedAPR: number;
  estimatedMonthlyPayment: number;
  conditionalFields: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  dateOfBirth?: string;
  annualIncome?: number;
  employmentStatus?: string;
  createdAt: string;
  updatedAt: string;
}

export async function createLoanApplication(data: {
  userId: string;
  loanType: string;
  requestedAmount: number;
  termMonths: number;
  status?: string;
  estimatedAPR?: number;
  estimatedMonthlyPayment?: number;
  conditionalFields?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  dateOfBirth?: string;
  annualIncome?: number;
  employmentStatus?: string;
}): Promise<LoanApplicationRecord> {
  const id = uuidv4();
  const db = getDb();

  const stmt = db.prepare(`
    INSERT INTO loan_applications (
      id, user_id, loan_type, requested_amount, term_months, status,
      estimated_apr, estimated_monthly_payment, conditional_fields,
      first_name, last_name, email, address, city, state, postal_code,
      date_of_birth, annual_income, employment_status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    id,
    data.userId,
    data.loanType,
    data.requestedAmount,
    data.termMonths,
    data.status || "draft",
    data.estimatedAPR || 0,
    data.estimatedMonthlyPayment || 0,
    data.conditionalFields || "{}",
    data.firstName || null,
    data.lastName || null,
    data.email || null,
    data.address || null,
    data.city || null,
    data.state || null,
    data.postalCode || null,
    data.dateOfBirth || null,
    data.annualIncome || null,
    data.employmentStatus || null
  );

  return getLoanApplicationById(id) as Promise<LoanApplicationRecord>;
}

export async function getLoanApplicationById(
  id: string
): Promise<LoanApplicationRecord | null> {
  const db = getDb();
  const stmt = db.prepare(`SELECT * FROM loan_applications WHERE id = ?`);
  const row = stmt.get(id) as Record<string, unknown> | undefined;

  if (!row) return null;

  return mapRowToLoanApplication(row);
}

export async function getLoanApplicationsByUserId(
  userId: string
): Promise<LoanApplicationRecord[]> {
  const db = getDb();
  const stmt = db.prepare(
    `SELECT * FROM loan_applications WHERE user_id = ? ORDER BY updated_at DESC`
  );
  const rows = stmt.all(userId) as Record<string, unknown>[];

  return rows.map(mapRowToLoanApplication);
}

export async function updateLoanApplication(
  id: string,
  updates: {
    loanType?: string;
    requestedAmount?: number;
    termMonths?: number;
    status?: string;
    estimatedAPR?: number;
    estimatedMonthlyPayment?: number;
    conditionalFields?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    address?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    dateOfBirth?: string;
    annualIncome?: number;
    employmentStatus?: string;
  }
): Promise<LoanApplicationRecord | null> {
  const fields: string[] = [];
  const values: (string | number | null)[] = [];

  const fieldMap: Record<string, string> = {
    loanType: "loan_type",
    requestedAmount: "requested_amount",
    termMonths: "term_months",
    status: "status",
    estimatedAPR: "estimated_apr",
    estimatedMonthlyPayment: "estimated_monthly_payment",
    conditionalFields: "conditional_fields",
    firstName: "first_name",
    lastName: "last_name",
    email: "email",
    address: "address",
    city: "city",
    state: "state",
    postalCode: "postal_code",
    dateOfBirth: "date_of_birth",
    annualIncome: "annual_income",
    employmentStatus: "employment_status",
  };

  for (const [key, column] of Object.entries(fieldMap)) {
    const value = updates[key as keyof typeof updates];
    if (value !== undefined) {
      fields.push(`${column} = ?`);
      values.push(value as string | number | null);
    }
  }

  if (fields.length === 0) return getLoanApplicationById(id);

  fields.push("updated_at = datetime('now')");
  values.push(id);

  const db = getDb();
  const stmt = db.prepare(
    `UPDATE loan_applications SET ${fields.join(", ")} WHERE id = ?`
  );
  stmt.run(...values);

  return getLoanApplicationById(id);
}

export async function deleteLoanApplication(id: string): Promise<void> {
  const db = getDb();
  const stmt = db.prepare(`DELETE FROM loan_applications WHERE id = ?`);
  stmt.run(id);
}

function mapRowToLoanApplication(
  row: Record<string, unknown>
): LoanApplicationRecord {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    loanType: row.loan_type as string,
    requestedAmount: row.requested_amount as number,
    termMonths: row.term_months as number,
    status: row.status as string,
    estimatedAPR: row.estimated_apr as number,
    estimatedMonthlyPayment: row.estimated_monthly_payment as number,
    conditionalFields: (row.conditional_fields as string) || "{}",
    firstName: row.first_name as string | undefined,
    lastName: row.last_name as string | undefined,
    email: row.email as string | undefined,
    address: row.address as string | undefined,
    city: row.city as string | undefined,
    state: row.state as string | undefined,
    postalCode: row.postal_code as string | undefined,
    dateOfBirth: row.date_of_birth as string | undefined,
    annualIncome: row.annual_income as number | undefined,
    employmentStatus: row.employment_status as string | undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}
