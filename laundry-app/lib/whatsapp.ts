import { Linking } from "react-native";

/** Same number used for partner credit purchases. */
export const SUPPORT_WHATSAPP_NUMBER = "923004639943";

export function buildWhatsAppUrl(
  message: string,
  phone: string = SUPPORT_WHATSAPP_NUMBER,
): string {
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

export async function openWhatsApp(
  message: string,
  phone: string = SUPPORT_WHATSAPP_NUMBER,
): Promise<void> {
  await Linking.openURL(buildWhatsAppUrl(message, phone));
}
