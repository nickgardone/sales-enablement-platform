"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { testApprovalRouting } from "@/lib/platform/admin-actions";
import type { PolicyMatch, PolicyLike } from "@/lib/services/approvals";

const TRIGGER_TYPES = ["EXCEPTION_REQUEST", "TIER_CHANGE", "ONBOARDING_CASE", "ESCALATION"];
const TRIGGER_TYPE_ITEMS = Object.fromEntries(TRIGGER_TYPES.map((t) => [t, t.replace(/_/g, " ")]));

export function RoutingTester() {
  const [triggerType, setTriggerType] = useState("EXCEPTION_REQUEST");
  const [amount, setAmount] = useState("5000");
  const [result, setResult] = useState<PolicyMatch<PolicyLike> | null | "unrun">("unrun");
  const [isPending, startTransition] = useTransition();

  function runTest() {
    startTransition(async () => {
      const parsedAmount = amount.trim() === "" ? null : Number(amount);
      const match = await testApprovalRouting(triggerType, parsedAmount);
      setResult(match);
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Test routing</CardTitle>
        <CardDescription>
          Proves policy edits change behavior live — pick a trigger type and amount, then re-run after editing a
          policy above.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Trigger type</Label>
            <Select
              items={TRIGGER_TYPE_ITEMS}
              value={triggerType}
              onValueChange={(v) => typeof v === "string" && setTriggerType(v)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TRIGGER_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t.replace(/_/g, " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="test-amount" className="text-xs text-muted-foreground">
              Amount ($)
            </Label>
            <Input id="test-amount" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div className="flex items-end">
            <Button size="sm" onClick={runTest} disabled={isPending} className="w-full">
              {isPending ? "Testing..." : "Test routing"}
            </Button>
          </div>
        </div>

        {result === "unrun" ? null : result === null ? (
          <p className="text-sm text-muted-foreground">No active policy matches this trigger type + amount.</p>
        ) : (
          <div className="space-y-2 rounded-md border p-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{result.policy.name}</span>
              <Badge variant="secondary">SLA {result.policy.slaHours}h</Badge>
            </div>
            <div className="flex flex-wrap gap-1">
              {(result.policy.approverRoleChain as string[]).map((role, i) => (
                <Badge key={role} variant="outline">
                  {i + 1}. {role.replace("_", " ")}
                </Badge>
              ))}
            </div>
            <pre className="overflow-x-auto rounded bg-muted p-2 text-xs">
              {JSON.stringify(result.reasonCodes, null, 2)}
            </pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
