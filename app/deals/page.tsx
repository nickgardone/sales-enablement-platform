import { getModuleAccess } from "@/lib/platform/route-guard";
import { AccessRestricted } from "@/components/shared/access-restricted";
import { OpportunitiesTable } from "@/components/closing-deals/opportunities-table";
import { CreateOpportunityDialog } from "@/components/closing-deals/create-opportunity-dialog";
import { getOpportunitiesForUser, getRooftopOptionsForUser } from "@/lib/modules/closing-deals/queries";

export const dynamic = "force-dynamic";

export default async function Page() {
  const { user, allowed } = await getModuleAccess("closing-deals");
  if (!allowed) return <AccessRestricted moduleName="Closing Deals" role={user.role} />;

  const [rows, rooftops] = await Promise.all([getOpportunitiesForUser(user), getRooftopOptionsForUser(user)]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Closing Deals</h1>
          <p className="text-sm text-muted-foreground">
            {user.role === "SALES_LEADER" ? "Your team's territory" : "Your book"} — {rows.length} opportunities.
          </p>
        </div>
        <CreateOpportunityDialog rooftops={rooftops} />
      </div>
      <OpportunitiesTable rows={rows} />
    </div>
  );
}
