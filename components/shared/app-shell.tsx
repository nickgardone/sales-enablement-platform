import Link from "next/link";
import { PersonaSwitcher } from "./persona-switcher";
import { NotificationBell, type NotificationSignal } from "./notification-bell";
import { GlobalSearch } from "./global-search";
import { DegradedModeToggle } from "./degraded-mode-toggle";
import { DegradedModeBanner } from "./degraded-mode-banner";
import { NavLink } from "./nav-link";
import { PersonaBadge } from "./persona-badge";
import type { ModuleManifest, NavGroup } from "@/lib/platform/registry";
import type { CurrentUser } from "@/lib/platform/types";
import type { SwitchablePersona } from "@/lib/platform/current-user";

const GROUP_LABEL: Record<NavGroup, string> = {
  WORKSPACE: "Workspace",
  INSIGHTS: "Insights",
  ADMIN: "Admin",
};

const GROUP_ORDER: NavGroup[] = ["WORKSPACE", "INSIGHTS", "ADMIN"];

const ROLE_VIEW_LABEL: Record<CurrentUser["role"], string> = {
  SALES_ASSOCIATE: "Associate view",
  SALES_LEADER: "Leader view",
  ADMIN: "Admin view",
};

export function AppShell({
  user,
  personas,
  nav,
  notificationSignals,
  children,
}: {
  user: CurrentUser;
  personas: SwitchablePersona[];
  nav: ModuleManifest[];
  notificationSignals: NotificationSignal[];
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen w-full">
      <aside className="hidden w-64 shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground md:flex print:hidden">
        <div className="flex h-14 items-center border-b border-sidebar-border px-4">
          <Link href="/" className="text-sm font-semibold">
            Sales Enablement
          </Link>
        </div>
        <nav className="flex-1 space-y-4 overflow-y-auto p-3">
          {GROUP_ORDER.map((group) => {
            const items = nav.filter((m) => m.navGroup === group);
            if (items.length === 0) return null;
            return (
              <div key={group}>
                <p className="px-3 pb-1 text-xs font-medium tracking-wide text-sidebar-foreground/50 uppercase">
                  {GROUP_LABEL[group]}
                </p>
                <div className="space-y-0.5">
                  {items.map((m) => (
                    <NavLink key={m.id} href={m.route} label={m.name} icon={<m.icon className="size-4 shrink-0" />} />
                  ))}
                </div>
              </div>
            );
          })}
          {nav.length === 0 && (
            <p className="px-3 text-sm text-sidebar-foreground/60">No modules entitled for this persona.</p>
          )}
        </nav>
        <div className="border-t border-sidebar-border p-3">
          <PersonaBadge user={user} />
        </div>
      </aside>
      <div className="flex min-h-screen flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b px-4 print:hidden">
          <span className="text-sm text-muted-foreground">{ROLE_VIEW_LABEL[user.role]}</span>
          <div className="flex items-center gap-2">
            <GlobalSearch />
            <DegradedModeToggle />
            <NotificationBell signals={notificationSignals} />
            <PersonaSwitcher currentUserId={user.id} personas={personas} />
          </div>
        </header>
        <DegradedModeBanner />
        <main className="flex-1 overflow-y-auto bg-muted/20 p-6">{children}</main>
      </div>
    </div>
  );
}
