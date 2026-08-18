import { getModuleAccess } from "@/lib/platform/route-guard";
import { AccessRestricted } from "@/components/shared/access-restricted";
import { AccountsTable } from "@/components/dealer-account-360/accounts-table";
import { getRooftopListForUser } from "@/lib/modules/dealer-account-360/queries";

export const dynamic = "force-dynamic";

export default async function Page() {
  const { user, allowed } = await getModuleAccess("dealer-account-360");
  if (!allowed) return <AccessRestricted moduleName="Account 360" role={user.role} />;

  const rows = await getRooftopListForUser(user);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Account 360</h1>
        <p className="text-sm text-muted-foreground">
          {user.role === "SALES_LEADER" ? "Your team's territory" : "Your book"} — {rows.length} rooftops.
        </p>
      </div>
      <AccountsTable rows={rows} />
    </div>
  );
}
