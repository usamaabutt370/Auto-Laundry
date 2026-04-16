import {
  getPartnerKycDetailForAdmin,
  listPartnerKycRequestsForAdmin,
} from "@/features/admin/server/kyc/partner-kyc.repository";
import type {
  AdminPartnerKycDetail,
  AdminPartnerKycListItem,
} from "@/features/admin/types/admin-partner-kyc";

export type { AdminPartnerKycDetail, AdminPartnerKycListItem } from "@/features/admin/types/admin-partner-kyc";

export async function getAdminPartnerKycList(): Promise<AdminPartnerKycListItem[]> {
  return listPartnerKycRequestsForAdmin();
}

export async function getAdminPartnerKycDetail(userId: string): Promise<AdminPartnerKycDetail | null> {
  return getPartnerKycDetailForAdmin(userId);
}
