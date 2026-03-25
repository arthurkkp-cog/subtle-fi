import { NextRequest, NextResponse } from "next/server";
import { createTransfer } from "@/lib/dwolla";

export async function POST(request: NextRequest) {
  try {
    const { sourceFundingSourceUrl, destinationFundingSourceUrl, amount } =
      await request.json();

    const transfer = await createTransfer({
      sourceFundingSourceUrl,
      destinationFundingSourceUrl,
      amount,
    });

    if (!transfer) {
      return NextResponse.json(
        { error: "Transfer failed" },
        { status: 500 },
      );
    }

    return NextResponse.json({ transferUrl: transfer });
  } catch (error) {
    console.error("Create transfer error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
