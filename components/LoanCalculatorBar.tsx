"use client";

import { useMemo } from "react";
import { formatAmount } from "@/lib/utils";

const LoanCalculatorBar = ({
  loanType,
  amount,
  termMonths,
  estimatedAPR,
}: LoanCalculatorBarProps) => {
  const calculations = useMemo(() => {
    if (!amount || !termMonths || amount <= 0 || termMonths <= 0) {
      return {
        monthlyPayment: 0,
        totalInterest: 0,
        totalAmount: 0,
      };
    }

    const monthlyRate = estimatedAPR / 100 / 12;

    let monthlyPayment: number;
    if (monthlyRate <= 0) {
      monthlyPayment = amount / termMonths;
    } else {
      const compoundFactor = Math.pow(1 + monthlyRate, termMonths);
      monthlyPayment =
        (amount * (monthlyRate * compoundFactor)) / (compoundFactor - 1);
    }

    const totalAmount = monthlyPayment * termMonths;
    const totalInterest = totalAmount - amount;

    return {
      monthlyPayment,
      totalInterest,
      totalAmount,
    };
  }, [amount, termMonths, estimatedAPR]);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 bg-white shadow-lg">
      <div className="mx-auto max-w-[1200px] px-4 py-4 sm:px-6">
        {/* Calculation Results */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-4 sm:gap-8">
            {/* Monthly Payment */}
            <div className="flex flex-col">
              <p className="text-12 font-medium text-gray-500">
                Est. Monthly Payment
              </p>
              <p className="text-20 font-bold text-gray-900">
                {calculations.monthlyPayment > 0
                  ? formatAmount(calculations.monthlyPayment)
                  : "--"}
              </p>
            </div>

            {/* Estimated APR */}
            <div className="flex flex-col">
              <p className="text-12 font-medium text-gray-500">
                Estimated APR
              </p>
              <p className="text-16 font-semibold text-gray-700">
                {estimatedAPR > 0 ? `${estimatedAPR.toFixed(3)}%` : "--"}
              </p>
            </div>

            {/* Total Interest */}
            <div className="flex flex-col">
              <p className="text-12 font-medium text-gray-500">
                Total Interest
              </p>
              <p className="text-16 font-semibold text-gray-700">
                {calculations.totalInterest > 0
                  ? formatAmount(calculations.totalInterest)
                  : "--"}
              </p>
            </div>

            {/* Total Amount */}
            <div className="flex flex-col">
              <p className="text-12 font-medium text-gray-500">Total Amount</p>
              <p className="text-16 font-semibold text-gray-700">
                {calculations.totalAmount > 0
                  ? formatAmount(calculations.totalAmount)
                  : "--"}
              </p>
            </div>
          </div>
        </div>

        {/* TILA Disclosure */}
        <p className="mt-3 text-[10px] leading-[14px] text-gray-400">
          <strong>TILA Disclosure:</strong> These estimates are for
          informational purposes only and do not constitute an offer of credit.
          Actual rates, terms, and monthly payments may vary based on your
          creditworthiness, loan amount, and other factors. The Annual Percentage
          Rate (APR) shown is an estimate and may differ from the rate offered to
          you. All loans are subject to credit approval. Please review all loan
          terms carefully before signing any agreement. Equal Housing Lender.
        </p>
      </div>
    </div>
  );
};

export default LoanCalculatorBar;
