import type { LucideIcon } from "lucide-react";
import type { ModuleId } from "./module-ids";
import type { CurrentUser } from "./types";
import { can } from "./entitlements";
import {
  Building2,
  FileWarning,
  MessageSquareText,
  Handshake,
  Route,
  BarChart3,
  Award,
  BookOpen,
  ClipboardList,
  AlertTriangle,
  TrendingUp,
  Sparkles,
  ShieldCheck,
} from "lucide-react";

export type NavGroup = "WORKSPACE" | "INSIGHTS" | "ADMIN";

export type ModuleManifest = {
  id: ModuleId;
  name: string;
  description: string;
  route: string;
  icon: LucideIcon;
  navGroup: NavGroup;
  navOrder: number;
  /** Capability checked against the Entitlement table to decide nav visibility. */
  capability: string;
};

// Manifest-driven modules (spec principle 1): adding a module means adding an
// entry here plus a route folder under /app — nothing else in the shell
// should need to change. Nav is built by filtering this list through the
// entitlement engine (lib/platform/entitlements.ts), never hand-coded per role.
export const MODULE_REGISTRY: ModuleManifest[] = [
  {
    id: "dealer-account-360",
    name: "Account 360",
    description: "Dealer account planning: contacts, performance, tier, competitive position, visit briefs.",
    route: "/accounts",
    icon: Building2,
    navGroup: "WORKSPACE",
    navOrder: 1,
    capability: "view",
  },
  {
    id: "pricing-exceptions",
    name: "Pricing Exceptions",
    description: "Rate exceptions, program tier changes, term extensions, and fee waivers with routed approvals.",
    route: "/exceptions",
    icon: FileWarning,
    navGroup: "WORKSPACE",
    navOrder: 2,
    capability: "view",
  },
  {
    id: "pitching",
    name: "Pitching",
    description: "Log pitches by rooftop and contact persona; track progress against monthly goals.",
    route: "/pitching",
    icon: MessageSquareText,
    navGroup: "WORKSPACE",
    navOrder: 3,
    capability: "view",
  },
  {
    id: "closing-deals",
    name: "Closing Deals",
    description: "Opportunity pipeline, stage progression, stips, and funding status.",
    route: "/deals",
    icon: Handshake,
    navGroup: "WORKSPACE",
    navOrder: 4,
    capability: "view",
  },
  {
    id: "lead-routing",
    name: "Lead Routing",
    description: "Inbound leads, SLA aging, and routing explainability.",
    route: "/leads",
    icon: Route,
    navGroup: "WORKSPACE",
    navOrder: 5,
    capability: "view",
  },
  {
    id: "loyalty-tier",
    name: "Loyalty Tier",
    description: "Tier standing, threshold distance, and down-tier risk with reason codes.",
    route: "/loyalty",
    icon: Award,
    navGroup: "WORKSPACE",
    navOrder: 6,
    capability: "view",
  },
  {
    id: "cross-sell",
    name: "Cross-Sell",
    description: "Signal-driven worklist for rooftops missing financing or software.",
    route: "/cross-sell",
    icon: Sparkles,
    navGroup: "WORKSPACE",
    navOrder: 7,
    capability: "view",
  },
  {
    id: "dealer-onboarding",
    name: "Dealer Onboarding",
    description: "New dealer case record, checklist, and approval handoff.",
    route: "/onboarding",
    icon: ClipboardList,
    navGroup: "WORKSPACE",
    navOrder: 8,
    capability: "view",
  },
  {
    id: "escalations-disputes",
    name: "Escalations & Disputes",
    description: "Intake, routing, and resolution log.",
    route: "/escalations",
    icon: AlertTriangle,
    navGroup: "WORKSPACE",
    navOrder: 9,
    capability: "view",
  },
  {
    id: "forecasting-pipeline",
    name: "Forecasting",
    description: "Leader-scoped pipeline rollup with weighted forecast.",
    route: "/forecasting",
    icon: TrendingUp,
    navGroup: "INSIGHTS",
    navOrder: 10,
    capability: "view",
  },
  {
    id: "performance-insights",
    name: "Performance & Insights",
    description: "Associate, leader, and exec-level metrics with source and as-of on every number.",
    route: "/insights",
    icon: BarChart3,
    navGroup: "INSIGHTS",
    navOrder: 11,
    capability: "view",
  },
  {
    id: "enablement-content",
    name: "Enablement & Content",
    description: "Persona-filtered playbooks, competitive intel, and certifications.",
    route: "/content",
    icon: BookOpen,
    navGroup: "INSIGHTS",
    navOrder: 12,
    capability: "view",
  },
  {
    id: "admin-console",
    name: "Admin Console",
    description: "Entitlements, module toggles, approval policy, routing rules, tier logic, audit log.",
    route: "/admin",
    icon: ShieldCheck,
    navGroup: "ADMIN",
    navOrder: 13,
    capability: "view",
  },
];

export function getModuleById(id: string) {
  return MODULE_REGISTRY.find((m) => m.id === id);
}

export function getModuleByRoute(route: string) {
  return MODULE_REGISTRY.find((m) => m.route === route);
}

// Single place that turns the manifest list into "what nav can this user see" —
// used by the shell (layout) and by any page that needs the same list (e.g. a
// dashboard summary), so the entitlement-check loop isn't duplicated per caller.
export async function getNavForUser(user: CurrentUser): Promise<ModuleManifest[]> {
  const checked = await Promise.all(
    MODULE_REGISTRY.map(async (m) => ({ module: m, allowed: await can(user, m.id, m.capability) }))
  );
  return checked.filter((c) => c.allowed).map((c) => c.module);
}
