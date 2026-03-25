"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export async function signInUser(params: { email: string; password: string }) {
  try {
    const response = await fetch(`${API_URL}/api/auth/sign-in`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
      credentials: "include",
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: "Sign in failed" }));
      return null;
    }

    // Forward the session cookie from the API server response
    const setCookieHeader = response.headers.get("set-cookie");
    if (setCookieHeader) {
      const cookieStore = cookies();
      // Parse the session-token from the Set-Cookie header
      const match = setCookieHeader.match(/session-token=([^;]+)/);
      if (match) {
        cookieStore.set("session-token", match[1], {
          path: "/",
          httpOnly: true,
          sameSite: "none",
          secure: true,
        });
      }
    }

    return await response.json();
  } catch (error) {
    console.error("Sign in error:", error);
    return null;
  }
}

export async function createNewUser(userData: {
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
}) {
  try {
    const response = await fetch(`${API_URL}/api/auth/sign-up`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(userData),
      credentials: "include",
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: "Sign up failed" }));
      return null;
    }

    // Forward the session cookie from the API server response
    const setCookieHeader = response.headers.get("set-cookie");
    if (setCookieHeader) {
      const cookieStore = cookies();
      const match = setCookieHeader.match(/session-token=([^;]+)/);
      if (match) {
        cookieStore.set("session-token", match[1], {
          path: "/",
          httpOnly: true,
          sameSite: "none",
          secure: true,
        });
      }
    }

    return await response.json();
  } catch (error) {
    console.error("Sign up error:", error);
    return null;
  }
}

export async function getCurrentUser() {
  try {
    const cookieStore = cookies();
    const sessionToken = cookieStore.get("session-token");

    if (!sessionToken?.value) {
      return null;
    }

    const response = await fetch(`${API_URL}/api/auth/me`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Cookie: `session-token=${sessionToken.value}`,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error("Get current user error:", error);
    return null;
  }
}

export async function signOutUser() {
  try {
    const cookieStore = cookies();
    const sessionToken = cookieStore.get("session-token");

    await fetch(`${API_URL}/api/auth/sign-out`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: sessionToken ? `session-token=${sessionToken.value}` : "",
      },
    });

    cookieStore.delete("session-token");
  } catch (error) {
    console.error("Sign out error:", error);
  }

  redirect("/sign-in");
}
