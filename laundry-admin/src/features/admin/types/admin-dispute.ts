export type DisputeStatus = "Open" | "Under review" | "Resolved" | "Closed";

export type DisputeCategory =
  | "Damaged items"
  | "Missed pickup"
  | "Billing"
  | "Delivery delay"
  | "Wrong items"
  | "Other";

export type AdminDispute = {
  id: string;
  orderId: string;
  customer: string;
  partner: string;
  category: DisputeCategory;
  summary: string;
  description: string;
  imageUrls: string[];
  status: DisputeStatus;
  openedAt: string;
  updatedAt: string;
};
