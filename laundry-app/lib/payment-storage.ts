import AsyncStorage from "@react-native-async-storage/async-storage";

const PAYMENT_KEY = "@laundry_payment_method";

export type PaymentMethod = {
  cardName: string;
  cardNumberLast4: string;
  cardNumberFull?: string;
  expiration: string;
  cvv: string;
  address: string;
  zipCode: string;
  state: string;
  country: string;
};

export async function getPaymentMethod(): Promise<PaymentMethod | null> {
  try {
    const raw = await AsyncStorage.getItem(PAYMENT_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PaymentMethod;
  } catch {
    return null;
  }
}

export async function setPaymentMethod(data: PaymentMethod): Promise<void> {
  const toStore: PaymentMethod = {
    ...data,
    cardNumberFull: undefined,
    cardNumberLast4: data.cardNumberFull
      ? data.cardNumberFull.replace(/\D/g, "").slice(-4)
      : data.cardNumberLast4,
  };
  await AsyncStorage.setItem(PAYMENT_KEY, JSON.stringify(toStore));
}
