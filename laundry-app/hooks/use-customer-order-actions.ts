import { useRouter } from "expo-router";
import { useCallback, useState } from "react";

import { showAppAlert } from "@/components/app-alert";
import { useAuth } from "@/contexts/auth-context";
import { useCustomerOrderDraft } from "@/contexts/customer-order-draft-context";
import { useLocale } from "@/contexts/locale-context";
import { fetchCustomerOrderForReorder } from "@/lib/customer-order-edit";
import {
  deleteCustomerOrder,
  hideCustomerOrder,
  type CustomerOrderDbStatus,
} from "@/lib/customer-orders";
import { getStrings } from "@/locales";

export type ActionableOrder = {
  id: string;
  orderRef: string;
  rawStatus: CustomerOrderDbStatus;
};

/** Reorder + delete actions for finished customer orders (list card and detail screen). */
export function useCustomerOrderActions() {
  const router = useRouter();
  const { user } = useAuth();
  const { locale } = useLocale();
  const { loadDraftForReorder, startReorderWithNewProvider } = useCustomerOrderDraft();
  const s = getStrings(locale).customer.ordersTab.orderActions;
  const [reorderingId, setReorderingId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const runReorder = useCallback(
    async (order: ActionableOrder, target: "same" | "another") => {
      if (!user?.id) return;
      setReorderingId(order.id);
      try {
        const loaded = await fetchCustomerOrderForReorder(user.id, order.id);
        if (!loaded || loaded.draft.selectedServiceIds.length === 0) {
          showAppAlert(s.reorderErrorTitle, s.reorderErrorMessage);
          return;
        }

        if (target === "another") {
          // Items carry over to whichever provider the customer opens from home.
          startReorderWithNewProvider(loaded.draft, {
            orderId: order.id,
            orderRef: order.orderRef,
            replaceOnSubmit: order.rawStatus === "rejected",
          });
          try {
            if (typeof router.dismissAll === "function" && router.canDismiss()) {
              router.dismissAll();
            }
          } catch {
            // ignore
          }
          router.replace("/(customer)/(tabs)");
          return;
        }

        loadDraftForReorder(loaded.draft);
        if (loaded.draft.pickupDeliveryRequested && !loaded.draft.pickup) {
          router.push({ pathname: "/(customer)/schedule-pickup", params: { next: "summary" } });
        } else {
          router.push("/(customer)/order-summary");
        }
      } catch (e) {
        showAppAlert(s.reorderErrorTitle, e instanceof Error ? e.message : s.reorderErrorMessage);
      } finally {
        setReorderingId(null);
      }
    },
    [
      loadDraftForReorder,
      router,
      s.reorderErrorMessage,
      s.reorderErrorTitle,
      startReorderWithNewProvider,
      user?.id,
    ],
  );

  const reorder = useCallback(
    (order: ActionableOrder) => {
      // The provider turned a rejected order down, so only "another provider" makes sense.
      if (order.rawStatus === "rejected") {
        void runReorder(order, "another");
        return;
      }
      showAppAlert(s.reorderChoiceTitle, s.reorderChoiceMessage, [
        { text: s.reorderSameProvider, onPress: () => void runReorder(order, "same") },
        { text: s.reorderAnotherProvider, onPress: () => void runReorder(order, "another") },
        { text: s.cancel, style: "cancel" },
      ]);
    },
    [
      runReorder,
      s.cancel,
      s.reorderAnotherProvider,
      s.reorderChoiceMessage,
      s.reorderChoiceTitle,
      s.reorderSameProvider,
    ],
  );

  const remove = useCallback(
    (order: ActionableOrder, onRemoved?: () => void) => {
      showAppAlert(s.deleteTitle, s.deleteMessage, [
        { text: s.cancel, style: "cancel" },
        {
          text: s.delete,
          style: "destructive",
          onPress: async () => {
            setRemovingId(order.id);
            try {
              // Rejected orders never reached the partner's records, so they can go entirely.
              // Completed / cancelled ones are only hidden so partner history stays intact.
              if (order.rawStatus === "rejected") {
                await deleteCustomerOrder(order.id);
              } else {
                await hideCustomerOrder(order.id);
              }
              onRemoved?.();
            } catch (e) {
              showAppAlert(s.deleteErrorTitle, e instanceof Error ? e.message : s.deleteErrorMessage);
            } finally {
              setRemovingId(null);
            }
          },
        },
      ]);
    },
    [s],
  );

  return { reorder, remove, reorderingId, removingId };
}
