import { NextRequest, NextResponse } from "next/server";
import { getBankById } from "@/lib/db";
import { parseStringify } from "@/lib/utils";

export async function GET(
  _request: NextRequest,
  { params }: { params: { documentId: string } },
) {
  try {
    const { documentId } = params;
    const bank = await getBankById(documentId);

    if (!bank) {
      return NextResponse.json({ error: "Bank not found" }, { status: 404 });
    }

    return NextResponse.json(parseStringify(bank));
  } catch (error) {
    console.error("Get bank error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
