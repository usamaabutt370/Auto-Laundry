export type AdminUserStatus = "Active" | "Pending" | "Blocked" | "N/A";

export type AdminUser = {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: AdminUserStatus;
  orders: number;
  joinedAt: string;
};
