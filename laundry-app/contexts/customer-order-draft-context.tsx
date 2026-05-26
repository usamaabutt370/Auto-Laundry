import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

export type CustomerServiceId = "washAndFold" | "dryCleaning" | "tailoring";

export type CustomerOrderDraft = {
  partnerId: string | null;
  partnerName: string | null;
  pickupDeliveryRequested: boolean;
  selectedServiceIds: CustomerServiceId[];
  washFold: {
    itemizedQuantities: Record<string, number>;
    itemizedInstructions: string;
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
  setWashFoldItemizedQuantities: (quantities: Record<string, number>) => void;
  setWashFoldItemizedInstructions: (instructions: string) => void;
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
      if (p.partnerId === partnerId) {
        return { ...p, partnerName };
      }
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

  const setWashFoldItemizedQuantities = useCallback(
    (quantities: Record<string, number>) => {
      setDraft((p) => ({
        ...p,
        washFold: {
          itemizedQuantities: quantities,
          itemizedInstructions: p.washFold?.itemizedInstructions ?? "",
        },
      }));
    },
    [],
  );

  const setWashFoldItemizedInstructions = useCallback((instructions: string) => {
    setDraft((p) => {
      const wf = p.washFold ?? {
        itemizedQuantities: {},
        itemizedInstructions: "",
      };
      return { ...p, washFold: { ...wf, itemizedInstructions: instructions } };
    });
  }, []);

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
      setWashFoldItemizedQuantities,
      setWashFoldItemizedInstructions,
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
      setWashFoldItemizedQuantities,
      setWashFoldItemizedInstructions,
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
