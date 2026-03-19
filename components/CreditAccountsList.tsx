"use client";

import { formatAmount } from "@/lib/utils";

const CreditAccountsList = ({ accounts }: CreditAccountsListProps) => {
  if (!accounts || accounts.length === 0) {
    return (
      <div className="flex items-center justify-center h-[100px] text-14 text-gray-500">
        No credit accounts found. Link a bank with credit accounts to see your
        breakdown.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-12 font-medium text-gray-600 text-left py-3 pr-4">
              Account
            </th>
            <th className="text-12 font-medium text-gray-600 text-right py-3 px-4">
              Balance
            </th>
            <th className="text-12 font-medium text-gray-600 text-right py-3 px-4">
              Limit
            </th>
            <th className="text-12 font-medium text-gray-600 text-right py-3 pl-4">
              Utilization
            </th>
          </tr>
        </thead>
        <tbody>
          {accounts.map(account => (
            <tr
              key={account.accountId}
              className="border-b border-gray-100 last:border-0"
            >
              <td className="py-3 pr-4">
                <div className="flex flex-col">
                  <span className="text-14 font-medium text-gray-900 truncate max-w-[200px]">
                    {account.officialName || account.name}
                  </span>
                  <span className="text-12 text-gray-500 capitalize">
                    {account.type === "revolving"
                      ? "Credit Card"
                      : account.type}
                  </span>
                </div>
              </td>
              <td className="text-14 text-gray-900 text-right py-3 px-4">
                {formatAmount(account.currentBalance)}
              </td>
              <td className="text-14 text-gray-900 text-right py-3 px-4">
                {account.creditLimit !== null
                  ? formatAmount(account.creditLimit)
                  : "N/A"}
              </td>
              <td className="text-right py-3 pl-4">
                {account.utilization !== null ? (
                  <div className="flex flex-col items-end gap-1">
                    <span
                      className={`text-14 font-medium ${
                        account.utilization > 0.75
                          ? "text-red-500"
                          : account.utilization > 0.3
                            ? "text-yellow-600"
                            : "text-green-600"
                      }`}
                    >
                      {(account.utilization * 100).toFixed(1)}%
                    </span>
                    <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          account.utilization > 0.75
                            ? "bg-red-500"
                            : account.utilization > 0.3
                              ? "bg-yellow-500"
                              : "bg-green-500"
                        }`}
                        style={{
                          width: `${Math.min(100, account.utilization * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                ) : (
                  <span className="text-14 text-gray-500">N/A</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default CreditAccountsList;
