import { getModuleAccess } from "@/lib/platform/route-guard";
import { AccessRestricted } from "@/components/shared/access-restricted";
import { AdminConsole } from "@/components/admin/admin-console";

export const dynamic = "force-dynamic";

export default async function Page() {
  const { user, allowed } = await getModuleAccess("admin-console");
  if (!allowed) return <AccessRestricted moduleName="Admin Console" role={user.role} />;
  return <AdminConsole />;
}
