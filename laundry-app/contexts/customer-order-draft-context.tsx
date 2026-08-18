import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";

export type CustomerServiceId = "washAndFold" | "dryCleaning" | "tailoring" | "press";

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
  press: {
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
  press: null,
  pickup: null,
  delivery: null,
  tailoring: null,
});

type Value = {
  draft: CustomerOrderDraft;
  /** Set while customer is editing a submitted order (before partner accepts). */
  editingOrderId: string | null;
  setPartner: (partnerId: string, partnerName: string | null) => void;
  setPickupDeliveryRequested: (enabled: boolean) => void;
  setSelectedServiceIds: (ids: CustomerServiceId[]) => void;
  setWashFoldItemizedQuantities: (quantities: Record<string, number>) => void;
  setWashFoldItemizedInstructions: (instructions: string) => void;
  setDryCleanItemizedQuantities: (quantities: Record<string, number>) => void;
  setDryCleanItemizedInstructions: (instructions: string) => void;
  setPressItemizedQuantities: (quantities: Record<string, number>) => void;
  setPressItemizedInstructions: (instructions: string) => void;
  setTailoringItemizedQuantities: (quantities: Record<string, number>) => void;
  setTailoringItemizedInstructions: (instructions: string) => void;
  setPickupSchedule: (slot: CustomerOrderDraft["pickup"]) => void;
  setDeliverySchedule: (slot: CustomerOrderDraft["delivery"]) => void;
  loadDraftForEdit: (draft: CustomerOrderDraft, orderId: string) => void;
  clearEditingOrder: () => void;
  resetDraft: () => void;
};

const Ctx = createContext<Value | null>(null);

export function CustomerOrderDraftProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [draft, setDraft] = useState<CustomerOrderDraft>(emptyDraft);
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const draftRef = useRef(draft);
  const editingOrderIdRef = useRef<string | null>(null);
  draftRef.current = draft;
  editingOrderIdRef.current = editingOrderId;

  const setPartner = useCallback((partnerId: string, partnerName: string | null) => {
    if (editingOrderIdRef.current) {
      if (draftRef.current.partnerId && draftRef.current.partnerId !== partnerId) {
        return;
      }
      setDraft((p) => ({ ...p, partnerId, partnerName }));
      return;
    }
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
        press: null,
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

  const setPressItemizedQuantities = useCallback(
    (quantities: Record<string, number>) => {
      setDraft((p) => ({
        ...p,
        press: {
          itemizedQuantities: quantities,
          itemizedInstructions: p.press?.itemizedInstructions ?? "",
        },
      }));
    },
    [],
  );

  const setPressItemizedInstructions = useCallback((instructions: string) => {
    setDraft((p) => {
      const pr = p.press ?? {
        itemizedQuantities: {},
        itemizedInstructions: "",
      };
      return { ...p, press: { ...pr, itemizedInstructions: instructions } };
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

  const loadDraftForEdit = useCallback((nextDraft: CustomerOrderDraft, orderId: string) => {
    setDraft(nextDraft);
    setEditingOrderId(orderId);
  }, []);

  const clearEditingOrder = useCallback(() => {
    setEditingOrderId(null);
  }, []);

  const resetDraft = useCallback(() => {
    setDraft(emptyDraft());
    setEditingOrderId(null);
  }, []);

  const value = useMemo<Value>(
    () => ({
      draft,
      editingOrderId,
      setPartner,
      setPickupDeliveryRequested,
      setSelectedServiceIds,
      setWashFoldItemizedQuantities,
      setWashFoldItemizedInstructions,
      setDryCleanItemizedQuantities,
      setDryCleanItemizedInstructions,
      setPressItemizedQuantities,
      setPressItemizedInstructions,
      setTailoringItemizedQuantities,
      setTailoringItemizedInstructions,
      setPickupSchedule,
      setDeliverySchedule,
      loadDraftForEdit,
      clearEditingOrder,
      resetDraft,
    }),
    [
      draft,
      editingOrderId,
      setPartner,
      setPickupDeliveryRequested,
      setSelectedServiceIds,
      setWashFoldItemizedQuantities,
      setWashFoldItemizedInstructions,
      setDryCleanItemizedQuantities,
      setDryCleanItemizedInstructions,
      setPressItemizedQuantities,
      setPressItemizedInstructions,
      setTailoringItemizedQuantities,
      setTailoringItemizedInstructions,
      setPickupSchedule,
      setDeliverySchedule,
      loadDraftForEdit,
      clearEditingOrder,
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
