import { NextRequest, NextResponse } from "next/server";
import { plaidClient } from "@/lib/plaid";
import { parseStringify } from "@/lib/utils";
import { CountryCode } from "plaid";

export async function GET(
  _request: NextRequest,
  { params }: { params: { institutionId: string } },
) {
  try {
    const { institutionId } = params;

    const institutionResponse = await plaidClient.institutionsGetById({
      institution_id: institutionId,
      country_codes: ["US"] as CountryCode[],
    });

    const institution = institutionResponse.data.institution;

    return NextResponse.json(parseStringify(institution));
  } catch (error) {
    console.error("Get institution error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
