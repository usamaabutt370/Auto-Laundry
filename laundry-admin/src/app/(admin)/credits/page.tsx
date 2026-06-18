import { PartnerCreditsList } from "@/features/admin/components/partner-credits-list";
import { getAdminCredits } from "@/features/admin/data/admin-credits";

export const dynamic = "force-dynamic";

export default async function CreditsPage() {
  const { transactions, balances } = await getAdminCredits();

  return (
    <PartnerCreditsList
      transactions={transactions}
      balances={balances}
    />
  );
}
