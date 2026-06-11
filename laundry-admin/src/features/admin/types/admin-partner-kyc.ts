export type PartnerOnboardingStatus = "pending" | "approved" | "rejected";

export type PartnerKycSnapshot = {
  businessProfile?: Record<string, unknown> | null;
  servicePricing?: Record<string, unknown> | null;
  serviceLines?: unknown[] | null;
  riders?: unknown[] | null;
  ridersResponsibilityAccepted?: boolean | null;
};

export type AdminPartnerRider = {
  id: string;
  name: string;
  phone: string;
  photoUrl: string;
  createdAt: string | null;
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
    businessPhone: string | null;
    businessAddress: string | null;
    businessImages: string[];
    pickupDeliveryEnabled: boolean | null;
    pickupDeliveryAmount: string | null;
    ridersResponsibilityAcceptedAt: string | null;
  };
  riders: AdminPartnerRider[];
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
