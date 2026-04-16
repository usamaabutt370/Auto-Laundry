import { UsersList } from "@/features/admin/components/users-list";
import { getAdminUsers } from "@/features/admin/data/admin-users";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const users = await getAdminUsers();

  return <UsersList users={users} />;
}
