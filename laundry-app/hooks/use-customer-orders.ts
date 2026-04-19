import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  deleteCustomerOrder,
  fetchCustomerOrders,
  type CustomerOrderListItem,
} from "@/lib/customer-orders";
import { supabase } from "@/lib/supabase";

export function useCustomerOrders(userId: string | undefined): {
  orders: CustomerOrderListItem[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  deleteOrder: (orderId: string) => Promise<void>;
} {
  const [orders, setOrders] = useState<CustomerOrderListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!userId || !supabase) {
      setOrders([]);
      setError(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      setError(null);
      const data = await fetchCustomerOrders(userId);
      setOrders(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load orders.");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const deleteOrder = useCallback(
    async (orderId: string) => {
      await deleteCustomerOrder(orderId);
      setOrders((prev) => prev.filter((o) => o.id !== orderId));
    },
    [],
  );

  /** Avoid stale closures and keep realtime effect deps only on userId (see below). */
  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  useEffect(() => {
    if (!userId || !supabase) return;

    // Unique name per subscription: reusing `customer-orders-${userId}` after
    // subscribe() can throw "cannot add postgres_changes callbacks ... after subscribe()"
    // when React Strict Mode or fast re-runs reuse the same channel slot.
    const channelName = `customer-orders-${userId}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "customer_orders",
          filter: `customer_id=eq.${userId}`,
        },
        () => {
          void refreshRef.current();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId]);

  return { orders, loading, error, refresh, deleteOrder };
}
