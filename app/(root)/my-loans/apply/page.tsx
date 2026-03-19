import HeaderBox from "@/components/HeaderBox";
import LoanApplicationForm from "@/components/LoanApplicationForm";
import { getCurrentUser } from "@/lib/actions/user.actions";

const ApplyForLoan = async () => {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return (
      <section className="my-banks">
        <div className="flex flex-col gap-4">
          <p>Please sign in to apply for a loan.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="no-scrollbar flex w-full flex-col gap-6 overflow-y-scroll bg-gray-25 p-8 xl:py-12">
      <HeaderBox
        type="title"
        title="Apply for a Loan"
        subtext="Fill out the form below to apply for a loan. Your information is pre-filled from your profile."
      />

      <LoanApplicationForm user={currentUser} />
    </section>
  );
};

export default ApplyForLoan;
