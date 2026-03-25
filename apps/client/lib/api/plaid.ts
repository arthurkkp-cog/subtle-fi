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

export async function createLinkToken(user: any) {
  try {
    const response = await fetch(`${API_URL}/api/plaid/link-token`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(user),
    });

    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.error("Create link token error:", error);
    return null;
  }
}

export async function exchangePublicToken(params: {
  publicToken: string;
  user: any;
}) {
  try {
    const response = await fetch(`${API_URL}/api/plaid/exchange-token`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(params),
    });

    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.error("Exchange public token error:", error);
    return null;
  }
}
