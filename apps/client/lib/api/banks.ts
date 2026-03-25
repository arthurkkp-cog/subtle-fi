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

export async function getAccounts(userId: string) {
  try {
    const response = await fetch(
      `${API_URL}/api/accounts?userId=${encodeURIComponent(userId)}`,
      {
        method: "GET",
        headers: getAuthHeaders(),
        cache: "no-store",
      },
    );

    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.error("Get accounts error:", error);
    return null;
  }
}

export async function getAccount(appwriteItemId: string) {
  try {
    const response = await fetch(
      `${API_URL}/api/accounts/${encodeURIComponent(appwriteItemId)}`,
      {
        method: "GET",
        headers: getAuthHeaders(),
        cache: "no-store",
      },
    );

    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.error("Get account error:", error);
    return null;
  }
}

export async function getBanks(userId: string) {
  try {
    const response = await fetch(
      `${API_URL}/api/banks?userId=${encodeURIComponent(userId)}`,
      {
        method: "GET",
        headers: getAuthHeaders(),
        cache: "no-store",
      },
    );

    if (!response.ok) return [];
    return await response.json();
  } catch (error) {
    console.error("Get banks error:", error);
    return [];
  }
}

export async function getBank(documentId: string) {
  try {
    const response = await fetch(
      `${API_URL}/api/banks/${encodeURIComponent(documentId)}`,
      {
        method: "GET",
        headers: getAuthHeaders(),
        cache: "no-store",
      },
    );

    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.error("Get bank error:", error);
    return null;
  }
}

export async function getBankByAccountId(accountId: string) {
  try {
    const response = await fetch(
      `${API_URL}/api/banks/by-account/${encodeURIComponent(accountId)}`,
      {
        method: "GET",
        headers: getAuthHeaders(),
        cache: "no-store",
      },
    );

    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.error("Get bank by account ID error:", error);
    return null;
  }
}

export async function getInstitution(institutionId: string) {
  try {
    const response = await fetch(
      `${API_URL}/api/institutions/${encodeURIComponent(institutionId)}`,
      {
        method: "GET",
        headers: getAuthHeaders(),
        cache: "no-store",
      },
    );

    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.error("Get institution error:", error);
    return null;
  }
}
