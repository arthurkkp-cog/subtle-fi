import { NextRequest, NextResponse } from "next/server";
import { getBanksByUserId } from "@/lib/db";
import { parseStringify } from "@/lib/utils";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 },
      );
    }

    const banks = await getBanksByUserId(userId);
    return NextResponse.json(parseStringify(banks));
  } catch (error) {
    console.error("Get banks error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
