import { prisma } from "@/lib/prisma";
import { scopeFilter } from "@/lib/platform/entitlements";
import type { CurrentUser } from "@/lib/platform/types";
import type {
  ApprovalStepRow,
  ApproverQueueRow,
  ContactOption,
  ExceptionDetail,
  ExceptionListRow,
  IntakeContext,
  RooftopOption,
} from "./types";

const MODULE_ID = "pricing-exceptions";

function slaDueAt(requestedAt: Date, slaHours: number) {
  return new Date(requestedAt.getTime() + slaHours * 3600 * 1000);
}

function activeStepOf<T extends { stepOrder: number; status: string }>(steps: T[]): T | null {
  return [...steps].sort((a, b) => a.stepOrder - b.stepOrder).find((s) => s.status === "PENDING") ?? null;
}

/** Scoped exception list — associates see their book, leaders see their team's territory. */
export async function getExceptionsForUser(user: CurrentUser): Promise<ExceptionListRow[]> {
  const rooftopWhere = await scopeFilter(user, "Rooftop", MODULE_ID);
  const rows = await prisma.exceptionRequest.findMany({
    where: { rooftop: rooftopWhere },
    include: {
      rooftop: { include: { dealerGroup: { select: { name: true } } } },
      associate: { include: { user: { select: { name: true } } } },
      approvalRequest: { include: { policy: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const now = new Date();
  return rows.map((r) => {
    const ar = r.approvalRequest;
    const requestedAt = ar?.requestedAt ?? r.createdAt;
    const slaHours = ar?.policy.slaHours ?? 24;
    const due = slaDueAt(requestedAt, slaHours);
    return {
      id: r.id,
      rooftopName: r.rooftop.name,
      dealerGroupName: r.rooftop.dealerGroup.name,
      requestType: r.requestType,
      dollarAmount: r.dollarAmount,
      status: ar?.status ?? "PENDING",
      policyName: ar?.policy.name ?? "Unrouted",
      submittedAt: r.createdAt.toISOString(),
      decidedAt: ar?.decidedAt?.toISOString() ?? null,
      slaDueAt: due.toISOString(),
      isBreached: (ar?.status ?? "PENDING") === "PENDING" && due < now,
      requestedByName: r.associate.user.name,
    };
  });
}

/** Full compliance artifact for one exception request. */
export async function getExceptionDetail(id: string): Promise<ExceptionDetail | null> {
  const r = await prisma.exceptionRequest.findUnique({
    where: { id },
    include: {
      rooftop: { include: { dealerGroup: { select: { name: true } } } },
      contact: true,
      associate: { include: { user: { select: { name: true } } } },
      currentProgram: true,
      rateSheet: true,
      convertedFundedDeal: true,
      approvalRequest: {
        include: {
          policy: true,
          decidedBy: { select: { name: true } },
          steps: {
            include: { decidedBy: { select: { name: true } }, delegatedTo: { select: { name: true } } },
            orderBy: { stepOrder: "asc" },
          },
        },
      },
    },
  });
  if (!r) return null;

  const steps: ApprovalStepRow[] = (r.approvalRequest?.steps ?? []).map((s) => ({
    id: s.id,
    stepOrder: s.stepOrder,
    approverRole: s.approverRole,
    status: s.status,
    decidedAt: s.decidedAt?.toISOString() ?? null,
    deciderName: s.decidedBy?.name ?? null,
    delegatedToName: s.delegatedTo?.name ?? null,
    rationale: s.rationale,
  }));
  const activeStepRaw = r.approvalRequest?.status === "PENDING" ? activeStepOf(steps) : null;

  return {
    id: r.id,
    rooftopId: r.rooftopId,
    rooftopName: r.rooftop.name,
    dealerGroupName: r.rooftop.dealerGroup.name,
    contactName: r.contact ? `${r.contact.firstName} ${r.contact.lastName}` : null,
    requestType: r.requestType,
    requestedTerms: (r.requestedTerms as Record<string, unknown>) ?? {},
    rationale: r.rationale,
    dollarAmount: r.dollarAmount,
    currentProgramName: r.currentProgram?.name ?? null,
    rateSheetSummary: r.rateSheet ? `Effective ${r.rateSheet.effectiveFrom.toLocaleDateString()}` : null,
    requestedByName: r.associate.user.name,
    submittedAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
    approvalRequest: r.approvalRequest
      ? {
          id: r.approvalRequest.id,
          status: r.approvalRequest.status,
          policyName: r.approvalRequest.policy.name,
          reasonCodes: (r.approvalRequest.reasonCodes as Record<string, unknown>) ?? {},
          slaHours: r.approvalRequest.policy.slaHours,
          requestedAt: r.approvalRequest.requestedAt.toISOString(),
          decidedAt: r.approvalRequest.decidedAt?.toISOString() ?? null,
          deciderName: r.approvalRequest.decidedBy?.name ?? null,
          decisionRationale: r.approvalRequest.decisionRationale,
          steps,
          activeStep: activeStepRaw ?? null,
        }
      : null,
    outcome: r.convertedFundedDeal
      ? { fundedAmount: r.convertedFundedDeal.fundedAmount, fundedAt: r.convertedFundedDeal.fundedAt.toISOString() }
      : null,
  };
}

/** Pending decisions where the active (first non-terminal) step's approverRole matches this role. */
export async function getApproverQueueForRole(role: "SALES_LEADER" | "ADMIN"): Promise<ApproverQueueRow[]> {
  const pending = await prisma.approvalRequest.findMany({
    where: { triggerType: "EXCEPTION_REQUEST", status: "PENDING" },
    include: {
      policy: true,
      requestedBy: { select: { name: true } },
      steps: { orderBy: { stepOrder: "asc" } },
      exceptionRequest: { include: { rooftop: { select: { name: true } } } },
    },
  });

  const now = new Date();
  const rows: ApproverQueueRow[] = [];
  for (const ar of pending) {
    const active = activeStepOf(ar.steps);
    if (!active || active.approverRole !== role || !ar.exceptionRequest) continue;
    const due = slaDueAt(ar.requestedAt, ar.policy.slaHours);
    rows.push({
      exceptionRequestId: ar.exceptionRequest.id,
      approvalRequestId: ar.id,
      stepId: active.id,
      rooftopName: ar.exceptionRequest.rooftop.name,
      requestType: ar.exceptionRequest.requestType,
      dollarAmount: ar.exceptionRequest.dollarAmount,
      policyName: ar.policy.name,
      requestedByName: ar.requestedBy.name,
      requestedAt: ar.requestedAt.toISOString(),
      slaDueAt: due.toISOString(),
      isBreached: due < now,
      hoursWaiting: Math.round((now.getTime() - ar.requestedAt.getTime()) / 3600000),
    });
  }

  return rows.sort((a, b) => (a.isBreached === b.isBreached ? a.slaDueAt.localeCompare(b.slaDueAt) : a.isBreached ? -1 : 1));
}

/**
 * Resolves the program + effective rate sheet a new exception on this rooftop should
 * attach to: whatever program its most recent exception used, else the standard program.
 * Shared by the intake preview and the actual submission so the created record carries
 * the same program/rate-sheet linkage the requester saw pre-filled.
 */
export async function resolveCurrentProgramAndRateSheet(rooftopId: string) {
  const [mostRecent, standardProgram] = await Promise.all([
    prisma.exceptionRequest.findFirst({
      where: { rooftopId },
      include: { currentProgram: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.pricingProgram.findFirst({ where: { name: "Standard Indirect Financing" } }),
  ]);

  const currentProgram = mostRecent?.currentProgram ?? standardProgram;
  const rateSheet = currentProgram
    ? await prisma.rateSheet.findFirst({
        where: { pricingProgramId: currentProgram.id, effectiveFrom: { lte: new Date() } },
        orderBy: { effectiveFrom: "desc" },
      })
    : null;

  return { programId: currentProgram?.id ?? null, programName: currentProgram?.name ?? null, rateSheetId: rateSheet?.id ?? null, rateSheetSummary: rateSheet ? `Effective ${rateSheet.effectiveFrom.toLocaleDateString()}` : null };
}

/** Pre-fill context for the intake dialog: current program, applicable rate sheet, recent history. */
export async function getIntakeContext(rooftopId: string): Promise<IntakeContext> {
  const [{ programName, rateSheetSummary }, recent] = await Promise.all([
    resolveCurrentProgramAndRateSheet(rooftopId),
    prisma.exceptionRequest.findMany({
      where: { rooftopId },
      include: { approvalRequest: { select: { status: true } } },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  return {
    currentProgramName: programName ?? "Standard Indirect Financing",
    rateSheetSummary,
    recentHistory: recent.map((r) => ({
      id: r.id,
      requestType: r.requestType,
      dollarAmount: r.dollarAmount,
      status: r.approvalRequest?.status ?? null,
      submittedAt: r.createdAt.toISOString(),
    })),
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

export async function getContactOptionsForUser(user: CurrentUser): Promise<ContactOption[]> {
  const where = await scopeFilter(user, "Rooftop", MODULE_ID);
  const rooftops = await prisma.rooftop.findMany({ where, select: { id: true } });
  const rooftopIds = rooftops.map((r) => r.id);
  const contacts = await prisma.contact.findMany({
    where: { rooftopId: { in: rooftopIds } },
    orderBy: { lastName: "asc" },
  });
  return contacts.map((c) => ({ id: c.id, rooftopId: c.rooftopId!, name: `${c.firstName} ${c.lastName}`, personaType: c.personaType }));
}
