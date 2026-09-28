import { getSession, isSupabaseConfigured, supabase } from "@/lib/supabase";

export type AddressIcon = "home" | "office" | "other";

export type CustomerAddress = {
  id: string;
  customerId: string;
  label: string;
  addressLine: string;
  houseNo: string;
  street: string;
  city: string;
  landmark: string;
  selectedLocation: string;
  latitude: number | null;
  longitude: number | null;
  contactName: string;
  contactPhone: string;
  icon: AddressIcon;
  isDefault: boolean;
  useForPickup: boolean;
  useForDelivery: boolean;
  createdAt: string;
  updatedAt: string;
};

type AddressRow = {
  id: string;
  customer_id: string;
  label: string;
  address_line: string;
  house_no: string | null;
  street: string | null;
  city: string | null;
  landmark: string | null;
  selected_location: string | null;
  latitude: number | null;
  longitude: number | null;
  contact_name: string | null;
  contact_phone: string | null;
  icon: string;
  is_default: boolean;
  use_for_pickup: boolean;
  use_for_delivery: boolean;
  created_at: string;
  updated_at: string;
};

export type CustomerAddressInput = {
  label: string;
  addressLine: string;
  houseNo?: string;
  street?: string;
  city?: string;
  landmark?: string;
  selectedLocation?: string;
  latitude?: number | null;
  longitude?: number | null;
  contactName?: string;
  contactPhone?: string;
  icon?: AddressIcon;
  isDefault?: boolean;
  useForPickup?: boolean;
  useForDelivery?: boolean;
};

const ADDRESS_SELECT =
  "id,customer_id,label,address_line,house_no,street,city,landmark,selected_location,latitude,longitude,contact_name,contact_phone,icon,is_default,use_for_pickup,use_for_delivery,created_at,updated_at";

export function composeAddressLine(input: {
  houseNo?: string;
  street?: string;
  city?: string;
  selectedLocation?: string;
}): string {
  const parts = [input.houseNo, input.street, input.city]
    .map((part) => (part ?? "").trim())
    .filter(Boolean);
  if (parts.length > 0) return parts.join(", ");
  return (input.selectedLocation ?? "").trim();
}

