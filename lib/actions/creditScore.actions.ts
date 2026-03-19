"use server";

import { createAdminClient } from "@/lib/appwrite";
import {
  calculateCreditScore,
  determineCreditFactors,
  getScoreColor,
  getScoreLabel,
} from "@/lib/credit-scoring";
import { plaidClient } from "@/lib/plaid";
import { parseStringify } from "@/lib/utils";
import { ID, Query } from "node-appwrite";
import { getBanks } from "./user.actions";

const {
  APPWRITE_DATABASE_ID: DATABASE_ID,
  APPWRITE_CREDIT_SCORE_COLLECTION_ID: CREDIT_SCORE_COLLECTION_ID,
} = process.env;

/**
 * Fetch credit liabilities data from Plaid for all linked banks and
 * compute an aggregated credit score.
 */
export const getCreditScoreData = async ({
  userId,
}: {
  userId: string;
}): Promise<CreditScoreData | null> => {
  try {
    const banks = await getBanks({ userId });

    if (!banks || banks.length === 0) {
      return null;
    }

    const allCreditAccounts: CreditAccount[] = [];

    // Fetch liabilities data from each linked bank
    for (const bank of banks) {
      try {
        const liabilitiesResponse = await plaidClient.liabilitiesGet({
          access_token: bank.accessToken,
        });

        const creditCards = liabilitiesResponse.data.liabilities.credit ?? [];

        for (const card of creditCards) {
          // Find matching account data for balance info
          const matchingAccount = liabilitiesResponse.data.accounts.find(
            a => a.account_id === card.account_id,
          );

          if (!matchingAccount) continue;

          const currentBalance = matchingAccount.balances.current ?? 0;
          const creditLimit = matchingAccount.balances.limit ?? null;
          const hasLimit =
            creditLimit !== null && creditLimit > 0;

          const creditAccount: CreditAccount = {
            accountId: matchingAccount.account_id,
            name: matchingAccount.name,
            officialName: matchingAccount.official_name ?? null,
            type: matchingAccount.subtype === "credit card" ? "revolving" : (matchingAccount.subtype ?? "revolving"),
            currentBalance,
            creditLimit,
            utilization: hasLimit ? currentBalance / creditLimit : null,
            isOverLimit: hasLimit ? currentBalance > creditLimit : false,
            lastPaymentAmount: card.last_payment_amount ?? null,
            lastPaymentDate: card.last_payment_date ?? null,
            minimumPaymentAmount: card.minimum_payment_amount ?? null,
          };

          allCreditAccounts.push(creditAccount);
        }
      } catch (bankError: unknown) {
        // If this bank doesn't support liabilities (missing product scope),
        // skip it and continue with others
        const errorMessage =
          bankError instanceof Error ? bankError.message : String(bankError);
        console.warn(
          `Skipping bank ${bank.$id} for liabilities: ${errorMessage}`,
        );
        continue;
      }
    }

    // Calculate aggregate utilization across all revolving accounts
    const revolvingAccounts = allCreditAccounts.filter(
      a => a.creditLimit !== null && a.creditLimit > 0,
    );

    const totalBalance = revolvingAccounts.reduce(
      (sum, a) => sum + a.currentBalance,
      0,
    );
    const totalLimit = revolvingAccounts.reduce(
      (sum, a) => sum + (a.creditLimit ?? 0),
      0,
    );
    const utilization = totalLimit > 0 ? totalBalance / totalLimit : 0;

    // Calculate estimated score
    const estimatedScore = calculateCreditScore(utilization, allCreditAccounts);
    const scoreLabel = getScoreLabel(estimatedScore);
    const scoreColor = getScoreColor(estimatedScore);

    // Determine impact factors
    const factors = determineCreditFactors(utilization, allCreditAccounts);

    const creditScoreData: CreditScoreData = {
      estimatedScore,
      scoreLabel,
      scoreColor,
      utilization,
      totalBalance,
      totalLimit,
      accountCount: allCreditAccounts.length,
      accounts: allCreditAccounts,
      factors,
    };

    return parseStringify(creditScoreData);
  } catch (error) {
    console.error("Error fetching credit score data:", error);
    return null;
  }
};

/**
 * Get the most recent snapshot for a user to check if enough time has
 * elapsed before saving a new one (deduplication).
 */
export const getLatestSnapshot = async ({
  userId,
}: {
  userId: string;
}): Promise<CreditScoreSnapshot | null> => {
  try {
    if (!DATABASE_ID || !CREDIT_SCORE_COLLECTION_ID) {
      return null;
    }

    const { database } = await createAdminClient();

    const result = await database.listDocuments(
      DATABASE_ID,
      CREDIT_SCORE_COLLECTION_ID,
      [
        Query.equal("userId", [userId]),
        Query.orderDesc("timestamp"),
        Query.limit(1),
      ],
    );

    if (result.documents.length === 0) {
      return null;
    }

    return parseStringify(result.documents[0]);
  } catch (error) {
    console.error("Error fetching latest snapshot:", error);
    return null;
  }
};

const SNAPSHOT_COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Save a credit score snapshot to Appwrite for historical tracking.
 * Deduplicates by checking the most recent snapshot and only saving
 * if at least 24 hours have elapsed.
 */
export const saveCreditScoreSnapshot = async (
  snapshot: Omit<CreditScoreSnapshot, "$id">,
): Promise<CreditScoreSnapshot | null> => {
  try {
    if (!DATABASE_ID || !CREDIT_SCORE_COLLECTION_ID) {
      console.warn(
        "Credit score collection not configured. Skipping snapshot save.",
      );
      return null;
    }

    // Check if a recent snapshot already exists (deduplication)
    const latest = await getLatestSnapshot({ userId: snapshot.userId });
    if (latest) {
      const elapsed =
        new Date(snapshot.timestamp).getTime() -
        new Date(latest.timestamp).getTime();
      if (elapsed < SNAPSHOT_COOLDOWN_MS) {
        return latest;
      }
    }

    const { database } = await createAdminClient();

    const document = await database.createDocument(
      DATABASE_ID,
      CREDIT_SCORE_COLLECTION_ID,
      ID.unique(),
      {
        userId: snapshot.userId,
        timestamp: snapshot.timestamp,
        estimatedScore: snapshot.estimatedScore,
        utilization: snapshot.utilization,
        totalBalance: snapshot.totalBalance,
        totalLimit: snapshot.totalLimit,
        accountCount: snapshot.accountCount,
      },
    );

    return parseStringify(document);
  } catch (error) {
    console.error("Error saving credit score snapshot:", error);
    return null;
  }
};

/**
 * Get historical credit score snapshots for a user from Appwrite.
 */
export const getCreditScoreHistory = async ({
  userId,
  limit = 12,
}: {
  userId: string;
  limit?: number;
}): Promise<CreditScoreSnapshot[]> => {
  try {
    if (!DATABASE_ID || !CREDIT_SCORE_COLLECTION_ID) {
      console.warn(
        "Credit score collection not configured. Returning empty history.",
      );
      return [];
    }

    const { database } = await createAdminClient();

    const snapshots = await database.listDocuments(
      DATABASE_ID,
      CREDIT_SCORE_COLLECTION_ID,
      [
        Query.equal("userId", [userId]),
        Query.orderDesc("timestamp"),
        Query.limit(limit),
      ],
    );

    // Return in chronological order (oldest first) for the chart
    const rawDocs: CreditScoreSnapshot[] = parseStringify(
      snapshots.documents.reverse(),
    );

    return rawDocs;
  } catch (error) {
    console.error("Error fetching credit score history:", error);
    return [];
  }
};
