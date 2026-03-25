import { redirect } from "next/navigation";
import HeaderBox from "@/components/HeaderBox";
import PaymentTransferForm from "@/components/PaymentTransferForm";
import { getAccounts, getCurrentUser } from "@/lib/api";

const Transfer = async () => {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/sign-in");
  const accounts = await getAccounts(currentUser.$id || currentUser.id);

  if (!accounts) return;

  return (
    <section className="payment-transfer">
      <HeaderBox
        title="Payment Transfer"
        subtext="Please provide any specific details or notes related to the payment transfer."
      />
      <section className="size-full pt-5">
        <PaymentTransferForm accounts={accounts?.data} />
      </section>
    </section>
  );
};

export default Transfer;
