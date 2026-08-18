import { formatDistanceToNow } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { ActivityTimelineItem, ActivityTimelineKind } from "@/lib/modules/dealer-account-360/types";

const KIND_LABEL: Record<ActivityTimelineKind, string> = {
  INTERACTION: "Interaction",
  PITCH: "Pitch",
  EXCEPTION_REQUEST: "Exception",
  ESCALATION: "Escalation",
  CONTENT_SHARE: "Content",
  TIER_EVALUATION: "Tier",
};

const KIND_VARIANT: Record<ActivityTimelineKind, "default" | "secondary" | "outline" | "destructive"> = {
  INTERACTION: "secondary",
  PITCH: "secondary",
  EXCEPTION_REQUEST: "outline",
  ESCALATION: "destructive",
  CONTENT_SHARE: "outline",
  TIER_EVALUATION: "default",
};

export function ActivityTimeline({ items }: { items: ActivityTimelineItem[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Activity</CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 && <p className="text-sm text-muted-foreground">No activity logged yet.</p>}
        <ol className="space-y-3">
          {items.map((item) => (
            <li key={`${item.kind}-${item.id}`} className="flex gap-3 text-sm">
              <Badge variant={KIND_VARIANT[item.kind]} className="mt-0.5 h-fit shrink-0 text-[10px]">
                {KIND_LABEL[item.kind]}
              </Badge>
              <div className="min-w-0 flex-1">
                <p className="truncate">{item.title}</p>
                {item.detail && <p className="truncate text-xs text-muted-foreground">{item.detail}</p>}
                <p className="text-xs text-muted-foreground">
                  {item.actorName ? `${item.actorName} · ` : ""}
                  {formatDistanceToNow(new Date(item.occurredAt), { addSuffix: true })}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}
