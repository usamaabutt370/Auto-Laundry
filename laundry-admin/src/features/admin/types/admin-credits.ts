export type CreditTransactionType = "topup" | "usage" | "refund" | "adjustment";
export type CreditRequestStatus = "pending" | "approved" | "rejected";

export type CreditTransaction = {
  id: string;
  userId: string;
  userName: string;
  userPhone: string;
  amount: number;
  type: CreditTransactionType;
  note: string;
  adminName: string | null;
  reference: string | null;
  createdAt: string;
};

export type CreditRequest = {
  id: string;
  userId: string;
  userName: string;
  userPhone: string;
  amountRequested: number;
  status: CreditRequestStatus;
  requestedAt: string;
  whatsappNote: string | null;
};

export type UserCreditBalance = {
  userId: string;
  userName: string;
  userPhone: string;
  balance: number;
  lastTopupAt: string | null;
};
