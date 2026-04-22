import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

export type CustomerServiceId = "washAndFold" | "dryCleaning" | "tailoring";

export type WashFoldBagDetail = {
  weightLabel: string;
  weightLb: number;
  itemCount: number;
  instructions: string;
};

/** Customer chooses whether wash & fold estimate uses bag count or item count × partner rate. */
export type WashFoldPricingMode = "per_bag" | "per_item";

export type CustomerOrderDraft = {
  partnerId: string | null;
  partnerName: string | null;
  pickupDeliveryRequested: boolean;
  selectedServiceIds: CustomerServiceId[];
  washFold: {
    bagCount: number;
    pricingMode: WashFoldPricingMode;
    /** True after the user has used per-bag mode; bag line is included in estimates when set. */
    estimateIncludeBag: boolean;
    /** True after the user has used per-item mode; item line is included when set and item count is positive. */
    estimateIncludeItem: boolean;
    bagDetailsByIndex: Record<number, WashFoldBagDetail>;
  } | null;
  dryClean: {
    itemizedQuantities: Record<string, number>;
    itemizedInstructions: string;
  } | null;
  tailoring: {
    itemizedQuantities: Record<string, number>;
    itemizedInstructions: string;
  } | null;
  pickup: {
    dateIso: string;
    timeSlotLabel: string;
    dayLabel: string;
    instructions: string;
  } | null;
  delivery: {
    dateIso: string;
    timeSlotLabel: string;
    dayLabel: string;
    instructions: string;
  } | null;
};

const emptyDraft = (): CustomerOrderDraft => ({
  partnerId: null,
  partnerName: null,
  pickupDeliveryRequested: false,
  selectedServiceIds: [],
  washFold: null,
  dryClean: null,
  pickup: null,
  delivery: null,
  tailoring: null,
});

type Value = {
  draft: CustomerOrderDraft;
  setPartner: (partnerId: string, partnerName: string | null) => void;
  setPickupDeliveryRequested: (enabled: boolean) => void;
  setSelectedServiceIds: (ids: CustomerServiceId[]) => void;
  setWashFoldBagCount: (bagCount: number) => void;
  setWashFoldPricingMode: (mode: WashFoldPricingMode) => void;
  setWashFoldBagDetail: (bagIndex: number, detail: WashFoldBagDetail) => void;
  setDryCleanItemizedQuantities: (quantities: Record<string, number>) => void;
  setDryCleanItemizedInstructions: (instructions: string) => void;
  setTailoringItemizedQuantities: (quantities: Record<string, number>) => void;
  setTailoringItemizedInstructions: (instructions: string) => void;
  setPickupSchedule: (slot: CustomerOrderDraft["pickup"]) => void;
  setDeliverySchedule: (slot: CustomerOrderDraft["delivery"]) => void;
  resetDraft: () => void;
};

const Ctx = createContext<Value | null>(null);

