# Spec Review: Internal Sales Enablement Platform (Prototype)

## Context
User pasted the full build spec as an opening prompt and explicitly asked NOT to build yet — only to confirm understanding of the 7 architectural principles (Section 2) and the data model (Section 6), and flag ambiguities or things worth modeling differently. This is a pure review/discussion pass before any Phase 1 scaffolding work begins. No existing codebase to explore — this working directory (`Business/Career`) is unrelated to the target project and contains no prior art for it.

## Confirmed understanding — Section 2 principles
1. **Manifest-driven modules** — each module is a self-contained registration (id, name, routes, nav placement, entitlements, data deps, signals in/out); the shell reads the registry, never hand-edited per module.
2. **One data model** — all modules read/write through the single shared Prisma schema; no module-local caches or copies of shared entities.
3. **Entitlement = (role, module, capability, dataScope)** — same component, same query, different scope filter per persona. Never fork components by persona.
4. **Shared capabilities are services, not modules** — approvals, entitlements, signals, audit, content, assistant are consumed, never reimplemented per module.
5. **Every state change → audit event** — immutable, queryable; pricing/rate-touching events flagged `complianceRelevant`.
6. **Metrics carry provenance** — every rendered number shows source + as-of; freshness is data, not UI dressing.
7. **Explainability over black boxes** — tier placement, lead routing, approval routing all expose stored reason codes via drill-down.

