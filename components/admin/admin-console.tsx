import { prisma } from "@/lib/prisma";
import { MODULE_REGISTRY } from "@/lib/platform/registry";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ApprovalsTab } from "./approvals-tab";
import { EntitlementsTab, type EntitlementMatrixRow } from "./entitlements-tab";
import { ModulesTab } from "./modules-tab";
import { RoutingRulesTab } from "./routing-rules-tab";
import { TierLogicTab } from "./tier-logic-tab";
import { AuditLogTab, type AuditLogRow } from "./audit-log-tab";
import { DataTab } from "./data-tab";
import type { PolicyRow } from "./policy-editor";
import type { UserRole, DataScope } from "@/lib/platform/types";

export async function AdminConsole() {
  const [policyRows, entitlementRows, manifestRows, routingRuleRows, associateUsers, tierRows, auditRows, counts] = await Promise.all([
    prisma.approvalPolicy.findMany({ orderBy: { name: "asc" } }),
    prisma.entitlement.findMany({ where: { capability: "view" } }),
    prisma.moduleManifest.findMany(),
    prisma.routingRule.findMany({ orderBy: { priority: "asc" } }),
    // RoutingRule.targetAssociateId has no Prisma relation (it's a bare scalar) —
    // join manually rather than add one just for this display lookup.
    prisma.associate.findMany({ include: { user: { select: { name: true } } } }),
    prisma.loyaltyTier.findMany(),
    prisma.auditEvent.findMany({
      orderBy: { timestamp: "desc" },
      take: 100,
      include: { actor: { select: { name: true, role: true } } },
    }),
    Promise.all([
      prisma.rooftop.count(),
      prisma.user.count(),
      prisma.opportunity.count(),
      prisma.auditEvent.count(),
    ]),
  ]);

  const policies: PolicyRow[] = policyRows.map((p) => {
    const conditions = (p.thresholdConditions ?? {}) as { minAmount?: number; maxAmount?: number };
    return {
      id: p.id,
      name: p.name,
      triggerType: p.triggerType,
      minAmount: conditions.minAmount ?? null,
      maxAmount: conditions.maxAmount ?? null,
      approverRoleChain: p.approverRoleChain as string[],
      slaHours: p.slaHours,
      active: p.active,
    };
  });

  const manifestByModule = new Map(manifestRows.map((m) => [m.moduleId, m]));
  const entitlementByKey = new Map(entitlementRows.map((e) => [`${e.role}::${e.moduleId}`, e]));
  const entitlementMatrix: EntitlementMatrixRow[] = MODULE_REGISTRY.map((m) => ({
    moduleId: m.id,
    moduleName: m.name,
    scopes: {
      SALES_ASSOCIATE: entitlementByKey.get(`SALES_ASSOCIATE::${m.id}`)?.dataScope ?? "NONE",
      SALES_LEADER: entitlementByKey.get(`SALES_LEADER::${m.id}`)?.dataScope ?? "NONE",
      ADMIN: entitlementByKey.get(`ADMIN::${m.id}`)?.dataScope ?? "NONE",
    } satisfies Record<UserRole, DataScope>,
  }));

  const modules = MODULE_REGISTRY.map((m) => {
    const manifest = manifestByModule.get(m.id);
    return {
      moduleId: m.id,
      name: m.name,
      enabledAssociate: manifest?.enabledAssociate ?? true,
      enabledLeader: manifest?.enabledLeader ?? true,
      enabledAdmin: manifest?.enabledAdmin ?? true,
    };
  });

  const associateNameById = new Map(associateUsers.map((a) => [a.id, a.user.name]));
  const routingRules = routingRuleRows.map((r) => ({
    id: r.id,
    name: r.name,
    priority: r.priority,
    active: r.active,
    targetAssociateName: (r.targetAssociateId && associateNameById.get(r.targetAssociateId)) ?? "Unassigned",
    criteria: r.criteria,
  }));

  const auditEvents: AuditLogRow[] = auditRows.map((e) => ({
    id: e.id,
    action: e.action,
    entityType: e.entityType,
    entityId: e.entityId,
    actorName: e.actor.name,
    actorRole: e.actor.role,
    complianceRelevant: e.complianceRelevant,
    timestamp: e.timestamp.toISOString(),
  }));

  const [rooftops, users, opportunities, auditEventCount] = counts;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Admin Console</h1>
        <p className="text-sm text-muted-foreground">Entitlements, module toggles, approval policy, routing rules, tier logic, audit log.</p>
      </div>
      <Tabs defaultValue="approvals">
        <TabsList>
          <TabsTrigger value="approvals">Approvals</TabsTrigger>
          <TabsTrigger value="entitlements">Entitlements</TabsTrigger>
          <TabsTrigger value="modules">Modules</TabsTrigger>
          <TabsTrigger value="routing">Lead Routing</TabsTrigger>
          <TabsTrigger value="tiers">Loyalty Tiers</TabsTrigger>
          <TabsTrigger value="audit">Audit Log</TabsTrigger>
          <TabsTrigger value="data">Data</TabsTrigger>
        </TabsList>
        <TabsContent value="approvals">
          <ApprovalsTab policies={policies} />
        </TabsContent>
        <TabsContent value="entitlements">
          <EntitlementsTab rows={entitlementMatrix} />
        </TabsContent>
        <TabsContent value="modules">
          <ModulesTab rows={modules} />
        </TabsContent>
        <TabsContent value="routing">
          <RoutingRulesTab rules={routingRules} />
        </TabsContent>
        <TabsContent value="tiers">
          <TierLogicTab tiers={tierRows} />
        </TabsContent>
        <TabsContent value="audit">
          <AuditLogTab events={auditEvents} />
        </TabsContent>
        <TabsContent value="data">
          <DataTab counts={{ rooftops, users, opportunities, auditEvents: auditEventCount }} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
