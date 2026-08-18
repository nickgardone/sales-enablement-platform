// Single source of truth for module ids, shared by the registry (lib/platform/registry.ts)
// and the seed script (prisma/seed.ts) so the entitlement matrix can't silently drift
// from the actual set of registered modules — TypeScript enforces exhaustiveness on both.
export const MODULE_IDS = [
  "dealer-account-360",
  "pricing-exceptions",
  "pitching",
  "closing-deals",
  "lead-routing",
  "loyalty-tier",
  "cross-sell",
  "dealer-onboarding",
  "escalations-disputes",
  "forecasting-pipeline",
  "performance-insights",
  "enablement-content",
  "admin-console",
] as const;

export type ModuleId = (typeof MODULE_IDS)[number];
