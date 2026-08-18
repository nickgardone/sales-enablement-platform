import { getModuleAccess } from "@/lib/platform/route-guard";
import { AccessRestricted } from "@/components/shared/access-restricted";
import { LeadsTable } from "@/components/lead-routing/leads-table";
import { getLeadsForUser } from "@/lib/modules/lead-routing/queries";

export const dynamic = "force-dynamic";

export default async function Page() {
  const { user, allowed } = await getModuleAccess("lead-routing");
  if (!allowed) return <AccessRestricted moduleName="Lead Routing" role={user.role} />;

  const rows = await getLeadsForUser(user);
  const unworkedCount = rows.filter((r) => r.isUnworked).length;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Lead Routing</h1>
        <p className="text-sm text-muted-foreground">
          {user.role === "SALES_LEADER" ? "Your team's territory" : "Your book"} — {rows.length} leads, {unworkedCount} unworked.
        </p>
      </div>
      <LeadsTable rows={rows} />
    </div>
  );
}