export function CustomerOrderDraftProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [draft, setDraft] = useState<CustomerOrderDraft>(emptyDraft);

  const setPartner = useCallback((partnerId: string, partnerName: string | null) => {
    setDraft((p) => {
      // Keep current draft when re-selecting the same partner.
      if (p.partnerId === partnerId) {
        return { ...p, partnerName };
      }
      // Switching partner must start a fresh order draft for that partner.
      return {
        ...p,
        partnerId,
        partnerName,
        pickupDeliveryRequested: false,
        selectedServiceIds: [],
        washFold: null,
        dryClean: null,
        tailoring: null,
        pickup: null,
        delivery: null,
      };
    });
  }, []);

  const setPickupDeliveryRequested = useCallback((enabled: boolean) => {
    setDraft((p) => ({
      ...p,
      pickupDeliveryRequested: enabled,
      pickup: enabled ? p.pickup : null,
      delivery: enabled ? p.delivery : null,
    }));
  }, []);

  const setSelectedServiceIds = useCallback((ids: CustomerServiceId[]) => {
    setDraft((p) => {
      const prev = p.selectedServiceIds;
      const sameLength = prev.length === ids.length;
      const sameValues = sameLength && prev.every((v, i) => v === ids[i]);
      if (sameValues) return p;
      return { ...p, selectedServiceIds: ids };
    });
  }, []);

  const setWashFoldBagCount = useCallback((bagCount: number) => {
    setDraft((p) => ({
      ...p,
      washFold: {
        bagCount,
        pricingMode: p.washFold?.pricingMode ?? "per_bag",
        estimateIncludeBag: p.washFold?.estimateIncludeBag ?? true,
        estimateIncludeItem: p.washFold?.estimateIncludeItem ?? false,
        bagDetailsByIndex: p.washFold?.bagDetailsByIndex ?? {},
      },
    }));
  }, []);

  const setWashFoldPricingMode = useCallback((pricingMode: WashFoldPricingMode) => {
    setDraft((p) => {
      const wf = p.washFold ?? {
        bagCount: 0,
        pricingMode,
        estimateIncludeBag: pricingMode === "per_bag",
        estimateIncludeItem: pricingMode === "per_item",
        bagDetailsByIndex: {},
      };
      return {
        ...p,
        washFold: {
          ...wf,
          pricingMode,
          estimateIncludeBag:
            pricingMode === "per_bag" ? true : wf.estimateIncludeBag,
          estimateIncludeItem:
            pricingMode === "per_item" ? true : wf.estimateIncludeItem,
        },
      };
    });
  }, []);

  const setWashFoldBagDetail = useCallback(
    (bagIndex: number, detail: WashFoldBagDetail) => {
      setDraft((p) => {
        const wf = p.washFold ?? {
          bagCount: 0,
          pricingMode: "per_bag" as WashFoldPricingMode,
          estimateIncludeBag: true,
          estimateIncludeItem: false,
          bagDetailsByIndex: {},
        };
        return {
          ...p,
          washFold: {
            ...wf,
            bagDetailsByIndex: { ...wf.bagDetailsByIndex, [bagIndex]: detail },
          },
        };
      });
    },
    [],
  );

  const setDryCleanItemizedQuantities = useCallback(
    (quantities: Record<string, number>) => {
      setDraft((p) => ({
        ...p,
        dryClean: {
          itemizedQuantities: quantities,
          itemizedInstructions: p.dryClean?.itemizedInstructions ?? "",
        },
      }));
    },
    [],
  );

  const setDryCleanItemizedInstructions = useCallback((instructions: string) => {
    setDraft((p) => {
      const dc = p.dryClean ?? {
        itemizedQuantities: {},
        itemizedInstructions: "",
      };
      return { ...p, dryClean: { ...dc, itemizedInstructions: instructions } };
    });
  }, []);

  const setTailoringItemizedQuantities = useCallback(
    (quantities: Record<string, number>) => {
      setDraft((p) => ({
        ...p,
        tailoring: {
          itemizedQuantities: quantities,
          itemizedInstructions: p.tailoring?.itemizedInstructions ?? "",
        },
      }));
    },
    [],
  );

  const setTailoringItemizedInstructions = useCallback((instructions: string) => {
    setDraft((p) => {
      const t = p.tailoring ?? {
        itemizedQuantities: {},
        itemizedInstructions: "",
      };
      return { ...p, tailoring: { ...t, itemizedInstructions: instructions } };
    });
  }, []);

  const setPickupSchedule = useCallback((slot: CustomerOrderDraft["pickup"]) => {
    setDraft((p) => ({ ...p, pickup: slot }));
  }, []);

  const setDeliverySchedule = useCallback((slot: CustomerOrderDraft["delivery"]) => {
    setDraft((p) => ({ ...p, delivery: slot }));
  }, []);

  const resetDraft = useCallback(() => setDraft(emptyDraft()), []);

  const value = useMemo<Value>(
    () => ({
      draft,
      setPartner,
      setPickupDeliveryRequested,
      setSelectedServiceIds,
      setWashFoldBagCount,
      setWashFoldPricingMode,
      setWashFoldBagDetail,
      setDryCleanItemizedQuantities,
      setDryCleanItemizedInstructions,
      setTailoringItemizedQuantities,
      setTailoringItemizedInstructions,
      setPickupSchedule,
      setDeliverySchedule,
      resetDraft,
    }),
    [
      draft,
      setPartner,
      setPickupDeliveryRequested,
      setSelectedServiceIds,
      setWashFoldBagCount,
      setWashFoldPricingMode,
      setWashFoldBagDetail,
      setDryCleanItemizedQuantities,
      setDryCleanItemizedInstructions,
      setTailoringItemizedQuantities,
      setTailoringItemizedInstructions,
      setPickupSchedule,
      setDeliverySchedule,
      resetDraft,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCustomerOrderDraft(): Value {
  const v = useContext(Ctx);
  if (!v) throw new Error("useCustomerOrderDraft requires provider");
  return v;
}
