import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  isLegacyDryCleanItemLabel,
} from "@/constants/dry-clean-items";
import {
  isLegacyWashFoldGarmentLabel,
  isPressExcludedGarmentLabel,
  LEGACY_WASH_FOLD_PRICE_LABELS,
} from "@/constants/partner-wash-fold-items";
import type { ServiceItem } from "@/types/merchant-services";
import { generateServiceId } from "@/types/merchant-services";
import { useAuth } from "@/contexts/auth-context";
import { ensureActiveUserProfile } from "@/lib/ensure-user-profile";
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

export type ServicePricingKey = "washAndFold" | "dryCleaning" | "tailoring" | "press";

/** Optional pricing snapshot when persisting before React state has flushed. */
export type OnboardingServicesSnapshot = Partial<
  Record<ServicePricingKey, ServicePricing | null>
>;

/** Optional pickup + delivery add-on pricing shared across onboarding and settings services screen. */
export interface PickupDeliveryPricing {
  enabled: boolean;
  amount: string;
}

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
  pressPricing: ServicePricing | null;
  setPressPricing: (pricing: ServicePricing | null) => void;
  /** Persisted item list + prices for service-other so removed/added items persist when navigating back. */
  dryCleaningItemizeState: ItemizeState | null;
  setDryCleaningItemizeState: (state: ItemizeState | null) => void;
  tailoringItemizeState: ItemizeState | null;
  setTailoringItemizeState: (state: ItemizeState | null) => void;
  washFoldItemizeState: ItemizeState | null;
  setWashFoldItemizeState: (state: ItemizeState | null) => void;
  pressItemizeState: ItemizeState | null;
  setPressItemizeState: (state: ItemizeState | null) => void;
  pickupDeliveryPricing: PickupDeliveryPricing;
  setPickupDeliveryPricing: React.Dispatch<React.SetStateAction<PickupDeliveryPricing>>;
  savePickupDeliveryPricing: () => Promise<boolean>;
  isSavingPickupDeliveryPricing: boolean;
  submitOnboardingServices: (
    snapshot?: OnboardingServicesSnapshot,
  ) => Promise<{ ok: boolean; error?: string }>;
  isSubmittingOnboardingServices: boolean;
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
  const [pressPricing, setPressPricing] = useState<ServicePricing | null>(null);
  const [dryCleaningItemizeState, setDryCleaningItemizeState] = useState<ItemizeState | null>(null);
  const [tailoringItemizeState, setTailoringItemizeState] = useState<ItemizeState | null>(null);
  const [washFoldItemizeState, setWashFoldItemizeState] = useState<ItemizeState | null>(null);
  const [pressItemizeState, setPressItemizeState] = useState<ItemizeState | null>(null);
  const [pickupDeliveryPricing, setPickupDeliveryPricing] = useState<PickupDeliveryPricing>({
    enabled: false,
    amount: "",
  });
  const [isSavingPickupDeliveryPricing, setIsSavingPickupDeliveryPricing] = useState(false);
  const [isSubmittingOnboardingServices, setIsSubmittingOnboardingServices] = useState(false);

  const fetchServices = useCallback(async () => {
    if (!supabase || !user?.id) {
      setServices([]);
      setPickupDeliveryPricing({ enabled: false, amount: "" });
      setWashAndFoldPricing(null);
      setDryCleaningPricing(null);
      setTailoringPricing(null);
      setPressPricing(null);
      setDryCleaningItemizeState(null);
      setTailoringItemizeState(null);
      setWashFoldItemizeState(null);
      setPressItemizeState(null);
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
      setWashAndFoldPricing(null);
      setDryCleaningPricing(null);
      setTailoringPricing(null);
      setPressPricing(null);
      setDryCleaningItemizeState(null);
      setTailoringItemizeState(null);
      setWashFoldItemizeState(null);
      setPressItemizeState(null);
    } else {
      setServices((data ?? []).map(mapRowToServiceItem));
      
      const wafRows: ServicePricingRow[] = [];
      const dcRows: ServicePricingRow[] = [];
      const tailRows: ServicePricingRow[] = [];
      const pressRows: ServicePricingRow[] = [];

      const wafItems: { id: string; label: string }[] = [];
      const wafPrices: Record<string, string> = {};
      const dcItems: {id: string, label: string}[] = [];
      const dcPrices: Record<string, string> = {};
      const tailItems: {id: string, label: string}[] = [];
      const tailPrices: Record<string, string> = {};
      const pressItems: { id: string; label: string }[] = [];
      const pressPrices: Record<string, string> = {};

      (data ?? []).forEach(row => {
        if (row.category === "Wash & Fold") {
          const label = row.name.replace("Wash & Fold - ", "").trim();
          if (LEGACY_WASH_FOLD_PRICE_LABELS.has(label)) return;
          if (isLegacyWashFoldGarmentLabel(label)) return;
          const id = `item_${row.id}`;
          wafRows.push({ label, value: row.price_display });
          wafItems.push({ id, label });
          wafPrices[id] = row.price_display;
        } else if (row.category === "Dry Cleaning") {
          const label = row.name.replace("Dry Cleaning - ", "").trim();
          if (isLegacyDryCleanItemLabel(label)) return;
          const id = `item_${row.id}`;
          dcRows.push({ label, value: row.price_display });
          dcItems.push({ id, label });
          dcPrices[id] = row.price_display;
        } else if (row.category === "Tailoring") {
          const label = row.name.replace("Tailoring - ", "");
          const id = `item_${row.id}`;
          tailRows.push({ label, value: row.price_display });
          tailItems.push({ id, label });
          tailPrices[id] = row.price_display;
        } else if (row.category === "Press") {
          const label = row.name.replace("Press - ", "").trim();
          if (LEGACY_WASH_FOLD_PRICE_LABELS.has(label)) return;
          if (isLegacyWashFoldGarmentLabel(label)) return;
          if (isPressExcludedGarmentLabel(label)) return;
          const id = `item_${row.id}`;
          pressRows.push({ label, value: row.price_display });
          pressItems.push({ id, label });
          pressPrices[id] = row.price_display;
        }
      });

      setWashAndFoldPricing(wafRows.length > 0 ? { rows: wafRows } : null);
      setWashFoldItemizeState(wafRows.length > 0 ? { items: wafItems, prices: wafPrices } : null);
      setDryCleaningPricing(dcRows.length > 0 ? { rows: dcRows } : null);
      setDryCleaningItemizeState(dcRows.length > 0 ? { items: dcItems, prices: dcPrices } : null);
      setTailoringPricing(tailRows.length > 0 ? { rows: tailRows } : null);
      setTailoringItemizeState(tailRows.length > 0 ? { items: tailItems, prices: tailPrices } : null);
      setPressPricing(pressRows.length > 0 ? { rows: pressRows } : null);
      setPressItemizeState(pressRows.length > 0 ? { items: pressItems, prices: pressPrices } : null);
    }

    const { data: partnerProfileData } = await supabase
      .from("partner_profiles")
      .select("pickup_delivery_enabled,pickup_delivery_amount")
      .eq("id", user.id)
      .maybeSingle<{ pickup_delivery_enabled: boolean | null; pickup_delivery_amount: string | null }>();

    setPickupDeliveryPricing({
      enabled: Boolean(partnerProfileData?.pickup_delivery_enabled),
      amount: partnerProfileData?.pickup_delivery_amount ?? "",
    });

    setIsLoadingServices(false);
  }, [user?.id]);

  const savePickupDeliveryPricing = useCallback(async () => {
    if (!isSupabaseConfigured() || !supabase || !user?.id) {
      return false;
    }
    setIsSavingPickupDeliveryPricing(true);
    const profilePayload: {
      id: string;
      pickup_delivery_enabled: boolean;
      pickup_delivery_amount: string;
      updated_at: string;
      riders_responsibility_accepted_at?: string | null;
    } = {
      id: user.id,
      pickup_delivery_enabled: pickupDeliveryPricing.enabled,
      pickup_delivery_amount: pickupDeliveryPricing.amount.trim(),
      updated_at: new Date().toISOString(),
    };
    if (!pickupDeliveryPricing.enabled) {
      profilePayload.riders_responsibility_accepted_at = null;
    }

    const { error } = await supabase.from("partner_profiles").upsert(profilePayload, {
      onConflict: "id",
    });
    setIsSavingPickupDeliveryPricing(false);
    return !error;
  }, [user?.id, pickupDeliveryPricing.enabled, pickupDeliveryPricing.amount]);

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

  const submitOnboardingServices = useCallback(
    async (snapshot?: OnboardingServicesSnapshot) => {
    if (!isSupabaseConfigured() || !supabase || !user?.id) {
      return { ok: false, error: "Supabase is not configured or user is not signed in." };
    }

    const profileReady = await ensureActiveUserProfile(user);
    if (!profileReady.ok) {
      return { ok: false, error: profileReady.error };
    }

    const wafPricing = snapshot?.washAndFold ?? washAndFoldPricing;
    const dcPricing = snapshot?.dryCleaning ?? dryCleaningPricing;
    const tailPricing = snapshot?.tailoring ?? tailoringPricing;
    const pressPricingSnapshot = snapshot?.press ?? pressPricing;

    const payload: Array<{
      user_id: string;
      name: string;
      price_display: string;
      category: string;
    }> = [];

    const appendRows = (category: string, rows: ServicePricingRow[] | undefined) => {
      (rows ?? []).forEach((row) => {
        const value = row.value.trim();
        if (!value) return;
        payload.push({
          user_id: user.id,
          name: `${category} - ${row.label}`,
          price_display: value,
          category,
        });
      });
    };

    appendRows("Wash & Fold", wafPricing?.rows);
    appendRows("Dry Cleaning", dcPricing?.rows);
    appendRows("Tailoring", tailPricing?.rows);
    appendRows("Press", pressPricingSnapshot?.rows);

    if (pickupDeliveryPricing.enabled && pickupDeliveryPricing.amount.trim().length > 0) {
      payload.push({
        user_id: user.id,
        name: "Pickup & Delivery",
        price_display: pickupDeliveryPricing.amount.trim(),
        category: "Pickup & Delivery",
      });
    }

    setIsSubmittingOnboardingServices(true);
    try {
      const profilePayload: {
        id: string;
        pickup_delivery_enabled: boolean;
        pickup_delivery_amount: string;
        updated_at: string;
        riders_responsibility_accepted_at?: string | null;
      } = {
        id: user.id,
        pickup_delivery_enabled: pickupDeliveryPricing.enabled,
        pickup_delivery_amount: pickupDeliveryPricing.amount.trim(),
        updated_at: new Date().toISOString(),
      };
      if (!pickupDeliveryPricing.enabled) {
        profilePayload.riders_responsibility_accepted_at = null;
      }

      const { error: profileError } = await supabase
        .from("partner_profiles")
        .upsert(profilePayload, { onConflict: "id" });
      if (profileError) {
        return { ok: false, error: profileError.message };
      }

      const { error: deleteError } = await supabase
        .from("partner_services")
        .delete()
        .eq("user_id", user.id);
      if (deleteError) {
        return { ok: false, error: deleteError.message };
      }

      if (payload.length > 0) {
        const { error: insertError } = await supabase
          .from("partner_services")
          .insert(payload);
        if (insertError) {
          return { ok: false, error: insertError.message };
        }
      }

      await fetchServices();
      return { ok: true };
    } finally {
      setIsSubmittingOnboardingServices(false);
    }
  },
    [
    user?.id,
    washAndFoldPricing,
    dryCleaningPricing,
    tailoringPricing,
    pressPricing,
    pickupDeliveryPricing.enabled,
    pickupDeliveryPricing.amount,
    fetchServices,
  ],
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
      pressPricing,
      setPressPricing,
      dryCleaningItemizeState,
      setDryCleaningItemizeState,
      tailoringItemizeState,
      setTailoringItemizeState,
      washFoldItemizeState,
      setWashFoldItemizeState,
      pressItemizeState,
      setPressItemizeState,
      pickupDeliveryPricing,
      setPickupDeliveryPricing,
      savePickupDeliveryPricing,
      isSavingPickupDeliveryPricing,
      submitOnboardingServices,
      isSubmittingOnboardingServices,
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
      pressPricing,
      dryCleaningItemizeState,
      tailoringItemizeState,
      washFoldItemizeState,
      pressItemizeState,
      pickupDeliveryPricing,
      savePickupDeliveryPricing,
      isSavingPickupDeliveryPricing,
      submitOnboardingServices,
      isSubmittingOnboardingServices,
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
