import { getCurrentUser } from "./current-user";
import { can } from "./entitlements";
import type { ModuleId } from "./module-ids";
import type { CurrentUser } from "./types";

/**
 * Resolves the current persona and whether they're entitled to a module —
 * the one place every module route (stub or real) checks access, so the
 * registry's "enforce entitlement before rendering a route" rule
 * (spec Section 7) lives in one spot rather than being re-implemented per page.
 */
export async function getModuleAccess(
  moduleId: ModuleId,
  capability = "view"
): Promise<{ user: CurrentUser; allowed: boolean }> {
  const user = await getCurrentUser();
  const allowed = await can(user, moduleId, capability);
  return { user, allowed };
}
