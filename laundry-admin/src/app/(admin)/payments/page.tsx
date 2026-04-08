import { PaymentsList } from "@/features/admin/components/payments-list";
import { fetchPaymentsDemoData } from "@/features/admin/data/payments-demo-data";

export default async function PaymentsPage() {
  const payments = await fetchPaymentsDemoData();

  return <PaymentsList payments={payments} />;
}
