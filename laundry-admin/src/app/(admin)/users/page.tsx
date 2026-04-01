import { UsersList } from "@/features/admin/components/users-list";
import { fetchUsersDemoData } from "@/features/admin/data/users-demo-data";

export default async function UsersPage() {
  const users = await fetchUsersDemoData();

  return <UsersList users={users} />;
}