These read as internally consistent and mutually reinforcing (2 is what makes 3's scope-filter-not-fork approach possible; 4 is what makes 5/6/7 uniform across modules rather than per-module reinvention).

## Confirmed understanding — Section 6 data model
Four clusters: Accounts & people (DealerGroup → Rooftop, persona-typed Contact, Associate/Team/Territory/User/Role), Sales motion (Interaction, Pitch/PitchGoal, Lead/RoutingRule, Opportunity/DealStage/Stip, Application/FundedDeal), Commercial & programs (PricingProgram/RateSheet, ExceptionRequest, LoyaltyTier/TierEvaluation, CrossSellSignal), Shared services (ApprovalPolicy/Request/Step, Entitlement/ModuleManifest, AuditEvent/Signal, ContentAsset/Playbook/Certification, OnboardingCase/Escalation, MetricSnapshot).

Two explicit modeling directives: account hierarchy is first-class (Group vs. Rooftop, not flattened), and metrics are data products (MetricSnapshot carries source/asOf, not computed inline).

## Flagged ambiguities / things I'd model differently

1. **Team vs. Territory — redundant or orthogonal?** Both exist as entities, and Section 5's leader scope ("own team, 6 associates, ~180 rooftops") plus Section 8/10 references to "team territory" and "my team" rollups don't state whether a Team maps 1:1 to a Territory, or whether they're independent dimensions (a team could span territories, or a territory could contain associates from multiple teams). This is foundational — it's what `scopeFilter()` joins through for every leader-scoped query. **Asking below.**

2. **How does an Associate's "own book" resolve?** Not clear whether book = direct assignment (`Rooftop.assignedAssociateId`) or is derived transitively through Territory (Associate → Territory → Rooftop). Direct assignment is simpler and matches real-world book exceptions (reps sometimes cover rooftops outside their base territory); territory-derived is cleaner but rigid. Affects the same `scopeFilter()` logic as #1. **Asking below.**

3. **Approval-integration pattern for ExceptionRequest / OnboardingCase / Escalation.** Section 8 says the Approvals engine is generic and consumed by all four flows, but Section 6 lists `ExceptionRequest` as its own entity without saying whether it holds its own status/approver fields or is a thin record that points at a generic `ApprovalRequest`. To actually honor principle 4, I'd model each trigger entity as domain data only (what/why/amount) plus a nullable `approvalRequestId`, with all routing/SLA/decision state living exclusively in `ApprovalRequest`/`ApprovalStep`. Otherwise it's easy to accidentally duplicate a status enum in four places, which is exactly what principle 4 is meant to prevent. **Asking below (this is the one I feel most strongly should be locked in explicitly before Phase 3).**

4. **`MetricSnapshot` is missing an `entityType`.** The stated shape is `{ metricKey, entityId, value, source, asOf, freshnessSeconds }`. But Performance & Insights operates at three different entity scopes (associate, team/territory, rooftop), and `entityId` alone is ambiguous across those tables. I'd add `entityType: String` (or enum) so `metricKey + entityType + entityId` is the real composite lookup key. I'll model it this way unless you'd rather keep it flat.

5. **Contact attachment — rooftop-only, or can a contact float at the group level?** Section 6 nests Contact under the account cluster without saying whether `rooftopId` is required. In multi-rooftop groups, a `DEALER_PRINCIPAL` often oversees the whole group rather than one store. I'd model `Contact.dealerGroupId` as required and `Contact.rooftopId` as optional (null = group-level contact), rather than forcing every contact onto a single rooftop.

6. **`Stip` parent entity.** Listed alongside Opportunity/Application/FundedDeal without saying which it belongs to. Real stipulations track against the application/underwriting stage, not the opportunity itself. I'd model `Stip.applicationId` (required) with the opportunity reachable via the application, rather than attaching stips directly to Opportunity.

7. **`PricingProgram` / `RateSheet` versioning.** Not stated whether RateSheet is a dated/versioned child of PricingProgram. Pricing Exceptions intake needs to pre-fill "applicable rate sheet," which implies resolving by effective date. I'd model `RateSheet.pricingProgramId` + `effectiveFrom/effectiveTo` and resolve "current" by date range, rather than a single active flag.

8. **`ModuleManifest` as a DB entity vs. the code-level manifest.** Section 2 describes manifests as a registration each module makes (implies a code artifact under `/lib/modules/<id>`), but Section 6 also lists `ModuleManifest` as a Prisma entity for the admin console's enable/disable toggles. I'd treat the code manifest (routes, nav, signals, entitlement requirements) as the structural source of truth loaded at registry init, and the DB table as much narrower — just mutable admin state (`moduleId`, `role`, `enabled`) — rather than a second copy of the full manifest. Worth confirming so implementation doesn't end up with two sources of truth for the same thing.

9. **`Role` — enum or table?** Persona switcher is fixed to exactly 3 personas (Associate/Leader/Admin) and role management isn't in scope. I'd make `Role` an enum on `User` rather than its own CRUD-able table, unless custom/dynamic roles are actually wanted later.

10. **`CrossSellSignal` vs. generic `Signal`.** The `crosssell.identified` signal and the `CrossSellSignal` entity look like they could collapse into one, but 10.10 needs a worklist with state (dismissed/actioned), which a fire-and-forget event log doesn't give you. I'd keep `CrossSellSignal` as the durable worklist record and have it emit a `Signal` event on creation — not asking, just flagging the intended relationship so it doesn't get flattened by accident.

## Not asking about, but worth surfacing
- Global search (Section 7) needs to know what's searchable per module. Section 2's manifest field list (id/name/routes/nav/entitlements/data deps/signals) has no search-contribution field. I'd add one when we get to Phase 10 (`searchableEntities` on the manifest) rather than hardcoding search to know about specific modules.
- `Signal.dealerVisibleAt` — I'd keep `Signal` generic with a `payload: Json` column rather than adding a special-cased nullable column for one signal type, to stay consistent with principle 4.
- Principle 3's "never fork a component per persona" almost certainly has one legitimate exception: Admin's data scope is "config, not deal detail," which likely means Admin simply lacks the entitlement/capability to view deal-level panes at all (redirected to the stubbed-module or admin-console experience), rather than the scope filter trying to return zero rows through the same component. Flagging so we're aligned before Phase 4.

## Resolved decisions
- **Team/Territory:** 1:1 — a Team owns exactly one Territory. Leader scope = rooftops where `territoryId = leader's team's territoryId`.
- **Book assignment:** direct FK — `Rooftop.assignedAssociateId`. Territory remains the geographic/reporting dimension used for leader rollups; the FK is the source of truth for an individual's book.
- **Approval integration:** full delegation — `ExceptionRequest`, `OnboardingCase`, and `Escalation` each hold only domain data plus a nullable `approvalRequestId`. All routing, SLA aging, and decision state live exclusively in `ApprovalRequest`/`ApprovalStep`.

## Next step
This was a read-and-confirm pass only — no code has been written. Items 4–10 in the "flagged ambiguities" list above (MetricSnapshot.entityType, Contact group-level attachment, Stip→Application, RateSheet versioning, ModuleManifest DB-vs-code split, Role as enum, CrossSellSignal/Signal relationship) are my intended defaults; flag now if any should go differently before Phase 1 scaffolding starts. When ready to build, work through Section 13's phases one at a time as the spec itself instructs — Phase 1 (scaffold, Prisma schema, seed generator, `db:reset`) first.
