import { NextRequest, NextResponse } from "next/server";
import { plaidClient } from "@/lib/plaid";
import { addFundingSource } from "@/lib/dwolla";
import {
  createBank as createBankRecord,
} from "@/lib/db";
import { encryptId, parseStringify } from "@/lib/utils";
import {
  ProcessorTokenCreateRequest,
  ProcessorTokenCreateRequestProcessorEnum,
} from "plaid";

export async function POST(request: NextRequest) {
  try {
    const { publicToken, user } = await request.json();

    // Exchange the public token for an access token and item ID
    const response = await plaidClient.itemPublicTokenExchange({
      public_token: publicToken,
    });

    const accessToken = response.data.access_token;
    const itemId = response.data.item_id;

    // Get account information from Plaid using the access token
    const accountsResponse = await plaidClient.accountsGet({
      access_token: accessToken,
    });

    const accountData = accountsResponse.data.accounts[0];

    // Create a processor token for Dwolla
    const processorRequest: ProcessorTokenCreateRequest = {
      access_token: accessToken,
      account_id: accountData.account_id,
      processor: "dwolla" as ProcessorTokenCreateRequestProcessorEnum,
    };

    const processorTokenResponse =
      await plaidClient.processorTokenCreate(processorRequest);
    const processorToken = processorTokenResponse.data.processor_token;

    // Create a new funding source URL
    const fundingSourceUrl = await addFundingSource({
      dwollaCustomerId: user.dwollaCustomerId!,
      processorToken,
      bankName: accountData.name,
    });

    if (!fundingSourceUrl) {
      return NextResponse.json(
        { error: "Failed to create funding source" },
        { status: 500 },
      );
    }

    // Create a bank account record
    await createBankRecord({
      userId: user.id || user.$id!,
      bankId: itemId,
      accountId: accountData.account_id,
      accessToken,
      fundingSourceUrl,
      shareableId: encryptId(accountData.account_id),
    });

    return NextResponse.json(
      parseStringify({
        publicTokenExchange: "complete",
      }),
    );
  } catch (error) {
    console.error("Exchange public token error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
