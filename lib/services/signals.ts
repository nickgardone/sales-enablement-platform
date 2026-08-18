import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/lib/generated/prisma/client";
import type { CurrentUser } from "@/lib/platform/types";
import { scopeFilter } from "@/lib/platform/entitlements";

type EmitSignalInput = {
  type: string;
  payload: Prisma.InputJsonValue;
  sourceModule: string;
  entityType?: string;
  entityId?: string;
};

// Shared signals bus (spec Section 8): modules emit typed, persisted, replayable
// events here rather than calling notification/fan-out logic directly.
export async function emitSignal(input: EmitSignalInput) {
  return prisma.signal.create({ data: input });
}

export async function getRecentSignals(limit = 15) {
  return prisma.signal.findMany({ orderBy: { emittedAt: "desc" }, take: limit });
}

/**
 * Recent signals relevant to this user's data scope. Admin sees everything
 * (global config persona); associates/leaders see signals whose payload
 * references a rooftop within their book/territory. Every seeded signal type
 * carries `rooftopId` in its payload, which is what makes this filter work
 * without a per-signal-type join table.
 */
export async function getSignalsForUser(user: CurrentUser, limit = 15) {
  if (user.role === "ADMIN") return getRecentSignals(limit);

  const rooftopWhere = await scopeFilter(user, "Rooftop", "dealer-account-360");
  const rooftops = await prisma.rooftop.findMany({ where: rooftopWhere, select: { id: true } });
  const rooftopIds = new Set(rooftops.map((r) => r.id));

  const candidates = await prisma.signal.findMany({ orderBy: { emittedAt: "desc" }, take: 300 });
  const relevant = candidates.filter((signal) => {
    const payload = signal.payload as Record<string, unknown> | null;
    const rooftopId = typeof payload?.rooftopId === "string" ? payload.rooftopId : undefined;
    return rooftopId ? rooftopIds.has(rooftopId) : false;
  });

  return relevant.slice(0, limit);
}
