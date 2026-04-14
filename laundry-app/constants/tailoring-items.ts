export const TAILORING_ITEM_DEFS: { id: string; name: string }[] = [
  { id: "pants", name: "Pants" },
  { id: "shirt", name: "Shirt" },
  { id: "suit", name: "Suit" },
  { id: "dress", name: "Dress" },
];

export function initialTailoringQuantities(): Record<string, number> {
  const o: Record<string, number> = {};
  for (const d of TAILORING_ITEM_DEFS) {
    o[d.id] = 0;
  }
  return o;
}
