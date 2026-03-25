import { NextRequest, NextResponse } from "next/server";
import { plaidClient } from "@/lib/plaid";
import { parseStringify } from "@/lib/utils";
import { CountryCode, Products } from "plaid";

export async function POST(request: NextRequest) {
  try {
    const user = await request.json();

    const tokenParams = {
      user: {
        client_user_id: user.id || user.$id,
      },
      client_name: `${user.firstName} ${user.lastName}`,
      products: ["auth"] as Products[],
      language: "en",
      country_codes: ["US"] as CountryCode[],
    };

    const response = await plaidClient.linkTokenCreate(tokenParams);
    return NextResponse.json(
      parseStringify({
        linkToken: response.data.link_token,
      }),
    );
  } catch (error) {
    console.error("Create link token error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
