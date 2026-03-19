"use server";

import { CountryCode } from "plaid";

import { plaidClient } from "@/lib/plaid";
import { parseStringify } from "@/lib/utils";

import { getTransactionsByBankId } from "@/lib/actions/transaction.actions";
import { getBank, getBanks } from "@/lib/actions/user.actions";

// Mock account data for local development
const MOCK_ACCOUNTS: Record<string, { name: string; officialName: string; balance: number; type: string; subtype: string; institutionId: string; mask: string }> = {
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

// Get multiple bank accounts
export const getAccounts = async ({ userId }: AccountsProps) => {
  try {
    // get banks from db
    const banks = await getBanks({ userId });

    if (!banks || banks.length === 0) {
      return parseStringify({ data: [], totalBanks: 0, totalCurrentBalance: 0, transactions: [] });
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
        appwriteItemId: bank.$id || (bank as any).id,
        shareableId: bank.shareableId,
      };
    });

    const totalBanks = accounts.length;
    const totalCurrentBalance = accounts.reduce((total: number, account: any) => {
      return total + account.currentBalance;
    }, 0);

    // Mock transactions for display
    const mockTransactions = [
      { id: "t1", name: "Starbucks", amount: -5.75, date: new Date().toISOString(), category: "Food and Drink", type: "debit" },
      { id: "t2", name: "Amazon", amount: -129.99, date: new Date(Date.now() - 86400000).toISOString(), category: "Shopping", type: "debit" },
      { id: "t3", name: "Payroll Deposit", amount: 3500.00, date: new Date(Date.now() - 172800000).toISOString(), category: "Transfer", type: "credit" },
    ];

    return parseStringify({ data: accounts, totalBanks, totalCurrentBalance, transactions: mockTransactions });
  } catch (error) {
    console.error("An error occurred while getting the accounts:", error);
    return parseStringify({ data: [], totalBanks: 0, totalCurrentBalance: 0, transactions: [] });
  }
};

// Get one bank account
export const getAccount = async ({ appwriteItemId }: AccountProps) => {
  try {
    if (!appwriteItemId) {
      return parseStringify({ data: null, transactions: [] });
    }

    // get bank from db
    const bank = await getBank({ documentId: appwriteItemId });

    if (!bank) {
      return parseStringify({ data: null, transactions: [] });
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
      appwriteItemId: bank.$id || (bank as any).id,
    };

    // Mock transactions
    const mockTransactions = [
      { id: "t1", name: "Starbucks", amount: -5.75, date: new Date().toISOString(), paymentChannel: "in store", category: "Food and Drink", type: "debit", image: "/icons/a-coffee.svg" },
      { id: "t2", name: "Amazon", amount: -129.99, date: new Date(Date.now() - 86400000).toISOString(), paymentChannel: "online", category: "Shopping", type: "debit", image: null },
      { id: "t3", name: "Payroll Deposit", amount: 3500.00, date: new Date(Date.now() - 172800000).toISOString(), paymentChannel: "other", category: "Transfer", type: "credit", image: null },
      { id: "t4", name: "Netflix", amount: -15.99, date: new Date(Date.now() - 259200000).toISOString(), paymentChannel: "online", category: "Entertainment", type: "debit", image: null },
      { id: "t5", name: "Uber", amount: -24.50, date: new Date(Date.now() - 345600000).toISOString(), paymentChannel: "online", category: "Travel", type: "debit", image: null },
    ];

    return parseStringify({
      data: account,
      transactions: mockTransactions,
    });
  } catch (error) {
    console.error("An error occurred while getting the account:", error);
    return parseStringify({ data: null, transactions: [] });
  }
};

// Get bank info
export const getInstitution = async ({ institutionId }: InstitutionProps) => {
  try {
    const institutionResponse = await plaidClient.institutionsGetById({
      institution_id: institutionId,
      country_codes: ["US"] as CountryCode[],
    });

    const intitution = institutionResponse.data.institution;

    return parseStringify(intitution);
  } catch (error) {
    console.error("An error occurred while getting the accounts:", error);
  }
};

// Get transactions
export const getTransactions = async ({ accessToken }: TransactionsProps) => {
  let hasMore = true;
  let transactions: any = [];

  try {
    // Iterate through each page of new transaction updates for item
    while (hasMore) {
      const response = await plaidClient.transactionsSync({
        access_token: accessToken,
      });

      const data = response.data;

      transactions = response.data.added.map(transaction => ({
        id: transaction.transaction_id,
        name: transaction.name,
        paymentChannel: transaction.payment_channel,
        type: transaction.payment_channel,
        accountId: transaction.account_id,
        amount: transaction.amount,
        pending: transaction.pending,
        category: transaction.category ? transaction.category[0] : "",
        date: transaction.date,
        image: transaction.logo_url,
      }));

      hasMore = data.has_more;
    }

    return parseStringify(transactions);
  } catch (error) {
    console.error("An error occurred while getting the accounts:", error);
  }
};
