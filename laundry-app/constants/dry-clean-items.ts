export const DRY_CLEAN_ITEM_DEFS: { id: string; name: string }[] = [
  { id: "suit", name: "Suit" },
  { id: "shirt", name: "Shirt" },
  { id: "pants", name: "Pants" },
  { id: "dress", name: "Dress" },
  { id: "sweater", name: "Sweater" },
  { id: "coat", name: "Coat" },
  { id: "jacket", name: "Jacket" },
  { id: "tie", name: "Tie" },
  { id: "robe", name: "Robe" },
  { id: "blanket", name: "Blanket" },
];

export function initialDryCleanQuantities(): Record<string, number> {
  const o: Record<string, number> = {};
  for (const d of DRY_CLEAN_ITEM_DEFS) {
    o[d.id] = 0;
  }
  return o;
}
