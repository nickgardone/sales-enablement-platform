import { getModuleAccess } from "@/lib/platform/route-guard";
import { getModuleById } from "@/lib/platform/registry";
import type { ModuleId } from "@/lib/platform/module-ids";
import { AccessRestricted } from "./access-restricted";
import { EmptyState } from "./empty-state";

/**
 * Renders every module route until that module's real UI is built. A module
 * registered but not yet built renders "entitled, not yet available" rather
 * than a 404 (spec Section 7), while a module the current persona isn't
 * entitled to renders AccessRestricted instead of leaking its stub content.
 */
export async function ModulePage({ moduleId }: { moduleId: ModuleId }) {
  const manifest = getModuleById(moduleId);
  if (!manifest) return null;

  const { user, allowed } = await getModuleAccess(moduleId, manifest.capability);
  if (!allowed) return <AccessRestricted moduleName={manifest.name} role={user.role} />;

  const Icon = manifest.icon;
  return (
    <EmptyState
      icon={<Icon className="size-6 text-muted-foreground" />}
      title={manifest.name}
      description={manifest.description}
      footer="You're entitled to this module — it hasn't been built yet."
    />
  );
}
