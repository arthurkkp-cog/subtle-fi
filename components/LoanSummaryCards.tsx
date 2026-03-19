"use client";

import AnimatedCounter from "@/components/AnimatedCounter";
import { formatAmount } from "@/lib/utils";

const LoanSummaryCards = ({
  totalLoans,
  outstandingBalance,
  totalMonthlyPayment,
}: LoanSummaryCardsProps) => {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:gap-6">
      {/* Total Loans Card */}
      <div className="flex flex-1 items-center gap-4 rounded-xl border border-gray-200 p-4 shadow-chart sm:p-6">
        <div className="flex size-12 items-center justify-center rounded-full bg-blue-100">
          <span className="text-20 font-bold text-blue-700">#</span>
        </div>
        <div className="flex flex-col">
          <p className="text-14 font-medium text-gray-600">Total Loans</p>
          <p className="text-24 font-semibold text-gray-900">{totalLoans}</p>
        </div>
      </div>

      {/* Outstanding Balance Card */}
      <div className="flex flex-1 items-center gap-4 rounded-xl border border-gray-200 p-4 shadow-chart sm:p-6">
        <div className="flex size-12 items-center justify-center rounded-full bg-red-100">
          <span className="text-20 font-bold text-red-700">$</span>
        </div>
        <div className="flex flex-col">
          <p className="text-14 font-medium text-gray-600">
            Outstanding Balance
          </p>
          <p className="text-24 font-semibold text-gray-900">
            <AnimatedCounter amount={outstandingBalance} />
          </p>
        </div>
      </div>

      {/* Monthly Payment Card */}
      <div className="flex flex-1 items-center gap-4 rounded-xl border border-gray-200 p-4 shadow-chart sm:p-6">
        <div className="flex size-12 items-center justify-center rounded-full bg-green-100">
          <span className="text-20 font-bold text-green-700">$</span>
        </div>
        <div className="flex flex-col">
          <p className="text-14 font-medium text-gray-600">Monthly Payment</p>
          <p className="text-24 font-semibold text-gray-900">
            <AnimatedCounter amount={totalMonthlyPayment} />
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoanSummaryCards;
