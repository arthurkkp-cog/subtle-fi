import { NextRequest, NextResponse } from "next/server";
import { getBankByAccountId } from "@/lib/db";
import { parseStringify } from "@/lib/utils";

export async function GET(
  _request: NextRequest,
  { params }: { params: { accountId: string } },
) {
  try {
    const { accountId } = params;
    const bank = await getBankByAccountId(accountId);

    if (!bank) {
      return NextResponse.json({ error: "Bank not found" }, { status: 404 });
    }

    return NextResponse.json(parseStringify(bank));
  } catch (error) {
    console.error("Get bank by account ID error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
