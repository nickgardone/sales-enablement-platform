import { ShieldOff } from "lucide-react";
import { getCurrentUser } from "@/lib/platform/current-user";
import { can } from "@/lib/platform/entitlements";
import { getModuleById, type ModuleManifest } from "@/lib/platform/registry";
import type { ModuleId } from "@/lib/platform/module-ids";
import type { CurrentUser } from "@/lib/platform/types";

const ROLE_LABEL: Record<CurrentUser["role"], string> = {
  SALES_ASSOCIATE: "the Sales Associate",
  SALES_LEADER: "the Sales Leader",
  ADMIN: "the Admin",
};

/**
 * Renders every module route until that module's real UI is built. Also
 * enforces entitlement at the route level (spec Section 7: "registry ...
 * enforces entitlement before rendering a route") — a module registered but
 * not yet built renders "entitled, not yet available" rather than a 404,
 * while a module the current persona isn't entitled to at all renders an
 * access-restricted state instead of leaking its stub content.
 */
export async function ModulePage({ moduleId }: { moduleId: ModuleId }) {
  const manifest = getModuleById(moduleId);
  if (!manifest) return null;

  const user = await getCurrentUser();
  const allowed = await can(user, manifest.id, manifest.capability);
  const Icon = manifest.icon;

  if (!allowed) {
    return (
      <EmptyState
        icon={<ShieldOff className="size-6 text-muted-foreground" />}
        title="Not part of this persona"
        description={`${manifest.name} isn't entitled for ${ROLE_LABEL[user.role]} persona. Switch personas to see it.`}
      />
    );
  }

  return (
    <EmptyState
      icon={<Icon className="size-6 text-muted-foreground" />}
      title={manifest.name}
      description={manifest.description}
      footer="You're entitled to this module — it hasn't been built yet."
    />
  );
}

function EmptyState({
  icon,
  title,
  description,
  footer,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  footer?: string;
}) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <div className="flex size-14 items-center justify-center rounded-full bg-muted">{icon}</div>
      <div className="space-y-1">
        <h1 className="text-lg font-semibold">{title}</h1>
        <p className="max-w-md text-sm text-muted-foreground">{description}</p>
      </div>
      {footer && <p className="text-xs text-muted-foreground">{footer}</p>}
    </div>
  );
}

export type { ModuleManifest };
