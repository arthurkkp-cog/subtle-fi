import { NextRequest, NextResponse } from "next/server";
import { verifyPassword, createSession } from "@/lib/db";
import { parseStringify } from "@/lib/utils";

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    const user = await verifyPassword(email, password);
    if (!user) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 },
      );
    }

    const session = await createSession(user.id);

    const response = NextResponse.json(parseStringify(user));

    response.cookies.set("session-token", session.id, {
      path: "/",
      httpOnly: true,
      sameSite: "none",
      secure: true,
      expires: session.expiresAt,
    });

    return response;
  } catch (error) {
    console.error("Sign in error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
