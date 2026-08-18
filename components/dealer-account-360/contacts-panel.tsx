import { formatDistanceToNow } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { PersonaContactGroup } from "@/lib/modules/dealer-account-360/types";

function personaLabel(persona: string) {
  return persona
    .split("_")
    .map((w) => w[0] + w.slice(1).toLowerCase())
    .join(" ");
}

export function ContactsPanel({ groups }: { groups: PersonaContactGroup[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Contacts</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {groups.length === 0 && <p className="text-sm text-muted-foreground">No contacts on file.</p>}
        {groups.map((group) => (
          <div key={group.persona} className="space-y-2">
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{personaLabel(group.persona)}</p>
            <div className="space-y-2">
              {group.contacts.map((c) => (
                <div key={c.id} className="rounded-lg border p-2.5 text-sm">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">
                      {c.firstName} {c.lastName}
                      {c.isGroupLevel && (
                        <Badge variant="outline" className="ml-1.5 text-[10px]">
                          Group-level
                        </Badge>
                      )}
                    </p>
                  </div>
                  {(c.email || c.phone) && (
                    <p className="text-xs text-muted-foreground">{[c.email, c.phone].filter(Boolean).join(" · ")}</p>
                  )}
                  <p className="mt-1 text-xs text-muted-foreground">
                    {c.lastInteractionAt
                      ? `Last touch ${formatDistanceToNow(new Date(c.lastInteractionAt), { addSuffix: true })}`
                      : "No logged interactions yet"}
                  </p>
                  {c.talkTrack && <p className="mt-1 text-xs text-muted-foreground">Talk track: {c.talkTrack}</p>}
                </div>
              ))}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
