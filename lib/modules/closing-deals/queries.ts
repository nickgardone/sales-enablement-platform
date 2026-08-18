import { prisma } from "@/lib/prisma";
import { scopeFilter } from "@/lib/platform/entitlements";
import type { CurrentUser } from "@/lib/platform/types";
import type { DealStageOption, OpportunityDetail, OpportunityListRow, RooftopOption, StipRow } from "./types";

const MODULE_ID = "closing-deals";

export async function getDealStages(): Promise<DealStageOption[]> {
  const stages = await prisma.dealStage.findMany({ orderBy: { sortOrder: "asc" } });
  return stages.map((s) => ({ id: s.id, name: s.name, sortOrder: s.sortOrder, isClosed: s.isClosed, isWon: s.isWon }));
}

export async function getOpportunitiesForUser(user: CurrentUser): Promise<OpportunityListRow[]> {
  const rooftopWhere = await scopeFilter(user, "Rooftop", MODULE_ID);
  const opportunities = await prisma.opportunity.findMany({
    where: { rooftop: rooftopWhere },
    include: {
      rooftop: { include: { dealerGroup: { select: { name: true } } } },
      associate: { include: { user: { select: { name: true } } } },
      dealStage: true,
      applications: { include: { stips: true }, orderBy: { submittedAt: "desc" }, take: 1 },
    },
    orderBy: { closeDate: "asc" },
  });

  return opportunities.map((o) => {
    const application = o.applications[0];
    return {
      id: o.id,
      rooftopName: o.rooftop.name,
      dealerGroupName: o.rooftop.dealerGroup.name,
      associateName: o.associate.user.name,
      productType: o.productType,
      stageName: o.dealStage.name,
      stageId: o.dealStage.id,
      isClosed: o.dealStage.isClosed,
      isWon: o.dealStage.isWon,
      expectedValue: o.expectedValue,
      closeDate: o.closeDate.toISOString(),
      applicationStatus: application?.status ?? null,
      outstandingStipCount: application ? application.stips.filter((s) => s.status === "OUTSTANDING").length : 0,
    };
  });
}

export async function getOpportunityDetail(id: string): Promise<OpportunityDetail | null> {
  const o = await prisma.opportunity.findUnique({
    where: { id },
    include: {
      rooftop: { include: { dealerGroup: { select: { name: true } } } },
      associate: { include: { user: { select: { name: true } } } },
      dealStage: true,
      applications: {
        include: { stips: { include: { owner: { select: { name: true } } } }, fundedDeal: true },
        orderBy: { submittedAt: "desc" },
        take: 1,
      },
    },
  });
  if (!o) return null;

  const application = o.applications[0] ?? null;
  const now = Date.now();
  const stips: StipRow[] = application
    ? application.stips.map((s) => ({
        id: s.id,
        description: s.description,
        status: s.status,
        ownerName: s.owner.name,
        agingDays: Math.round(((s.clearedAt?.getTime() ?? now) - s.agingSince.getTime()) / 86400000),
        clearedAt: s.clearedAt?.toISOString() ?? null,
      }))
    : [];

  return {
    id: o.id,
    rooftopId: o.rooftopId,
    rooftopName: o.rooftop.name,
    dealerGroupName: o.rooftop.dealerGroup.name,
    associateName: o.associate.user.name,
    productType: o.productType,
    stageId: o.dealStage.id,
    stageName: o.dealStage.name,
    isClosed: o.dealStage.isClosed,
    isWon: o.dealStage.isWon,
    expectedValue: o.expectedValue,
    closeDate: o.closeDate.toISOString(),
    createdAt: o.createdAt.toISOString(),
    application: application
      ? { id: application.id, status: application.status, submittedAt: application.submittedAt.toISOString(), stips }
      : null,
    fundedDeal: application?.fundedDeal
      ? {
          fundedAmount: application.fundedDeal.fundedAmount,
          fundedAt: application.fundedDeal.fundedAt.toISOString(),
          fundingCycleTimeDays: application.fundedDeal.fundingCycleTimeDays,
        }
      : null,
  };
}

export async function getRooftopOptionsForUser(user: CurrentUser): Promise<RooftopOption[]> {
  const where = await scopeFilter(user, "Rooftop", MODULE_ID);
  const rooftops = await prisma.rooftop.findMany({
    where,
    include: { dealerGroup: { select: { name: true } } },
    orderBy: { name: "asc" },
  });
  return rooftops.map((r) => ({ id: r.id, name: r.name, dealerGroupName: r.dealerGroup.name }));
}
