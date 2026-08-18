"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { TableCell, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";

import { updateRoutingRule } from "@/lib/platform/admin-actions";

export type RoutingRuleData = {
  id: string;
  name: string;
  priority: number;
  active: boolean;
  targetAssociateName: string;
  criteria: unknown;
};

export function RoutingRuleRow({ rule }: { rule: RoutingRuleData }) {
  const [priority, setPriority] = useState(rule.priority);
  const [active, setActive] = useState(rule.active);
  const [isPending, startTransition] = useTransition();

  function save(next: { priority: number; active: boolean }) {
    startTransition(async () => {
      try {
        await updateRoutingRule(rule.id, next);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to update routing rule.");
      }
    });
  }

  return (
    <TableRow>
      <TableCell className="font-medium">{rule.name}</TableCell>
      <TableCell>{rule.targetAssociateName}</TableCell>
      <TableCell>
        <Input
          type="number"
          className="w-20"
          value={priority}
          disabled={isPending}
          onChange={(e) => setPriority(Number(e.target.value))}
          onBlur={() => {
            if (priority !== rule.priority) save({ priority, active });
          }}
        />
      </TableCell>
      <TableCell>
        <Badge variant="outline" className="font-mono text-xs">
          {JSON.stringify(rule.criteria)}
        </Badge>
      </TableCell>
      <TableCell>
        <Switch
          checked={active}
          disabled={isPending}
          onCheckedChange={(checked) => {
            const value = Boolean(checked);
            setActive(value);
            save({ priority, active: value });
          }}
        />
      </TableCell>
    </TableRow>
  );
}
