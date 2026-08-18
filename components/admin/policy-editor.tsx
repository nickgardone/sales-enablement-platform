"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { updateApprovalPolicy } from "@/lib/platform/admin-actions";

export type PolicyRow = {
  id: string;
  name: string;
  triggerType: string;
  minAmount: number | null;
  maxAmount: number | null;
  approverRoleChain: string[];
  slaHours: number;
  active: boolean;
};

export function PolicyEditor({ policy }: { policy: PolicyRow }) {
  const [minAmount, setMinAmount] = useState(policy.minAmount);
  const [maxAmount, setMaxAmount] = useState(policy.maxAmount);
  const [slaHours, setSlaHours] = useState(policy.slaHours);
  const [active, setActive] = useState(policy.active);
  const [isPending, startTransition] = useTransition();

  const dirty =
    minAmount !== policy.minAmount ||
    maxAmount !== policy.maxAmount ||
    slaHours !== policy.slaHours ||
    active !== policy.active;

  function save() {
    startTransition(async () => {
      try {
        await updateApprovalPolicy(policy.id, { minAmount, maxAmount, slaHours, active });
        toast.success(`Updated "${policy.name}"`);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to update policy.");
      }
    });
  }

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
        <div>
          <CardTitle className="text-sm font-medium">{policy.name}</CardTitle>
          <div className="mt-1.5 flex flex-wrap gap-1">
            {policy.approverRoleChain.map((role, i) => (
              <Badge key={role} variant="outline">
                {i + 1}. {role.replace("_", " ")}
              </Badge>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor={`active-${policy.id}`} className="text-xs text-muted-foreground">
            Active
          </Label>
          <Switch id={`active-${policy.id}`} checked={active} onCheckedChange={setActive} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="space-y-1">
            <Label htmlFor={`min-${policy.id}`} className="text-xs text-muted-foreground">
              Min amount ($)
            </Label>
            <Input
              id={`min-${policy.id}`}
              type="number"
              placeholder="No minimum"
              value={minAmount ?? ""}
              onChange={(e) => setMinAmount(e.target.value === "" ? null : Number(e.target.value))}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor={`max-${policy.id}`} className="text-xs text-muted-foreground">
              Max amount ($)
            </Label>
            <Input
              id={`max-${policy.id}`}
              type="number"
              placeholder="No maximum"
              value={maxAmount ?? ""}
              onChange={(e) => setMaxAmount(e.target.value === "" ? null : Number(e.target.value))}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor={`sla-${policy.id}`} className="text-xs text-muted-foreground">
              SLA (hours)
            </Label>
            <Input
              id={`sla-${policy.id}`}
              type="number"
              value={slaHours}
              onChange={(e) => setSlaHours(Number(e.target.value))}
            />
          </div>
          <div className="flex items-end">
            <Button size="sm" onClick={save} disabled={!dirty || isPending} className="w-full">
              {isPending ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
