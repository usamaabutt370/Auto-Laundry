/** Single merchant service item – used in Settings (Merchant Services) flow. */
export interface ServiceItem {
  id: string;
  name: string;
  priceDisplay: string;
  category?: string;
}

export function generateServiceId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}
