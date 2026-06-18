import { DisputesList } from "@/features/admin/components/disputes-list";
import { fetchDisputesDemoData } from "@/features/admin/data/disputes-demo-data";

export default async function DisputesPage() {
  const disputes = await fetchDisputesDemoData();

  return <DisputesList disputes={disputes} />;
}
