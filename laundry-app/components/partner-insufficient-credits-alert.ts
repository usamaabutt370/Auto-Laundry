import { showAppAlert } from "@/components/app-alert";
import {
  buildCreditsRechargeWhatsAppMessage,
  checkPartnerCanAcceptOrder,
  isInsufficientCreditsError,
} from "@/lib/partner-credits";
import { openWhatsApp } from "@/lib/whatsapp";

export type PartnerInsufficientCreditsCopy = {
  title: string;
  message: string;
  recharge: string;
  cancel: string;
  whatsappError: string;
};

type GateArgs = {
  orderAmount?: number | null;
  partnerName: string;
  copy: PartnerInsufficientCreditsCopy;
};

/**
 * Returns true when the partner may continue the accept flow.
 * Shows a recharge alert and returns false when credits are insufficient.
 */
export async function ensurePartnerCreditsForAccept({
  orderAmount,
  partnerName,
  copy,
}: GateArgs): Promise<boolean> {
  try {
    const check = await checkPartnerCanAcceptOrder(orderAmount);
    if (check.ok) return true;
    showPartnerInsufficientCreditsAlert({
      copy,
      partnerName,
      balance: check.balance,
      required: check.required,
    });
    return false;
  } catch (error) {
    if (isInsufficientCreditsError(error)) {
      showPartnerInsufficientCreditsAlert({
        copy,
        partnerName,
        balance: 0,
        required: 1,
      });
      return false;
    }
    throw error;
  }
}

export function showPartnerInsufficientCreditsAlert(args: {
  copy: PartnerInsufficientCreditsCopy;
  partnerName: string;
  balance: number;
  required?: number;
}): void {
  const { copy, partnerName, balance, required } = args;
  const message =
    required && required > 0
      ? copy.message
          .replace("{{balance}}", String(balance))
          .replace("{{required}}", String(required))
      : copy.message
          .replace("{{balance}}", String(balance))
          .replace("{{required}}", "—");

  showAppAlert(copy.title, message, [
    { text: copy.cancel, style: "cancel" },
    {
      text: copy.recharge,
      onPress: () => {
        void openWhatsApp(buildCreditsRechargeWhatsAppMessage(partnerName, balance)).catch(() => {
          showAppAlert(copy.title, copy.whatsappError);
        });
      },
    },
  ]);
}

export function alertIfInsufficientCreditsError(
  error: unknown,
  args: {
    copy: PartnerInsufficientCreditsCopy;
    partnerName: string;
  },
): boolean {
  if (!isInsufficientCreditsError(error)) return false;
  showPartnerInsufficientCreditsAlert({
    copy: args.copy,
    partnerName: args.partnerName,
    balance: 0,
    required: 1,
  });
  return true;
}
