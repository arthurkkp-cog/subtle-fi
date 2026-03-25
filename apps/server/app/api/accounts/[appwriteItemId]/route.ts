import { NextRequest, NextResponse } from "next/server";
import { getBankById } from "@/lib/db";
import { parseStringify } from "@/lib/utils";

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

export async function GET(
  _request: NextRequest,
  { params }: { params: { appwriteItemId: string } },
) {
  try {
    const { appwriteItemId } = params;

    if (!appwriteItemId) {
      return NextResponse.json(
        parseStringify({ data: null, transactions: [] }),
      );
    }

    const bank = await getBankById(appwriteItemId);

    if (!bank) {
      return NextResponse.json(
        parseStringify({ data: null, transactions: [] }),
      );
    }

    const mockData = MOCK_ACCOUNTS[bank.accountId] || {
      name: "Unknown Account",
      officialName: "Unknown Account",
      balance: 0,
      type: "depository",
      subtype: "checking",
      institutionId: "ins_unknown",
      mask: "0000",
    };

    const account = {
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
    };

    // Mock transactions
    const mockTransactions = [
      {
        id: "t1",
        name: "Starbucks",
        amount: -5.75,
        date: new Date().toISOString(),
        paymentChannel: "in store",
        category: "Food and Drink",
        type: "debit",
        image: "/icons/a-coffee.svg",
      },
      {
        id: "t2",
        name: "Amazon",
        amount: -129.99,
        date: new Date(Date.now() - 86400000).toISOString(),
        paymentChannel: "online",
        category: "Shopping",
        type: "debit",
        image: null,
      },
      {
        id: "t3",
        name: "Payroll Deposit",
        amount: 3500.0,
        date: new Date(Date.now() - 172800000).toISOString(),
        paymentChannel: "other",
        category: "Transfer",
        type: "credit",
        image: null,
      },
      {
        id: "t4",
        name: "Netflix",
        amount: -15.99,
        date: new Date(Date.now() - 259200000).toISOString(),
        paymentChannel: "online",
        category: "Entertainment",
        type: "debit",
        image: null,
      },
      {
        id: "t5",
        name: "Uber",
        amount: -24.5,
        date: new Date(Date.now() - 345600000).toISOString(),
        paymentChannel: "online",
        category: "Travel",
        type: "debit",
        image: null,
      },
    ];

    return NextResponse.json(
      parseStringify({
        data: account,
        transactions: mockTransactions,
      }),
    );
  } catch (error) {
    console.error("Get account error:", error);
    return NextResponse.json(
      parseStringify({ data: null, transactions: [] }),
    );
  }
}
