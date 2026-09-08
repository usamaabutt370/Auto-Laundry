export const TOP_RATED_MIN_AVG = 4.5;

/** First-order deals shown on customer Home — used to flag providers with matching services. */
export const PLATFORM_SERVICE_DEALS: { category: string; percent: number; code: string }[] = [
  { category: "Wash & Fold", percent: 20, code: "T2L20" },
  { category: "Press", percent: 15, code: "PRESS15" },
  { category: "Tailoring", percent: 10, code: "STCH10" },
];

export type PartnerOffer = {
  percent: number;
  code: string;
};

export function bestOfferForCategories(categories: (string | null | undefined)[]): PartnerOffer | null {
  let best: PartnerOffer | null = null;
  for (const raw of categories) {
    const category = (raw ?? "").trim();
    const deal = PLATFORM_SERVICE_DEALS.find((item) => item.category === category);
    if (!deal) continue;
    if (!best || deal.percent > best.percent) {
      best = { percent: deal.percent, code: deal.code };
    }
  }
  return best;
}

export function isPartnerTopRated(ratingAvg: number | null | undefined, ratingCount: number | null | undefined): boolean {
  return (ratingCount ?? 0) > 0 && Number(ratingAvg) >= TOP_RATED_MIN_AVG;
}

export function partnerHasActiveOffer(offerPercent: number | null | undefined): boolean {
  return typeof offerPercent === "number" && Number.isFinite(offerPercent) && offerPercent > 0;
}
