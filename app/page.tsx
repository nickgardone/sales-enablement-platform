import { formatDistanceToNow } from "date-fns";
import { getCurrentUser } from "@/lib/platform/current-user";
import { can, scopeFilter } from "@/lib/platform/entitlements";
import { getNavForUser } from "@/lib/platform/registry";
import { getRecentAuditEvents } from "@/lib/services/audit";
import { prisma } from "@/lib/prisma";
import { StatCard } from "@/components/shared/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

const ROLE_COPY: Record<string, string> = {
  SALES_ASSOCIATE: "Here's what's happening in your book.",
  SALES_LEADER: "Here's what's happening across your team's territory.",
  ADMIN: "Platform-wide configuration and activity — no individual deal detail.",
};

export default async function DashboardPage() {
  const user = await getCurrentUser();

  const [nav, recentAudit, hasAccountAccess] = await Promise.all([
    getNavForUser(user),
    getRecentAuditEvents(8),
    can(user, "dealer-account-360"),
  ]);

  let rooftopCount: number | null = null;
  let downTierCount: number | null = null;
  if (hasAccountAccess) {
    const rooftopWhere = await scopeFilter(user, "Rooftop", "dealer-account-360");
    [rooftopCount, downTierCount] = await Promise.all([
      prisma.rooftop.count({ where: rooftopWhere }),
      prisma.tierEvaluation.count({ where: { downTierRisk: true, rooftop: rooftopWhere } }),
    ]);
  }

  const [contentCount, dealerGroupCount] = await Promise.all([
    prisma.contentAsset.count(),
    prisma.dealerGroup.count(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Welcome, {user.name.split(" ")[0]}</h1>
        <p className="text-sm text-muted-foreground">{ROLE_COPY[user.role]}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {rooftopCount !== null ? (
          <StatCard
            label={user.role === "SALES_LEADER" ? "Rooftops in your territory" : "Rooftops in your book"}
            value={rooftopCount}
          />
        ) : (
          <StatCard label="Dealer groups (platform-wide)" value={dealerGroupCount} />
        )}
        {downTierCount !== null && (
          <StatCard label="Down-tier risk in scope" value={downTierCount} tone="warning" />
        )}
        <StatCard label="Content assets" value={contentCount} />
        <StatCard label="Modules entitled" value={nav.length} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent activity</CardTitle>
        </CardHeader>
        <CardContent>
          {recentAudit.length === 0 ? (
            <p className="text-sm text-muted-foreground">No activity yet.</p>
          ) : (
            <ul className="space-y-3">
              {recentAudit.map((event) => (
                <li key={event.id} className="flex items-center justify-between gap-3 border-b pb-3 last:border-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{event.action}</p>
                    <p className="text-xs text-muted-foreground">
                      {event.actor.name} &middot; {event.entityType}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {event.complianceRelevant && <Badge variant="destructive">Compliance</Badge>}
                    <time className="text-xs text-nowrap text-muted-foreground" dateTime={event.timestamp.toISOString()}>
                      {formatDistanceToNow(event.timestamp, { addSuffix: true })}
                    </time>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
