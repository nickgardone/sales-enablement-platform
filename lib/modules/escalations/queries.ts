import { prisma } from "@/lib/prisma";
import { scopeFilter } from "@/lib/platform/entitlements";
import type { CurrentUser } from "@/lib/platform/types";
import type { EscalationRow, RooftopOption } from "./types";

const MODULE_ID = "escalations-disputes";

export async function getEscalationsForUser(user: CurrentUser): Promise<EscalationRow[]> {
  const rooftopWhere = await scopeFilter(user, "Rooftop", MODULE_ID);
  const escalations = await prisma.escalation.findMany({
    where: { rooftop: rooftopWhere },
    include: {
      rooftop: { include: { dealerGroup: { select: { name: true } } } },
      raisedBy: { select: { name: true } },
      approvalRequest: { select: { status: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return escalations.map((e) => ({
    id: e.id,
    rooftopId: e.rooftopId,
    rooftopName: e.rooftop.name,
    dealerGroupName: e.rooftop.dealerGroup.name,
    raisedByName: e.raisedBy.name,
    category: e.category,
    description: e.description,
    status: e.status,
    approvalStatus: e.approvalRequest?.status ?? null,
    resolutionNotes: e.resolutionNotes,
    createdAt: e.createdAt.toISOString(),
    resolvedAt: e.resolvedAt?.toISOString() ?? null,
  }));
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
