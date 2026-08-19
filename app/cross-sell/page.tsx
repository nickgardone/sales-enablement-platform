import { getModuleAccess } from "@/lib/platform/route-guard";
import { AccessRestricted } from "@/components/shared/access-restricted";
import { CrossSellTable } from "@/components/cross-sell/cross-sell-table";
import { getCrossSellSignalsForUser } from "@/lib/modules/cross-sell/queries";

export const dynamic = "force-dynamic";

export default async function Page() {
  const { user, allowed } = await getModuleAccess("cross-sell");
  if (!allowed) return <AccessRestricted moduleName="Cross-Sell" role={user.role} />;

  const rows = await getCrossSellSignalsForUser(user);
  const openCount = rows.filter((r) => r.status === "OPEN").length;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Cross-Sell</h1>
        <p className="text-sm text-muted-foreground">
          {user.role === "SALES_LEADER" ? "Your team's territory" : "Your book"} — {openCount} open signal{openCount === 1 ? "" : "s"}.
        </p>
      </div>
      <CrossSellTable rows={rows} />
    </div>
  );
}
