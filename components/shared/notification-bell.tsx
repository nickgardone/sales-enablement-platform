"use client";

import { Bell } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

const SIGNAL_LABEL: Record<string, string> = {
  "tier.risk.detected": "Down-tier risk detected",
  "exception.submitted": "Exception submitted",
  "exception.decided": "Exception decided",
  "lead.sla.breached": "Lead SLA breached",
  "pitch.logged": "Pitch logged",
  "opportunity.stage.changed": "Opportunity stage changed",
  "crosssell.identified": "Cross-sell opportunity identified",
  "onboarding.blocked": "Onboarding blocked",
};

export type NotificationSignal = {
  id: string;
  type: string;
  emittedAt: string;
  sourceModule: string;
};

export function NotificationBell({ signals }: { signals: NotificationSignal[] }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
            <Bell className="size-4" />
            {signals.length > 0 && (
              <span className="absolute top-1 right-1 size-1.5 rounded-full bg-primary" />
            )}
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Recent activity</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {signals.length === 0 ? (
            <p className="px-2 py-3 text-sm text-muted-foreground">Nothing new right now.</p>
          ) : (
            <ul className="max-h-80 space-y-1 overflow-y-auto">
              {signals.map((signal) => (
                <li key={signal.id} className="flex flex-col gap-0.5 rounded-md px-2 py-1.5 text-sm hover:bg-accent">
                  <span className="font-medium">{SIGNAL_LABEL[signal.type] ?? signal.type}</span>
                  <span className="text-xs text-muted-foreground">
                    {signal.sourceModule} &middot; {formatDistanceToNow(new Date(signal.emittedAt), { addSuffix: true })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
