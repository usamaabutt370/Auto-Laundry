import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import type { ServiceItem } from "@/types/merchant-services";
import { generateServiceId } from "@/types/merchant-services";
import { useAuth } from "@/contexts/auth-context";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

/** Dynamic row (label + value) from the screen where user sets prices. Used for onboarding price cards. */
export interface ServicePricingRow {
  label: string;
  value: string;
}

/** Per-service pricing: list of rows (labels from the price-setting screen). */
export interface ServicePricing {
  rows: ServicePricingRow[];
}

export type ServicePricingKey = "washAndFold" | "dryCleaning" | "tailoring";

/** Persisted items list + prices for Dry Cleaning / Tailoring so removals and additions survive navigation. */
export interface ItemizeState {
  items: { id: string; label: string }[];
  prices: Record<string, string>;
}

interface MerchantServicesContextValue {
  services: ServiceItem[];
  isLoadingServices: boolean;
  /** Set when user saves prices on onboarding. Shown on step2 for each service. */
  washAndFoldPricing: ServicePricing | null;
  setWashAndFoldPricing: (pricing: ServicePricing | null) => void;
  /** Pricing for dry cleaning and tailoring (same card as Wash & Fold). */
  dryCleaningPricing: ServicePricing | null;
  setDryCleaningPricing: (pricing: ServicePricing | null) => void;
  tailoringPricing: ServicePricing | null;
  setTailoringPricing: (pricing: ServicePricing | null) => void;
  /** Persisted item list + prices for service-other so removed/added items persist when navigating back. */
  dryCleaningItemizeState: ItemizeState | null;
  setDryCleaningItemizeState: (state: ItemizeState | null) => void;
  tailoringItemizeState: ItemizeState | null;
  setTailoringItemizeState: (state: ItemizeState | null) => void;
  addService: (item: Omit<ServiceItem, "id">) => void | Promise<void>;
  updateService: (id: string, updates: Partial<Omit<ServiceItem, "id">>) => void;
  removeService: (id: string) => void;
  setServices: React.Dispatch<React.SetStateAction<ServiceItem[]>>;
  refreshServices: () => Promise<void>;
}

const MerchantServicesContext = createContext<MerchantServicesContextValue | null>(null);

function mapRowToServiceItem(row: {
  id: string;
  name: string;
  price_display: string;
  category: string | null;
}): ServiceItem {
  return {
    id: row.id,
    name: row.name,
    priceDisplay: row.price_display,
    category: row.category ?? undefined,
  };
}

export function MerchantServicesProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [isLoadingServices, setIsLoadingServices] = useState(true);
  const [washAndFoldPricing, setWashAndFoldPricing] = useState<ServicePricing | null>(null);
  const [dryCleaningPricing, setDryCleaningPricing] = useState<ServicePricing | null>(null);
  const [tailoringPricing, setTailoringPricing] = useState<ServicePricing | null>(null);
  const [dryCleaningItemizeState, setDryCleaningItemizeState] = useState<ItemizeState | null>(null);
  const [tailoringItemizeState, setTailoringItemizeState] = useState<ItemizeState | null>(null);

  const fetchServices = useCallback(async () => {
    if (!supabase || !user?.id) {
      setServices([]);
      setIsLoadingServices(false);
      return;
    }
    setIsLoadingServices(true);
    const { data, error } = await supabase
      .from("partner_services")
      .select("id, name, price_display, category")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });
    if (error) {
      setServices([]);
    } else {
      setServices((data ?? []).map(mapRowToServiceItem));
    }
    setIsLoadingServices(false);
  }, [user?.id]);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  const addService = useCallback(
    async (item: Omit<ServiceItem, "id">) => {
      if (isSupabaseConfigured() && supabase && user?.id) {
        const { data, error } = await supabase
          .from("partner_services")
          .insert({
            user_id: user.id,
            name: item.name,
            price_display: item.priceDisplay,
            category: item.category ?? null,
          })
          .select("id, name, price_display, category")
          .single();
        if (!error && data) {
          setServices((prev) => [...prev, mapRowToServiceItem(data)]);
          return;
        }
      }
      setServices((prev) => [
        ...prev,
        { ...item, id: generateServiceId() },
      ]);
    },
    [user?.id]
  );

  const updateService = useCallback(
    async (id: string, updates: Partial<Omit<ServiceItem, "id">>) => {
      if (isSupabaseConfigured() && supabase && user?.id) {
        const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
        if (updates.name != null) payload.name = updates.name;
        if (updates.priceDisplay != null) payload.price_display = updates.priceDisplay;
        if (updates.category !== undefined) payload.category = updates.category ?? null;
        const { error } = await supabase
          .from("partner_services")
          .update(payload)
          .eq("id", id)
          .eq("user_id", user.id);
        if (!error) {
          setServices((prev) =>
            prev.map((s) => (s.id === id ? { ...s, ...updates } : s))
          );
          return;
        }
      }
      setServices((prev) =>
        prev.map((s) => (s.id === id ? { ...s, ...updates } : s))
      );
    },
    [user?.id]
  );

  const removeService = useCallback(
    async (id: string) => {
      if (isSupabaseConfigured() && supabase && user?.id) {
        const { error } = await supabase
          .from("partner_services")
          .delete()
          .eq("id", id)
          .eq("user_id", user.id);
        if (!error) {
          setServices((prev) => prev.filter((s) => s.id !== id));
          return;
        }
      }
      setServices((prev) => prev.filter((s) => s.id !== id));
    },
    [user?.id]
  );

  const value = useMemo(
    () => ({
      services,
      isLoadingServices,
      washAndFoldPricing,
      setWashAndFoldPricing,
      dryCleaningPricing,
      setDryCleaningPricing,
      tailoringPricing,
      setTailoringPricing,
      dryCleaningItemizeState,
      setDryCleaningItemizeState,
      tailoringItemizeState,
      setTailoringItemizeState,
      addService,
      updateService,
      removeService,
      setServices,
      refreshServices: fetchServices,
    }),
    [
      services,
      isLoadingServices,
      washAndFoldPricing,
      dryCleaningPricing,
      tailoringPricing,
      dryCleaningItemizeState,
      tailoringItemizeState,
      addService,
      updateService,
      removeService,
      fetchServices,
    ]
  );

  return (
    <MerchantServicesContext.Provider value={value}>
      {children}
    </MerchantServicesContext.Provider>
  );
}

export function useMerchantServices(): MerchantServicesContextValue {
  const ctx = useContext(MerchantServicesContext);
  if (!ctx) {
    throw new Error("useMerchantServices must be used within MerchantServicesProvider");
  }
  return ctx;
}
