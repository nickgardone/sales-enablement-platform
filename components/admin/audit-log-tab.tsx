"use client";

import { useMemo, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export type AuditLogRow = {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  actorName: string;
  actorRole: string;
  complianceRelevant: boolean;
  timestamp: string;
};

export function AuditLogTab({ events }: { events: AuditLogRow[] }) {
  const [complianceOnly, setComplianceOnly] = useState(false);

  const visible = useMemo(
    () => (complianceOnly ? events.filter((e) => e.complianceRelevant) : events),
    [events, complianceOnly]
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Most recent {events.length} events, newest first.</p>
        <div className="flex items-center gap-2">
          <Label htmlFor="compliance-only" className="text-xs text-muted-foreground">
            Compliance-relevant only
          </Label>
          <Switch id="compliance-only" checked={complianceOnly} onCheckedChange={(c) => setComplianceOnly(Boolean(c))} />
        </div>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Action</TableHead>
            <TableHead>Entity</TableHead>
            <TableHead>Actor</TableHead>
            <TableHead>Flags</TableHead>
            <TableHead className="text-right">When</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {visible.map((e) => (
            <TableRow key={e.id}>
              <TableCell className="font-medium">{e.action}</TableCell>
              <TableCell className="text-muted-foreground">
                {e.entityType} &middot; <span className="font-mono text-xs">{e.entityId.slice(0, 10)}</span>
              </TableCell>
              <TableCell>
                {e.actorName} <span className="text-xs text-muted-foreground">({e.actorRole.replace("_", " ")})</span>
              </TableCell>
              <TableCell>{e.complianceRelevant && <Badge variant="destructive">Compliance</Badge>}</TableCell>
              <TableCell className="text-right text-xs text-nowrap text-muted-foreground">
                {formatDistanceToNow(new Date(e.timestamp), { addSuffix: true })}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
