import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/lib/generated/prisma/client";
import type { CurrentUser, DataScope } from "./types";

// Entitlement = (role, module, capability, dataScope) — spec principle 3.
// Every list query must go through scopeFilter() rather than re-deriving
// scope logic per module; every nav/route gate must go through can().

export async function can(user: CurrentUser, moduleId: string, capability = "view"): Promise<boolean> {
  const [entitlement, manifest] = await Promise.all([
    prisma.entitlement.findUnique({
      where: { role_moduleId_capability: { role: user.role, moduleId, capability } },
    }),
    prisma.moduleManifest.findUnique({ where: { moduleId } }),
  ]);

  if (!entitlement || !entitlement.allowed || entitlement.dataScope === "NONE") return false;

  if (manifest) {
    const enabledForRole =
      user.role === "SALES_ASSOCIATE" ? manifest.enabledAssociate
      : user.role === "SALES_LEADER" ? manifest.enabledLeader
      : manifest.enabledAdmin;
    if (!enabledForRole) return false;
  }

  return true;
}

export async function getDataScope(user: CurrentUser, moduleId: string, capability = "view"): Promise<DataScope> {
  const entitlement = await prisma.entitlement.findUnique({
    where: { role_moduleId_capability: { role: user.role, moduleId, capability } },
  });
  if (!entitlement || !entitlement.allowed) return "NONE";
  return entitlement.dataScope;
}

type ScopedEntityType = "Rooftop";

/**
 * Builds the Prisma `where` clause for a scoped list query. Extend the
 * switch as new entity types need scoping — each module owns adding its
 * own case here rather than re-implementing scope logic locally.
 */
export async function scopeFilter(
  user: CurrentUser,
  entityType: ScopedEntityType,
  moduleId: string,
  capability = "view"
): Promise<Record<string, unknown>> {
  const scope = await getDataScope(user, moduleId, capability);

  if (scope === "NONE") return { id: "__no_access__" };

  switch (entityType) {
    case "Rooftop": {
      if (scope === "OWN") {
        if (!user.associateId) return { id: "__no_access__" };
        return { assignedAssociateId: user.associateId } satisfies Prisma.RooftopWhereInput;
      }
      if (scope === "TEAM") {
        if (!user.territoryId) return { id: "__no_access__" };
        return { territoryId: user.territoryId } satisfies Prisma.RooftopWhereInput;
      }
      return {}; // GLOBAL
    }
    default:
      return { id: "__no_access__" };
  }
}
