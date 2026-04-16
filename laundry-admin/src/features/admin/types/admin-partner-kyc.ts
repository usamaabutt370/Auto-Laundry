export type PartnerOnboardingStatus = "draft" | "submitted" | "approved" | "rejected";

export type PartnerKycSnapshot = {
  businessProfile?: Record<string, unknown> | null;
  servicePricing?: Record<string, unknown> | null;
  serviceLines?: unknown[] | null;
};

export type AdminPartnerKycListItem = {
  userId: string;
  partnerName: string;
  businessName: string;
  email: string;
  phone: string;
  status: PartnerOnboardingStatus;
  submittedAt: string | null;
  reviewedAt: string | null;
  reviewedBy: string | null;
};

export type AdminPartnerKycDetail = {
  userId: string;
  profile: {
    fullName: string;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    phone: string | null;
    role: string | null;
    createdAt: string | null;
  };
  business: {
    businessName: string | null;
    businessDescription: string | null;
    pickupDeliveryEnabled: boolean | null;
    pickupDeliveryAmount: string | null;
  };
  services: Array<{
    id: string;
    name: string;
    category: string | null;
    priceDisplay: string | null;
  }>;
  request: {
    id: string | null;
    status: PartnerOnboardingStatus;
    submittedAt: string | null;
    reviewedAt: string | null;
    reviewedBy: string | null;
    rejectionReason: string | null;
    updatedAt: string | null;
    notes: PartnerKycSnapshot | null;
    notesRaw: unknown;
  };
};
export type PartnerOnboardingStatus = "draft" | "submitted" | "approved" | "rejected";

export type PartnerKycSnapshot = {
  businessProfile?: Record<string, unknown> | null;
  servicePricing?: Record<string, unknown> | null;
  serviceLines?: unknown[] | null;
};

export type AdminPartnerKycListItem = {
  userId: string;
  partnerName: string;
  businessName: string;
  email: string;
  phone: string;
  status: PartnerOnboardingStatus;
  submittedAt: string | null;
  reviewedAt: string | null;
  reviewedBy: string | null;
};

export type AdminPartnerKycDetail = {
  userId: string;
  profile: {
    fullName: string;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    phone: string | null;
    role: string | null;
    createdAt: string | null;
  };
  business: {
    businessName: string | null;
    businessDescription: string | null;
    pickupDeliveryEnabled: boolean | null;
    pickupDeliveryAmount: string | null;
  };
  services: Array<{
    id: string;
    name: string;
    category: string | null;
    priceDisplay: string | null;
  }>;
  request: {
    id: string | null;
    status: PartnerOnboardingStatus;
    submittedAt: string | null;
    reviewedAt: string | null;
    reviewedBy: string | null;
    rejectionReason: string | null;
    updatedAt: string | null;
    notes: PartnerKycSnapshot | null;
    notesRaw: unknown;
  };
};
