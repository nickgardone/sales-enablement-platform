import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getModuleAccess } from "@/lib/platform/route-guard";
import { scopeFilter } from "@/lib/platform/entitlements";
import { AccessRestricted } from "@/components/shared/access-restricted";
import { AuditTrail } from "@/components/shared/audit-trail";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AccountHeader } from "@/components/dealer-account-360/account-header";
import { AccountActions } from "@/components/dealer-account-360/account-actions";
import { ContactsPanel } from "@/components/dealer-account-360/contacts-panel";
import { TierPanel } from "@/components/dealer-account-360/tier-panel";
import { PerformancePane } from "@/components/dealer-account-360/performance-pane";
import { CompetitivePositionPane } from "@/components/dealer-account-360/competitive-position-pane";
import { ActivityTimeline } from "@/components/dealer-account-360/activity-timeline";
import { VisitBriefDialog } from "@/components/dealer-account-360/visit-brief-dialog";
import { AssistantPanel } from "@/components/dealer-account-360/assistant-panel";
import {
  getActivityTimeline,
  getCompetitivePosition,
  getContactsByPersona,
  getContentAssetOptions,
  getPerformanceTrend,
  getRooftopHeader,
  getTierPanel,
} from "@/lib/modules/dealer-account-360/queries";
import { summarizeAccount, suggestNextAction } from "@/lib/services/assistant/actions";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user, allowed } = await getModuleAccess("dealer-account-360");
  if (!allowed) return <AccessRestricted moduleName="Account 360" role={user.role} />;

  const scopeWhere = await scopeFilter(user, "Rooftop", "dealer-account-360");
  const inScope = await prisma.rooftop.findFirst({ where: { id, ...scopeWhere }, select: { id: true } });
  if (!inScope) return <AccessRestricted moduleName="Account 360" role={user.role} />;

  const header = await getRooftopHeader(id);
  if (!header) notFound();

  const [contactGroups, tierPanel, performance, competitive, timeline, contentAssets, assistantSummary, assistantSuggestions] = await Promise.all([
    getContactsByPersona(id),
    getTierPanel(id),
    getPerformanceTrend(id),
    getCompetitivePosition(id),
    getActivityTimeline(id),
    getContentAssetOptions(),
    summarizeAccount(id),
    suggestNextAction(id),
  ]);

  const flatContacts = contactGroups.flatMap((g) =>
    g.contacts.map((c) => ({ id: c.id, name: `${c.firstName} ${c.lastName}`, personaType: c.personaType }))
  );
  const assistantCitationCount = new Set(
    [...assistantSummary.citations, ...assistantSuggestions.citations].map((c) => `${c.entityType}:${c.entityId}`)
  ).size;

  // Audit events are recorded per-entity (an Interaction, a Pitch, an
  // ExceptionRequest...), never duplicated onto the rooftop — so "the audit
  // trail on this account" is the union of every entity already surfaced in
  // its activity timeline.
  const TIMELINE_KIND_TO_AUDIT_ENTITY_TYPE: Partial<Record<(typeof timeline)[number]["kind"], string>> = {
    INTERACTION: "Interaction",
    PITCH: "Pitch",
    EXCEPTION_REQUEST: "ExceptionRequest",
    ESCALATION: "Escalation",
    CONTENT_SHARE: "ContentShare",
  };
  const auditEntities = timeline.flatMap((t) => {
    const entityType = TIMELINE_KIND_TO_AUDIT_ENTITY_TYPE[t.kind];
    return entityType ? [{ entityType, entityId: t.id }] : [];
  });

  return (
    <div className="space-y-6">
      <AccountHeader header={header} />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <AccountActions rooftopId={id} contacts={flatContacts} contentAssets={contentAssets} />
        <VisitBriefDialog rooftopId={id} availablePersonas={contactGroups.map((g) => g.persona)} />
      </div>
      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-6">
          <PerformancePane series={performance} rooftopId={id} />
          <CompetitivePositionPane rows={competitive} />
          <ActivityTimeline items={timeline} />
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Audit Trail</CardTitle>
            </CardHeader>
            <CardContent>
              <AuditTrail entities={auditEntities} />
            </CardContent>
          </Card>
        </div>
        <div className="space-y-6">
          <AssistantPanel summary={assistantSummary.output} suggestions={assistantSuggestions.output} citationCount={assistantCitationCount} />
          <TierPanel data={tierPanel} />
          <ContactsPanel groups={contactGroups} />
        </div>
      </div>
    </div>
  );
}
