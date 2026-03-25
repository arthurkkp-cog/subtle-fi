"use server";

import { cookies } from "next/headers";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

function getAuthHeaders(): Record<string, string> {
  const cookieStore = cookies();
  const sessionToken = cookieStore.get("session-token");
  return {
    "Content-Type": "application/json",
    ...(sessionToken ? { Cookie: `session-token=${sessionToken.value}` } : {}),
  };
}

export async function createTransfer(params: {
  sourceFundingSourceUrl: string;
  destinationFundingSourceUrl: string;
  amount: string;
}) {
  try {
    const response = await fetch(`${API_URL}/api/transfers`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(params),
    });

    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.error("Create transfer error:", error);
    return null;
  }
}

export async function createTransaction(transaction: any) {
  try {
    const response = await fetch(`${API_URL}/api/transactions`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(transaction),
    });

    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.error("Create transaction error:", error);
    return null;
  }
}

export async function getTransactionsByBankId(bankId: string) {
  try {
    const response = await fetch(
      `${API_URL}/api/transactions/by-bank?bankId=${encodeURIComponent(bankId)}`,
      {
        method: "GET",
        headers: getAuthHeaders(),
        cache: "no-store",
      },
    );

    if (!response.ok) return { total: 0, documents: [] };
    return await response.json();
  } catch (error) {
    console.error("Get transactions by bank error:", error);
    return { total: 0, documents: [] };
  }
}
