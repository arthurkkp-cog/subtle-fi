"use client";

import { formatAmount } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";

const loanTypeIcons: Record<string, string> = {
  mortgage: "🏠",
  auto: "🚗",
  personal: "👤",
  education: "🎓",
};

const loanTypeLabels: Record<string, string> = {
  mortgage: "Mortgage",
  auto: "Auto Loan",
  personal: "Personal Loan",
  education: "Student Loan",
};

const statusStyles: Record<
  string,
  { bg: string; text: string; label: string }
> = {
  current: {
    bg: "bg-green-100",
    text: "text-green-700",
    label: "Current",
  },
  late: {
    bg: "bg-yellow-100",
    text: "text-yellow-700",
    label: "Late",
  },
  defaulted: {
    bg: "bg-red-100",
    text: "text-red-700",
    label: "Defaulted",
  },
  paid_off: {
    bg: "bg-blue-100",
    text: "text-blue-700",
    label: "Paid Off",
  },
  in_grace_period: {
    bg: "bg-purple-100",
    text: "text-purple-700",
    label: "Grace Period",
  },
};

const ActiveLoansTable = ({ loans }: ActiveLoansTableProps) => {
  if (!loans || loans.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-gray-200 p-12 text-center">
        <p className="text-16 font-medium text-gray-600">No active loans</p>
        <p className="text-14 text-gray-400 mt-2">
          Your linked loans will appear here once synced.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50">
            <th className="px-4 py-3 text-left text-12 font-medium text-gray-500 uppercase tracking-wider">
              Loan
            </th>
            <th className="px-4 py-3 text-left text-12 font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">
              Original Amount
            </th>
            <th className="px-4 py-3 text-left text-12 font-medium text-gray-500 uppercase tracking-wider">
              Remaining
            </th>
            <th className="px-4 py-3 text-left text-12 font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">
              Interest Rate
            </th>
            <th className="px-4 py-3 text-left text-12 font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">
              Monthly Payment
            </th>
            <th className="px-4 py-3 text-left text-12 font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th className="px-4 py-3 text-left text-12 font-medium text-gray-500 uppercase tracking-wider hidden xl:table-cell">
              Progress
            </th>
          </tr>
        </thead>
        <tbody>
          {loans.map((loan) => {
            const progressPercent =
              loan.originalAmount > 0
                ? Math.round(
                    ((loan.originalAmount - loan.remainingBalance) /
                      loan.originalAmount) *
                      100
                  )
                : 0;
            const style = statusStyles[loan.status] || statusStyles.current;

            return (
              <tr
                key={loan.id}
                className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
              >
                {/* Loan Name & Type */}
                <td className="px-4 py-4">
                  <div className="flex items-center gap-3">
                    <span className="text-20">
                      {loanTypeIcons[loan.loanType] || "💳"}
                    </span>
                    <div>
                      <p className="text-14 font-medium text-gray-900 truncate max-w-[200px]">
                        {loan.name}
                      </p>
                      <p className="text-12 text-gray-500">
                        {loan.institutionName} &middot;{" "}
                        {loanTypeLabels[loan.loanType] || loan.loanType}
                      </p>
                    </div>
                  </div>
                </td>

                {/* Original Amount */}
                <td className="px-4 py-4 hidden sm:table-cell">
                  <p className="text-14 text-gray-700">
                    {formatAmount(loan.originalAmount)}
                  </p>
                </td>

                {/* Remaining Balance */}
                <td className="px-4 py-4">
                  <p className="text-14 font-medium text-gray-900">
                    {formatAmount(loan.remainingBalance)}
                  </p>
                </td>

                {/* Interest Rate */}
                <td className="px-4 py-4 hidden md:table-cell">
                  <p className="text-14 text-gray-700">
                    {loan.interestRate.toFixed(2)}%
                  </p>
                </td>

                {/* Monthly Payment */}
                <td className="px-4 py-4 hidden lg:table-cell">
                  <p className="text-14 text-gray-700">
                    {formatAmount(loan.monthlyPayment)}
                  </p>
                </td>

                {/* Status */}
                <td className="px-4 py-4">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-12 font-medium ${style.bg} ${style.text}`}
                  >
                    {style.label}
                  </span>
                </td>

                {/* Progress */}
                <td className="px-4 py-4 hidden xl:table-cell">
                  <div className="flex items-center gap-2 min-w-[120px]">
                    <Progress
                      value={progressPercent}
                      className="h-2 flex-1"
                    />
                    <span className="text-12 text-gray-500 whitespace-nowrap">
                      {progressPercent}%
                    </span>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default ActiveLoansTable;
