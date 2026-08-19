import { getModuleAccess } from "@/lib/platform/route-guard";
import { AccessRestricted } from "@/components/shared/access-restricted";
import { StatCard } from "@/components/shared/stat-card";
import { TierWorklistTable } from "@/components/loyalty-tier/tier-worklist-table";
import { getTierWorklistForUser } from "@/lib/modules/loyalty-tier/queries";

export const dynamic = "force-dynamic";

export default async function Page() {
  const { user, allowed } = await getModuleAccess("loyalty-tier");
  if (!allowed) return <AccessRestricted moduleName="Loyalty Tier" role={user.role} />;

  const rows = await getTierWorklistForUser(user);
  const atRiskCount = rows.filter((r) => r.downTierRisk).length;
  const totalImpact = rows.reduce((sum, r) => sum + (r.downTierRisk ? r.estimatedDollarImpact ?? 0 : 0), 0);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Loyalty Tier</h1>
        <p className="text-sm text-muted-foreground">
          {user.role === "SALES_LEADER" ? "Your team's territory" : "Your book"} — {rows.length} accounts.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Accounts" value={rows.length} />
        <StatCard label="Down-tier risk" value={atRiskCount} tone="warning" />
        <StatCard label="Est. dollars at risk" value={`$${Math.round(totalImpact).toLocaleString()}`} tone={totalImpact > 0 ? "warning" : "default"} />
      </div>

      <TierWorklistTable rows={rows} />
    </div>
  );
}
