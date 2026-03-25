import { NextRequest, NextResponse } from "next/server";
import { getBanksByUserId } from "@/lib/db";
import { parseStringify } from "@/lib/utils";
import type { Bank } from "@/lib/db/banks";

// Mock account data for local development
const MOCK_ACCOUNTS: Record<
  string,
  {
    name: string;
    officialName: string;
    balance: number;
    type: string;
    subtype: string;
    institutionId: string;
    mask: string;
  }
> = {
  "chase-checking-456": {
    name: "Mizuho Bank Checking",
    officialName: "Mizuho Bank Total Checking",
    balance: 12543.67,
    type: "depository",
    subtype: "checking",
    institutionId: "ins_3",
    mask: "4567",
  },
  "bofa-savings-012": {
    name: "Mizuho Trust Savings",
    officialName: "Mizuho Trust & Banking Advantage Savings",
    balance: 45231.89,
    type: "depository",
    subtype: "savings",
    institutionId: "ins_4",
    mask: "0123",
  },
};

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

    if (!banks || banks.length === 0) {
      return NextResponse.json(
        parseStringify({
          data: [],
          totalBanks: 0,
          totalCurrentBalance: 0,
          transactions: [],
        }),
      );
    }

    const accounts = banks.map((bank: Bank) => {
      const mockData = MOCK_ACCOUNTS[bank.accountId] || {
        name: "Unknown Account",
        officialName: "Unknown Account",
        balance: 0,
        type: "depository",
        subtype: "checking",
        institutionId: "ins_unknown",
        mask: "0000",
      };

      return {
        id: bank.accountId,
        availableBalance: mockData.balance,
        currentBalance: mockData.balance,
        institutionId: mockData.institutionId,
        name: mockData.name,
        officialName: mockData.officialName,
        mask: mockData.mask,
        type: mockData.type,
        subtype: mockData.subtype,
        appwriteItemId: bank.$id || bank.id,
        shareableId: bank.shareableId,
      };
    });

    const totalBanks = accounts.length;
    const totalCurrentBalance = accounts.reduce(
      (total: number, account: any) => {
        return total + account.currentBalance;
      },
      0,
    );

    // Mock transactions for display
    const mockTransactions = [
      {
        id: "t1",
        name: "Starbucks",
        amount: -5.75,
        date: new Date().toISOString(),
        category: "Food and Drink",
        type: "debit",
      },
      {
        id: "t2",
        name: "Amazon",
        amount: -129.99,
        date: new Date(Date.now() - 86400000).toISOString(),
        category: "Shopping",
        type: "debit",
      },
      {
        id: "t3",
        name: "Payroll Deposit",
        amount: 3500.0,
        date: new Date(Date.now() - 172800000).toISOString(),
        category: "Transfer",
        type: "credit",
      },
    ];

    return NextResponse.json(
      parseStringify({
        data: accounts,
        totalBanks,
        totalCurrentBalance,
        transactions: mockTransactions,
      }),
    );
  } catch (error) {
    console.error("Get accounts error:", error);
    return NextResponse.json(
      parseStringify({
        data: [],
        totalBanks: 0,
        totalCurrentBalance: 0,
        transactions: [],
      }),
    );
  }
}
