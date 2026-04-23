import { PaymentsList } from "@/features/admin/components/payments-list";
import { getAdminPayments } from "@/features/admin/data/admin-payments";

export const dynamic = "force-dynamic";

export default async function PaymentsPage() {
  const payments = await getAdminPayments();

  return <PaymentsList payments={payments} />;
}
