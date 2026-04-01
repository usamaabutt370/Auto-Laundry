export type AdminUser = {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: "Active" | "Pending" | "Blocked";
  orders: number;
  joinedAt: string;
};

const DEMO_USERS: AdminUser[] = [
  {
    id: "USR-1001",
    name: "Olivia Brown",
    email: "olivia.brown@gmail.com",
    phone: "+1 (555) 214-9001",
    status: "Active",
    orders: 24,
    joinedAt: "2026-01-05",
  },
  {
    id: "USR-1002",
    name: "Ethan Walker",
    email: "ethan.walker@gmail.com",
    phone: "+1 (555) 214-9020",
    status: "Pending",
    orders: 7,
    joinedAt: "2026-01-12",
  },
  {
    id: "USR-1003",
    name: "Sophia Carter",
    email: "sophia.carter@gmail.com",
    phone: "+1 (555) 214-9033",
    status: "Active",
    orders: 31,
    joinedAt: "2025-12-20",
  },
  {
    id: "USR-1004",
    name: "Liam Johnson",
    email: "liam.johnson@gmail.com",
    phone: "+1 (555) 214-9042",
    status: "Blocked",
    orders: 2,
    joinedAt: "2026-02-02",
  },
  {
    id: "USR-1005",
    name: "Ava Wilson",
    email: "ava.wilson@gmail.com",
    phone: "+1 (555) 214-9058",
    status: "Active",
    orders: 16,
    joinedAt: "2026-02-08",
  },
];

export async function fetchUsersDemoData(): Promise<AdminUser[]> {
  await new Promise((resolve) => setTimeout(resolve, 80));
  return DEMO_USERS;
}
