import type { AdminDispute } from "@/features/admin/types/admin-dispute";
import { listOrderDisputesForAdmin } from "@/features/admin/server/disputes/order-disputes.repository";

export type { AdminDispute, DisputeCategory, DisputeStatus } from "@/features/admin/types/admin-dispute";

export async function getAdminDisputes(): Promise<AdminDispute[]> {
  return listOrderDisputesForAdmin();
}