function mapRow(row: AddressRow): CustomerAddress {
  const icon: AddressIcon =
    row.icon === "office" || row.icon === "other" ? row.icon : "home";
  return {
    id: row.id,
    customerId: row.customer_id,
    label: row.label,
    addressLine: row.address_line,
    houseNo: row.house_no ?? "",
    street: row.street ?? "",
    city: row.city ?? "",
    landmark: row.landmark ?? "",
    selectedLocation: row.selected_location ?? "",
    latitude: typeof row.latitude === "number" ? row.latitude : null,
    longitude: typeof row.longitude === "number" ? row.longitude : null,
    contactName: row.contact_name ?? "",
    contactPhone: row.contact_phone ?? "",
    icon,
    isDefault: Boolean(row.is_default),
    useForPickup: Boolean(row.use_for_pickup),
    useForDelivery: Boolean(row.use_for_delivery),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toDbPayload(userId: string, input: CustomerAddressInput, isDefault: boolean) {
  const addressLine =
    input.addressLine.trim() ||
    composeAddressLine({
      houseNo: input.houseNo,
      street: input.street,
      city: input.city,
      selectedLocation: input.selectedLocation,
    });
  return {
    customer_id: userId,
    label: input.label.trim() || "Home",
    address_line: addressLine,
    house_no: (input.houseNo ?? "").trim(),
    street: (input.street ?? "").trim(),
    city: (input.city ?? "").trim(),
    landmark: (input.landmark ?? "").trim(),
    selected_location: (input.selectedLocation ?? "").trim() || addressLine,
    latitude: input.latitude ?? null,
    longitude: input.longitude ?? null,
    contact_name: (input.contactName ?? "").trim(),
    contact_phone: (input.contactPhone ?? "").trim(),
    icon: input.icon ?? "home",
    is_default: isDefault,
    use_for_pickup: input.useForPickup ?? true,
    use_for_delivery: input.useForDelivery ?? true,
  };
}

async function currentUserId(): Promise<string | null> {
  if (!isSupabaseConfigured()) return null;
  const {
    data: { session },
  } = await getSession();
  return session?.user?.id ?? null;
}

async function clearOtherDefaults(userId: string, exceptId?: string) {
  let query = supabase
    .from("customer_addresses")
    .update({ is_default: false })
    .eq("customer_id", userId)
    .eq("is_default", true);
  if (exceptId) query = query.neq("id", exceptId);
  await query;
}

export async function fetchCustomerAddresses(): Promise<CustomerAddress[]> {
  const userId = await currentUserId();
  if (!userId) return [];

  const { data, error } = await supabase
    .from("customer_addresses")
    .select(ADDRESS_SELECT)
    .eq("customer_id", userId)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return ((data ?? []) as AddressRow[]).map(mapRow);
}

export async function createCustomerAddress(
  input: CustomerAddressInput,
): Promise<CustomerAddress> {
  const userId = await currentUserId();
  if (!userId) throw new Error("Not signed in.");

  const existing = await fetchCustomerAddresses();
  const makeDefault = existing.length === 0 ? true : Boolean(input.isDefault);
  if (makeDefault) await clearOtherDefaults(userId);

  const { data, error } = await supabase
    .from("customer_addresses")
    .insert(toDbPayload(userId, input, makeDefault))
    .select(ADDRESS_SELECT)
    .single();

  if (error) throw new Error(error.message);
  return mapRow(data as AddressRow);
}

export async function updateCustomerAddress(
  id: string,
  input: CustomerAddressInput,
): Promise<CustomerAddress> {
  const userId = await currentUserId();
  if (!userId) throw new Error("Not signed in.");

  const makeDefault = Boolean(input.isDefault);
  if (makeDefault) await clearOtherDefaults(userId, id);

  const { customer_id: _customerId, ...patch } = toDbPayload(userId, input, makeDefault);
  const { data, error } = await supabase
    .from("customer_addresses")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("customer_id", userId)
    .select(ADDRESS_SELECT)
    .single();

  if (error) throw new Error(error.message);
  return mapRow(data as AddressRow);
}

export async function setDefaultCustomerAddress(id: string): Promise<void> {
  const userId = await currentUserId();
  if (!userId) throw new Error("Not signed in.");

  await clearOtherDefaults(userId);
  const { error } = await supabase
    .from("customer_addresses")
    .update({ is_default: true, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("customer_id", userId);
  if (error) throw new Error(error.message);
}

export async function deleteCustomerAddress(id: string): Promise<void> {
  const userId = await currentUserId();
  if (!userId) throw new Error("Not signed in.");

  const { error } = await supabase
    .from("customer_addresses")
    .delete()
    .eq("id", id)
    .eq("customer_id", userId);
  if (error) throw new Error(error.message);
}

/** If the user has no saved addresses yet, import the single profile.address once. */
export async function ensureAddressesFromProfile(): Promise<CustomerAddress[]> {
  const existing = await fetchCustomerAddresses();
  if (existing.length > 0) return existing;

  const userId = await currentUserId();
  if (!userId) return [];

  const { data } = await supabase
    .from("profiles")
    .select("address,full_name,phone")
    .eq("id", userId)
    .maybeSingle<{ address: string | null; full_name: string | null; phone: string | null }>();

  const line = (data?.address ?? "").trim();
  if (!line) return [];

  const created = await createCustomerAddress({
    label: "Home",
    addressLine: line,
    selectedLocation: line,
    street: line,
    icon: "home",
    isDefault: true,
    useForPickup: true,
    useForDelivery: true,
    contactName: data?.full_name ?? "",
    contactPhone: data?.phone ?? "",
  });
  return [created];
}
