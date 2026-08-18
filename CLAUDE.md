@AGENTS.md

# Sales Enablement Platform — prototype

Full build spec: [initial-spec-review.md](initial-spec-review.md) has the confirmed architecture decisions. The original spec's 16 sections (principles, data model, modules, build phases, golden path) drive all implementation — read it before making structural changes.

## Non-negotiable principles (spec Section 2)
1. Manifest-driven modules — no hand-editing the shell to add a module.
2. One shared Prisma schema — no module-local data duplication.
3. Entitlement = (role, module, capability, dataScope) — filter data, never fork components per persona.
4. Shared capabilities (approvals, entitlements, signals, audit, content, assistant) are services in `/lib/services`, consumed by modules, never reimplemented.
5. Every state change writes an audit event; pricing/rate-touching ones set `complianceRelevant`.
6. Every rendered metric shows source + as-of (`MetricSnapshot`).
7. Tier placement, lead routing, and approval routing expose stored reason codes.

## Repo conventions
```
/app                     route groups per module
/components/ui           shadcn primitives
/components/shared       cross-module components (MetricCard, AuditTrail, PersonaBadge…)
/lib/platform            host shell: registry, entitlements, signals, audit, search
/lib/services            approvals, content, assistant, tier-evaluation, routing
/lib/modules/<id>        module manifest + domain logic per module
/prisma/schema.prisma
/prisma/seed.ts
```

## Build phases
Build one phase at a time (spec Section 13); each phase ends with a running app. Do not jump ahead to later phases without confirming the current one runs clean.

## Scripts
- `npm run db:reset` — drop, migrate, reseed. Safe to run repeatedly.
- `npm run db:seed` — idempotent, deterministic (fixed seed).

## Git workflow
Commit at the end of each completed phase (or other logical checkpoint) and push to GitHub — the user wants work landed on the remote as it's done, not left local. No need to ask before pushing to `main` on this repo.
