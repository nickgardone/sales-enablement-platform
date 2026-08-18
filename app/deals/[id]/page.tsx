import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getModuleAccess } from "@/lib/platform/route-guard";
import { scopeFilter } from "@/lib/platform/entitlements";
import { AccessRestricted } from "@/components/shared/access-restricted";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StageSelect } from "@/components/closing-deals/stage-select";
import { StipsPanel } from "@/components/closing-deals/stips-panel";
import { getDealStages, getOpportunityDetail } from "@/lib/modules/closing-deals/queries";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user, allowed } = await getModuleAccess("closing-deals");
  if (!allowed) return <AccessRestricted moduleName="Closing Deals" role={user.role} />;

  const scopeWhere = await scopeFilter(user, "Rooftop", "closing-deals");
  const opportunity = await prisma.opportunity.findFirst({ where: { id, rooftop: scopeWhere }, select: { id: true } });
  if (!opportunity) return <AccessRestricted moduleName="Closing Deals" role={user.role} />;

  const detail = await getOpportunityDetail(id);
  if (!detail) notFound();

  const stages = await getDealStages();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{detail.rooftopName}</h1>
          <p className="text-sm text-muted-foreground">
            {detail.dealerGroupName} &middot; {detail.productType === "FINANCING" ? "Financing" : "Software"} &middot; {detail.associateName}
          </p>
        </div>
        <StageSelect opportunityId={detail.id} currentStageId={detail.stageId} stages={stages} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Deal</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <p className="text-xs text-muted-foreground">Expected value</p>
            <p className="text-sm">${detail.expectedValue.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Close date</p>
            <p className="text-sm">{new Date(detail.closeDate).toLocaleDateString()}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Created</p>
            <p className="text-sm">{new Date(detail.createdAt).toLocaleDateString()}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Application status</p>
            <p className="text-sm">{detail.application ? detail.application.status.replace(/_/g, " ") : "Not yet submitted"}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Funding status</CardTitle>
        </CardHeader>
        <CardContent>
          {detail.fundedDeal ? (
            <div className="flex items-center gap-2 text-sm">
              <Badge variant="secondary">Funded</Badge>
              <span>
                ${detail.fundedDeal.fundedAmount.toLocaleString()} on {new Date(detail.fundedDeal.fundedAt).toLocaleDateString()}
                {detail.fundedDeal.fundingCycleTimeDays !== null ? ` · ${detail.fundedDeal.fundingCycleTimeDays}d cycle time` : ""}
              </span>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Not yet funded.</p>
          )}
        </CardContent>
      </Card>

      {detail.application && <StipsPanel stips={detail.application.stips} />}
    </div>
  );
}
