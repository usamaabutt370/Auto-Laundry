import { listPartnerCreditsForAdmin } from "@/features/admin/server/credits/partner-credits.repository";

export async function getAdminCredits() {
  return listPartnerCreditsForAdmin();
}
