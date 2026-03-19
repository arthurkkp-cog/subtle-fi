import CreditAccountsList from "@/components/CreditAccountsList";
import CreditFactors from "@/components/CreditFactors";
import CreditScoreGauge from "@/components/CreditScoreGauge";
import HeaderBox from "@/components/HeaderBox";
import PlaidLink from "@/components/PlaidLink";
import ScoreHistoryChart from "@/components/ScoreHistoryChart";
import {
  getCreditScoreData,
  getCreditScoreHistory,
  saveCreditScoreSnapshot,
} from "@/lib/actions/creditScore.actions";
import { getCurrentUser } from "@/lib/actions/user.actions";
import { formatAmount } from "@/lib/utils";

const CreditScore = async () => {
  const currentUser = await getCurrentUser();
  const creditData = await getCreditScoreData({ userId: currentUser.$id });
  const history = await getCreditScoreHistory({ userId: currentUser.$id });

  // Save a snapshot if we have credit data (on each page visit for MVP)
  if (creditData && creditData.accountCount > 0) {
    await saveCreditScoreSnapshot({
      userId: currentUser.$id,
      timestamp: new Date().toISOString(),
      estimatedScore: creditData.estimatedScore,
      utilization: creditData.utilization,
      totalBalance: creditData.totalBalance,
      totalLimit: creditData.totalLimit,
      accountCount: creditData.accountCount,
    });
  }

  // Empty state: no credit data available
  if (!creditData || creditData.accountCount === 0) {
    return (
      <section className="flex">
        <div className="credit-score-page">
          <HeaderBox
            title="Credit Score"
            subtext="Monitor your credit health and track your score over time."
          />
          <div className="credit-score-empty">
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="flex size-16 items-center justify-center rounded-full bg-gray-100">
                <span className="text-30 text-gray-400">?</span>
              </div>
              <h3 className="text-18 font-semibold text-gray-900">
                No Credit Accounts Found
              </h3>
              <p className="text-14 text-gray-600 max-w-md">
                We couldn&apos;t find any credit accounts linked to your profile.
                Connect a bank that has credit card accounts to see your
                estimated credit score and utilization metrics.
              </p>
              <div className="mt-2">
                <PlaidLink user={currentUser} variant="primary" />
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="flex">
      <div className="credit-score-page">
        <HeaderBox
          title="Credit Score"
          subtext="Monitor your credit health and track your score over time."
        />

        {/* Top Section: Gauge + Utilization Summary */}
        <div className="credit-score-grid">
          {/* Gauge Card */}
          <div className="credit-score-card">
            <h2 className="header-2 mb-4">Estimated Credit Score</h2>
            <CreditScoreGauge
              score={creditData.estimatedScore}
              label={creditData.scoreLabel}
            />
          </div>

          {/* Utilization Summary Card */}
          <div className="credit-score-card">
            <h2 className="header-2 mb-4">Credit Utilization</h2>
            <div className="flex flex-col gap-6">
              {/* Overall utilization */}
              <div className="flex flex-col gap-2">
                <div className="flex items-end justify-between">
                  <span className="text-14 text-gray-600">
                    Overall Utilization
                  </span>
                  <span
                    className={`text-24 font-bold ${
                      creditData.utilization > 0.5
                        ? "text-red-500"
                        : creditData.utilization > 0.3
                          ? "text-yellow-600"
                          : "text-green-600"
                    }`}
                  >
                    {(creditData.utilization * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      creditData.utilization > 0.5
                        ? "bg-red-500"
                        : creditData.utilization > 0.3
                          ? "bg-yellow-500"
                          : "bg-green-500"
                    }`}
                    style={{
                      width: `${Math.min(100, creditData.utilization * 100)}%`,
                    }}
                  />
                </div>
                <span className="text-12 text-gray-500">
                  Recommended: below 30%
                </span>
              </div>

              {/* Summary stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1 p-3 bg-gray-25 rounded-lg">
                  <span className="text-12 text-gray-600">Total Balance</span>
                  <span className="text-16 font-semibold text-gray-900">
                    {formatAmount(creditData.totalBalance)}
                  </span>
                </div>
                <div className="flex flex-col gap-1 p-3 bg-gray-25 rounded-lg">
                  <span className="text-12 text-gray-600">Total Limit</span>
                  <span className="text-16 font-semibold text-gray-900">
                    {formatAmount(creditData.totalLimit)}
                  </span>
                </div>
                <div className="flex flex-col gap-1 p-3 bg-gray-25 rounded-lg">
                  <span className="text-12 text-gray-600">
                    Credit Accounts
                  </span>
                  <span className="text-16 font-semibold text-gray-900">
                    {creditData.accountCount}
                  </span>
                </div>
                <div className="flex flex-col gap-1 p-3 bg-gray-25 rounded-lg">
                  <span className="text-12 text-gray-600">Available</span>
                  <span className="text-16 font-semibold text-gray-900">
                    {formatAmount(
                      creditData.totalLimit - creditData.totalBalance,
                    )}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Impact Factors */}
        <div className="credit-score-card">
          <h2 className="header-2 mb-4">Impact Factors</h2>
          <CreditFactors factors={creditData.factors} />
        </div>

        {/* Account Breakdown */}
        <div className="credit-score-card">
          <h2 className="header-2 mb-4">Account Breakdown</h2>
          <CreditAccountsList accounts={creditData.accounts} />
        </div>

        {/* Historical Trend */}
        <div className="credit-score-card">
          <h2 className="header-2 mb-4">Score History</h2>
          <ScoreHistoryChart snapshots={history} />
        </div>
      </div>
    </section>
  );
};

export default CreditScore;
