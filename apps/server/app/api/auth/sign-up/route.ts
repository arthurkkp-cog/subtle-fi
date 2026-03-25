import { NextRequest, NextResponse } from "next/server";
import {
  createUser,
  createSession,
  updateUser,
} from "@/lib/db";
import { createDwollaCustomer } from "@/lib/dwolla";
import { extractCustomerIdFromUrl, parseStringify } from "@/lib/utils";

export async function POST(request: NextRequest) {
  try {
    const { password, ...userData } = await request.json();
    const { email, firstName, lastName } = userData;

    const newUser = await createUser({
      email,
      password,
      firstName,
      lastName,
      address1: userData.address1,
      city: userData.city,
      state: userData.state,
      postalCode: userData.postalCode,
      dateOfBirth: userData.dateOfBirth,
      ssn: userData.ssn,
    });

    if (!newUser) {
      return NextResponse.json(
        { error: "Error creating user" },
        { status: 500 },
      );
    }

    // Try to create Dwolla customer (optional)
    try {
      const dwollaResult = await createDwollaCustomer({
        ...userData,
        type: "personal",
      });
      if (dwollaResult) {
        const dwollaCustomerId = extractCustomerIdFromUrl(dwollaResult);
        await updateUser(newUser.id, {
          dwollaCustomerId,
          dwollaCustomerUrl: dwollaResult,
        });
      }
    } catch (dwollaError) {
      console.warn("Dwolla customer creation skipped:", dwollaError);
    }

    const session = await createSession(newUser.id);

    const response = NextResponse.json(parseStringify(newUser));

    response.cookies.set("session-token", session.id, {
      path: "/",
      httpOnly: true,
      sameSite: "none",
      secure: true,
      expires: session.expiresAt,
    });

    return response;
  } catch (error) {
    console.error("Sign up error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
