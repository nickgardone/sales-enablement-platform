import { prisma } from "@/lib/prisma";
import { scopeFilter } from "@/lib/platform/entitlements";
import type { CurrentUser } from "@/lib/platform/types";
import type { ContactOption, GoalProgress, PitchListRow, RooftopOption } from "./types";

const MODULE_ID = "pitching";

export async function getPitchesForUser(user: CurrentUser): Promise<PitchListRow[]> {
  const rooftopWhere = await scopeFilter(user, "Rooftop", MODULE_ID);
  const pitches = await prisma.pitch.findMany({
    where: { rooftop: rooftopWhere },
    include: {
      rooftop: { include: { dealerGroup: { select: { name: true } } } },
      contact: true,
      associate: { include: { user: { select: { name: true } } } },
    },
    orderBy: { occurredAt: "desc" },
  });

  return pitches.map((p) => ({
    id: p.id,
    rooftopName: p.rooftop.name,
    dealerGroupName: p.rooftop.dealerGroup.name,
    contactName: `${p.contact.firstName} ${p.contact.lastName}`,
    associateName: p.associate.user.name,
    productPitched: p.productPitched,
    outcome: p.outcome,
    objection: p.objection,
    occurredAt: p.occurredAt.toISOString(),
  }));
}

/**
 * Progress against the most recently seeded goal period for this user's associate
 * profile, and the team goal for the same period. Uses "latest available period"
 * rather than the real calendar month so this stays correct regardless of drift
 * between wall-clock "now" and the seed data's fixed anchor date.
 */
export async function getPitchGoalProgress(user: CurrentUser): Promise<{ individual: GoalProgress | null; team: GoalProgress | null }> {
  const latest = await prisma.pitchGoal.findFirst({ orderBy: { period: "desc" }, select: { period: true } });
  if (!latest) return { individual: null, team: null };
  const period = latest.period;
  const periodEnd = new Date(period);
  periodEnd.setMonth(periodEnd.getMonth() + 1);

  const [individualGoal, teamGoal] = await Promise.all([
    user.associateId
      ? prisma.pitchGoal.findFirst({ where: { ownerType: "ASSOCIATE", associateId: user.associateId, period } })
      : null,
    user.teamId ? prisma.pitchGoal.findFirst({ where: { ownerType: "TEAM", teamId: user.teamId, period } }) : null,
  ]);

  const [individualCount, teamCount] = await Promise.all([
    user.associateId
      ? prisma.pitch.count({ where: { associateId: user.associateId, occurredAt: { gte: period, lt: periodEnd } } })
      : 0,
    user.teamId
      ? prisma.pitch.count({
          where: { associate: { teamId: user.teamId }, occurredAt: { gte: period, lt: periodEnd } },
        })
      : 0,
  ]);

  return {
    individual: individualGoal
      ? { period: period.toISOString(), targetCount: individualGoal.targetCount, achievedCount: individualCount, productFocus: individualGoal.productFocus }
      : null,
    team: teamGoal
      ? { period: period.toISOString(), targetCount: teamGoal.targetCount, achievedCount: teamCount, productFocus: teamGoal.productFocus }
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

export async function getContactOptionsForUser(user: CurrentUser): Promise<ContactOption[]> {
  const where = await scopeFilter(user, "Rooftop", MODULE_ID);
  const rooftops = await prisma.rooftop.findMany({ where, select: { id: true } });
  const rooftopIds = rooftops.map((r) => r.id);
  const contacts = await prisma.contact.findMany({ where: { rooftopId: { in: rooftopIds } }, orderBy: { lastName: "asc" } });
  return contacts.map((c) => ({ id: c.id, rooftopId: c.rooftopId!, name: `${c.firstName} ${c.lastName}`, personaType: c.personaType }));
}
