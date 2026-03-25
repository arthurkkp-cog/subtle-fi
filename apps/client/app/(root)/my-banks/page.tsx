import { redirect } from "next/navigation";
import BankCard from "@/components/BankCard";
import HeaderBox from "@/components/HeaderBox";
import { getAccounts, getCurrentUser } from "@/lib/api";

const MyBanks = async () => {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/sign-in");
  const accounts = await getAccounts(currentUser.$id || currentUser.id);

  return (
    <section className="flex">
      <div className="my-banks">
        <HeaderBox
          title="My Bank Accounts"
          subtext="Effortlessly manage your banking activites"
        />

        <div className="space-y-4">
          <h2 className="header-2">Your Cards</h2>
          <div className="flex flex-wrap gap-6">
            {accounts &&
              accounts.data.map((account: Account) => (
                <BankCard
                  key={account.id}
                  account={account}
                  fullName={`${currentUser?.firstName} ${currentUser?.lastName}`}
                />
              ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default MyBanks;
