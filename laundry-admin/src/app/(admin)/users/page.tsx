import { UsersList } from "@/features/admin/components/users-list";
import { parsePageSearchParams } from "@/features/admin/server/admin-list-query";
import { listCustomerProfilesForAdminPaginated } from "@/features/admin/server/users/customer-profiles.repository";

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const data = await listCustomerProfilesForAdminPaginated(parsePageSearchParams(await searchParams));
  return <UsersList data={data} />;
}
