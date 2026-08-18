import { formatDistanceToNow } from "date-fns";
import { getAuditTrail } from "@/lib/services/audit";
import { Badge } from "@/components/ui/badge";

// Shared audit viewer any module can drop in, scoped to one entity (spec Section 7).
export async function AuditTrail({
  entityType,
  entityId,
  limit = 25,
}: {
  entityType: string;
  entityId: string;
  limit?: number;
}) {
  const events = await getAuditTrail(entityType, entityId, limit);

  if (events.length === 0) {
    return <p className="text-sm text-muted-foreground">No audit history yet.</p>;
  }

  return (
    <ul className="space-y-3">
      {events.map((event) => (
        <li key={event.id} className="flex items-start justify-between gap-3 border-b pb-3 last:border-0 last:pb-0">
          <div className="min-w-0">
            <p className="text-sm font-medium">{event.action}</p>
            <p className="text-xs text-muted-foreground">
              {event.actor.name} &middot; {event.actor.role.replace("_", " ")}
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
  );
}
