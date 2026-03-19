import HeaderBox from "@/components/HeaderBox";
import LoanSummaryCards from "@/components/LoanSummaryCards";
import ActiveLoansTable from "@/components/ActiveLoansTable";
import { getUserLoans } from "@/lib/actions/loan.actions";
import { getCurrentUser } from "@/lib/actions/user.actions";
import Link from "next/link";

const MyLoans = async () => {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return (
      <section className="my-banks">
        <div className="flex flex-col gap-4">
          <p>Please sign in to view your loans.</p>
        </div>
      </section>
    );
  }

  const loansSummary = await getUserLoans({
    userId: currentUser.id || currentUser.$id,
  });

  return (
    <section className="no-scrollbar flex w-full flex-col gap-8 overflow-y-scroll bg-gray-25 p-8 xl:py-12">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <HeaderBox
          type="title"
          title="My Loans"
          subtext="View and manage your loan accounts and applications."
        />
        <Link
          href="/my-loans/apply"
          className="text-14 rounded-lg bg-bank-gradient px-6 py-3 font-semibold text-white shadow-form transition-opacity hover:opacity-90 text-center"
        >
          Apply for a Loan
        </Link>
      </header>

      {loansSummary && (
        <>
          <LoanSummaryCards
            totalLoans={loansSummary.totalLoans}
            outstandingBalance={loansSummary.outstandingBalance}
            totalMonthlyPayment={loansSummary.totalMonthlyPayment}
          />

          <div className="flex flex-col gap-4">
            <h2 className="text-20 font-semibold text-gray-900">
              Active Loans
            </h2>
            <ActiveLoansTable loans={loansSummary.loans} />
          </div>
        </>
      )}

      {!loansSummary && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-gray-200 p-12 text-center">
          <p className="text-16 font-medium text-gray-600">
            Unable to load loan data
          </p>
          <p className="text-14 text-gray-400 mt-2">
            Please try again later or connect a bank account with loan
            information.
          </p>
        </div>
      )}
    </section>
  );
};

export default MyLoans;
