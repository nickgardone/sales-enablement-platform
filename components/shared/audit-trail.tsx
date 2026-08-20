import { formatDistanceToNow } from "date-fns";
import { getAuditTrail, type AuditTrailEntityRef } from "@/lib/services/audit";
import { Badge } from "@/components/ui/badge";

// Shared audit viewer any module can drop in, scoped to one or more related
// entities (spec Section 7) — pass every entity ref that belongs to the
// thing you're viewing (e.g. a rooftop's interactions, pitches, exceptions...)
// since audit events are recorded per-entity, not duplicated onto ancestors.
export async function AuditTrail({ entities, limit = 25 }: { entities: AuditTrailEntityRef[]; limit?: number }) {
  const events = await getAuditTrail(entities, limit);

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
