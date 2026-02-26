import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

import type { ServiceItem } from "@/types/merchant-services";
import { generateServiceId } from "@/types/merchant-services";

interface MerchantServicesContextValue {
  services: ServiceItem[];
  addService: (item: Omit<ServiceItem, "id">) => void;
  updateService: (id: string, updates: Partial<Omit<ServiceItem, "id">>) => void;
  removeService: (id: string) => void;
  setServices: React.Dispatch<React.SetStateAction<ServiceItem[]>>;
}

const MerchantServicesContext = createContext<MerchantServicesContextValue | null>(null);

export function MerchantServicesProvider({ children }: { children: React.ReactNode }) {
  const [services, setServices] = useState<ServiceItem[]>([]);

  const addService = useCallback((item: Omit<ServiceItem, "id">) => {
    setServices((prev) => [
      ...prev,
      { ...item, id: generateServiceId() },
    ]);
  }, []);

  const updateService = useCallback((id: string, updates: Partial<Omit<ServiceItem, "id">>) => {
    setServices((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...updates } : s))
    );
  }, []);

  const removeService = useCallback((id: string) => {
    setServices((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const value = useMemo(
    () => ({
      services,
      addService,
      updateService,
      removeService,
      setServices,
    }),
    [services, addService, updateService, removeService]
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
