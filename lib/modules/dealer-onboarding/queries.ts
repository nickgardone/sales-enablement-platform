import { prisma } from "@/lib/prisma";
import { scopeFilter } from "@/lib/platform/entitlements";
import type { CurrentUser } from "@/lib/platform/types";
import type { ChecklistItem, OnboardingCaseRow } from "./types";

const MODULE_ID = "dealer-onboarding";

export async function getOnboardingCasesForUser(user: CurrentUser): Promise<OnboardingCaseRow[]> {
  const rooftopWhere = await scopeFilter(user, "Rooftop", MODULE_ID);
  const cases = await prisma.onboardingCase.findMany({
    where: { rooftop: rooftopWhere },
    include: {
      rooftop: { include: { dealerGroup: { select: { name: true } } } },
      associate: { include: { user: { select: { name: true } } } },
      approvalRequest: { select: { status: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return cases.map((c) => {
    const checklist = ((c.checklist as { items?: ChecklistItem[] })?.items ?? []) as ChecklistItem[];
    return {
      id: c.id,
      rooftopId: c.rooftopId,
      rooftopName: c.rooftop.name,
      dealerGroupName: c.rooftop.dealerGroup.name,
      associateName: c.associate.user.name,
      status: c.status,
      checklist,
      allItemsDone: checklist.length > 0 && checklist.every((i) => i.done),
      approvalStatus: c.approvalRequest?.status ?? null,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    };
  });
}
