import { theme } from "@/lib/theme/theme";
import type { AdminUser } from "@/features/admin/data/users-demo-data";

type UsersListProps = {
  users: AdminUser[];
};

const statusColorMap: Record<AdminUser["status"], string> = {
  Active: "#6EE7A8",
  Pending: "#F6D36B",
  Blocked: "#F18C8C",
};

export function UsersList({ users }: UsersListProps) {
  return (
    <section className="space-y-3 sm:space-y-4">
      <h1 className="text-[20px] font-bold text-white sm:text-[24px]">Users</h1>
      <p className="text-sm text-white/75 sm:text-base">
        View and manage registered users, status, and order activity.
      </p>

      <div
        className="hidden overflow-hidden rounded-xl border md:block"
        style={{ borderColor: theme.colors.outline, backgroundColor: theme.colors.sidebarBackground }}
      >
        <div className="grid grid-cols-[1.2fr_1.4fr_1fr_0.8fr_0.9fr_1fr] gap-4 border-b px-4 py-3 text-sm font-bold text-white/90">
          <span>Name</span>
          <span>Email</span>
          <span>Phone</span>
          <span>Status</span>
          <span>Orders</span>
          <span>Joined</span>
        </div>
        {users.map((user) => (
          <div
            key={user.id}
            className="grid grid-cols-[1.2fr_1.4fr_1fr_0.8fr_0.9fr_1fr] gap-4 border-b px-4 py-3 text-sm text-white/85 last:border-b-0"
            style={{ borderColor: "rgba(255,255,255,0.12)" }}
          >
            <span className="font-semibold">{user.name}</span>
            <span className="truncate">{user.email}</span>
            <span>{user.phone}</span>
            <span style={{ color: statusColorMap[user.status], fontWeight: 700 }}>{user.status}</span>
            <span>{user.orders}</span>
            <span>{user.joinedAt}</span>
          </div>
        ))}
      </div>

      <div className="grid gap-3 md:hidden">
        {users.map((user) => (
          <article
            key={user.id}
            className="rounded-xl border p-4"
            style={{
              borderColor: theme.colors.outline,
              backgroundColor: theme.colors.sidebarBackground,
            }}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[16px] font-bold text-white">{user.name}</p>
                <p className="mt-1 text-[13px] text-white/75">{user.email}</p>
              </div>
              <span className="text-[13px] font-bold" style={{ color: statusColorMap[user.status] }}>
                {user.status}
              </span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-[13px] text-white/85">
              <p>Phone: {user.phone}</p>
              <p>Orders: {user.orders}</p>
              <p className="col-span-2">Joined: {user.joinedAt}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
