import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { parseStringify } from "@/lib/utils";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ user: null }, { status: 401 });
    }
    return NextResponse.json(parseStringify(user));
  } catch (error) {
    console.error("Get current user error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
