/**
 * Heuristic credit scoring algorithm based on available Plaid Liabilities data.
 *
 * Phase 1 MVP: Score is estimated from credit utilization ratio and account count.
 * Score range: 300–850 (mimics FICO range).
 */

const SCORE_MIN = 300;
const SCORE_MAX = 850;
const SCORE_RANGE = SCORE_MAX - SCORE_MIN;

// Weight distribution for scoring factors
const UTILIZATION_WEIGHT = 0.65;
const ACCOUNT_DIVERSITY_WEIGHT = 0.2;
const PAYMENT_HISTORY_WEIGHT = 0.15;

/**
 * Maps a utilization ratio (0–1+) to a score component (0–1).
 * Lower utilization = higher score.
 *   0–10%  → 1.0
 *  10–30%  → 0.85–1.0
 *  30–50%  → 0.6–0.85
 *  50–75%  → 0.3–0.6
 *  75–100% → 0.1–0.3
 *  >100%   → 0.0–0.1
 */
function utilizationScore(ratio: number): number {
  if (ratio <= 0) return 1.0;
  if (ratio <= 0.1) return 1.0;
  if (ratio <= 0.3) return 1.0 - (ratio - 0.1) * 0.75;
  if (ratio <= 0.5) return 0.85 - (ratio - 0.3) * 1.25;
  if (ratio <= 0.75) return 0.6 - (ratio - 0.5) * 1.2;
  if (ratio <= 1.0) return 0.3 - (ratio - 0.75) * 0.8;
  return Math.max(0, 0.1 - (ratio - 1.0) * 0.1);
}

/**
 * Maps account count to a score component (0–1).
 * Having 2–5 accounts is ideal; fewer or many more is slightly penalized.
 */
function accountDiversityScore(accountCount: number): number {
  if (accountCount === 0) return 0;
  if (accountCount === 1) return 0.6;
  if (accountCount <= 5) return 0.8 + (accountCount - 1) * 0.05;
  if (accountCount <= 10) return 1.0 - (accountCount - 5) * 0.02;
  return 0.8;
}

/**
 * Estimates a payment history score (0–1) from available data.
 * Since Plaid Liabilities doesn't provide full history, we use proxy signals:
 *   - Has recent payment → positive signal
 *   - Balance near/over limit → negative signal
 */
function paymentHistoryScore(accounts: CreditAccount[]): number {
  if (accounts.length === 0) return 0.5;

  let score = 0.7; // baseline: assume decent history

  const accountsWithPayments = accounts.filter(
    a => a.lastPaymentAmount !== null && a.lastPaymentAmount > 0,
  );
  if (accountsWithPayments.length > 0) {
    score += 0.15 * (accountsWithPayments.length / accounts.length);
  }

  const overLimitAccounts = accounts.filter(a => a.isOverLimit);
  if (overLimitAccounts.length > 0) {
    score -= 0.2 * (overLimitAccounts.length / accounts.length);
  }

  return Math.max(0, Math.min(1, score));
}

/**
 * Calculate the estimated credit score from credit account data.
 */
export function calculateCreditScore(
  utilization: number,
  accounts: CreditAccount[],
): number {
  const uScore = utilizationScore(utilization);
  const dScore = accountDiversityScore(accounts.length);
  const pScore = paymentHistoryScore(accounts);

  const weightedScore =
    uScore * UTILIZATION_WEIGHT +
    dScore * ACCOUNT_DIVERSITY_WEIGHT +
    pScore * PAYMENT_HISTORY_WEIGHT;

  return Math.round(SCORE_MIN + weightedScore * SCORE_RANGE);
}

/**
 * Returns a human-readable label for a given credit score.
 */
export function getScoreLabel(score: number): string {
  if (score >= 750) return "Excellent";
  if (score >= 700) return "Good";
  if (score >= 650) return "Fair";
  if (score >= 600) return "Poor";
  return "Very Poor";
}

/**
 * Returns a CSS-friendly color string for a given credit score.
 */
export function getScoreColor(score: number): string {
  if (score >= 750) return "#16a34a"; // green
  if (score >= 700) return "#65a30d"; // light green
  if (score >= 650) return "#ca8a04"; // yellow
  if (score >= 600) return "#ea580c"; // orange
  return "#dc2626"; // red
}

/**
 * Determine positive/negative impact factors from the credit data.
 */
export function determineCreditFactors(
  utilization: number,
  accounts: CreditAccount[],
): CreditFactor[] {
  const factors: CreditFactor[] = [];

  // Utilization factors
  if (utilization <= 0.1) {
    factors.push({
      label: "Very low utilization",
      impact: "positive",
      description: "Your credit utilization is under 10%, which is excellent.",
    });
  } else if (utilization <= 0.3) {
    factors.push({
      label: "Low utilization",
      impact: "positive",
      description:
        "Your credit utilization is under 30%, which is considered good.",
    });
  } else if (utilization <= 0.5) {
    factors.push({
      label: "Moderate utilization",
      impact: "negative",
      description:
        "Your credit utilization is between 30-50%. Try to keep it below 30%.",
    });
  } else {
    factors.push({
      label: "High utilization",
      impact: "negative",
      description:
        "Your credit utilization is above 50%. This significantly impacts your score.",
    });
  }

  // Account count factors
  if (accounts.length >= 2 && accounts.length <= 5) {
    factors.push({
      label: "Good account mix",
      impact: "positive",
      description:
        "Having multiple credit accounts demonstrates responsible credit management.",
    });
  } else if (accounts.length === 1) {
    factors.push({
      label: "Limited credit history",
      impact: "neutral",
      description:
        "Having only one credit account may limit your score potential.",
    });
  } else if (accounts.length === 0) {
    factors.push({
      label: "No credit accounts",
      impact: "negative",
      description: "No credit accounts found. Link a bank with credit accounts.",
    });
  }

  // Over-limit accounts
  const overLimitCount = accounts.filter(a => a.isOverLimit).length;
  if (overLimitCount > 0) {
    factors.push({
      label: `${overLimitCount} account${overLimitCount > 1 ? "s" : ""} over limit`,
      impact: "negative",
      description:
        "Having accounts over their credit limit negatively impacts your score.",
    });
  }

  // Payment activity
  const recentPayments = accounts.filter(
    a => a.lastPaymentAmount !== null && a.lastPaymentAmount > 0,
  );
  if (recentPayments.length > 0) {
    factors.push({
      label: "Recent payment activity",
      impact: "positive",
      description: "Making regular payments is a positive signal for your credit.",
    });
  }

  // High individual account balances
  const highBalanceAccounts = accounts.filter(
    a =>
      a.creditLimit !== null &&
      a.creditLimit > 0 &&
      a.currentBalance / a.creditLimit > 0.75,
  );
  if (highBalanceAccounts.length > 0) {
    factors.push({
      label: `High balance on ${highBalanceAccounts.length} account${highBalanceAccounts.length > 1 ? "s" : ""}`,
      impact: "negative",
      description:
        "Some accounts have balances above 75% of their credit limit.",
    });
  }

  return factors;
}
