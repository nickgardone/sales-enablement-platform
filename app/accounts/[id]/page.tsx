import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getModuleAccess } from "@/lib/platform/route-guard";
import { scopeFilter } from "@/lib/platform/entitlements";
import { AccessRestricted } from "@/components/shared/access-restricted";
import { AccountHeader } from "@/components/dealer-account-360/account-header";
import { AccountActions } from "@/components/dealer-account-360/account-actions";
import { ContactsPanel } from "@/components/dealer-account-360/contacts-panel";
import { TierPanel } from "@/components/dealer-account-360/tier-panel";
import { PerformancePane } from "@/components/dealer-account-360/performance-pane";
import { CompetitivePositionPane } from "@/components/dealer-account-360/competitive-position-pane";
import { ActivityTimeline } from "@/components/dealer-account-360/activity-timeline";
import {
  getActivityTimeline,
  getCompetitivePosition,
  getContactsByPersona,
  getContentAssetOptions,
  getPerformanceTrend,
  getRooftopHeader,
  getTierPanel,
} from "@/lib/modules/dealer-account-360/queries";

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

  const [contactGroups, tierPanel, performance, competitive, timeline, contentAssets] = await Promise.all([
    getContactsByPersona(id),
    getTierPanel(id),
    getPerformanceTrend(id),
    getCompetitivePosition(id),
    getActivityTimeline(id),
    getContentAssetOptions(),
  ]);

  const flatContacts = contactGroups.flatMap((g) =>
    g.contacts.map((c) => ({ id: c.id, name: `${c.firstName} ${c.lastName}`, personaType: c.personaType }))
  );

  return (
    <div className="space-y-6">
      <AccountHeader header={header} />
      <AccountActions rooftopId={id} contacts={flatContacts} contentAssets={contentAssets} />
      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-6">
          <PerformancePane series={performance} />
          <CompetitivePositionPane rows={competitive} />
          <ActivityTimeline items={timeline} />
        </div>
        <div className="space-y-6">
          <TierPanel data={tierPanel} />
          <ContactsPanel groups={contactGroups} />
        </div>
      </div>
    </div>
  );
}
