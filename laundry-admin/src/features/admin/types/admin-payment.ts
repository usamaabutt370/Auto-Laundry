export type PaymentStatus = "Succeeded" | "Pending" | "Failed" | "Refunded";
export type PaymentTiming = "Paid at order" | "Paid at completion";
export type EscrowStatus =
  | "Awaiting payment"
  | "In escrow"
  | "Ready for payout"
  | "Released"
  | "Refunded"
  | "Failed";
export type PayoutStatus = "Not ready" | "Ready" | "Sent" | "On hold" | "Failed";
export type PaymentMethodType = "Card" | "Wallet" | "Bank";

export type PaymentKind =
  | "Escrow charge"
  | "Settlement charge"
  | "Partner payout"
  | "Refund"
  | "Adjustment";

export type AdminPayment = {
  id: string;
  orderId: string;
  customer: string;
  partner: string;
  kind: PaymentKind;
  amount: string;
  grossAmount: string;
  commissionRate: number;
  commissionAmount: string;
  partnerNet: string;
  method: string;
  methodType: PaymentMethodType;
  status: PaymentStatus;
  paymentTiming: PaymentTiming;
  escrowStatus: EscrowStatus;
  payoutStatus: PayoutStatus;
  createdAt: string;
  updatedAt: string;
  orderCompletedAt: string | null;
  payoutProcessedAt: string | null;
  disputeId: string | null;
};
