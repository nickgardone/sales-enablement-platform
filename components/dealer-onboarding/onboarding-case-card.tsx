"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { toggleChecklistItem, submitOnboardingForApproval } from "@/lib/modules/dealer-onboarding/actions";
import type { OnboardingCaseRow } from "@/lib/modules/dealer-onboarding/types";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  OPEN: "outline",
  IN_PROGRESS: "secondary",
  BLOCKED: "destructive",
  COMPLETE: "secondary",
};

export function OnboardingCaseCard({ row }: { row: OnboardingCaseRow }) {
  const [isPending, startTransition] = useTransition();
  const editable = row.status !== "COMPLETE" && row.status !== "BLOCKED";

  function toggle(index: number) {
    startTransition(async () => {
      try {
        await toggleChecklistItem(row.id, index);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to update checklist.");
      }
    });
  }

  function submit() {
    startTransition(async () => {
      try {
        await submitOnboardingForApproval(row.id);
        toast.success("Submitted for approval.");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to submit.");
      }
    });
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-sm font-medium">
              <Link href={`/accounts/${row.rooftopId}`} className="hover:underline">
                {row.rooftopName}
              </Link>
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              {row.dealerGroupName} &middot; {row.associateName}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <Badge variant={STATUS_VARIANT[row.status]}>{row.status.replace(/_/g, " ").toLowerCase()}</Badge>
            {row.approvalStatus && (
              <Badge variant="outline" className="text-[10px]">
                Approval: {row.approvalStatus.toLowerCase()}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1.5">
          {row.checklist.map((item, i) => (
            <label key={item.label} className="flex items-center gap-2 text-sm">
              <Checkbox checked={item.done} disabled={!editable || isPending} onCheckedChange={() => toggle(i)} />
              <span className={item.done ? "text-muted-foreground line-through" : ""}>{item.label}</span>
            </label>
          ))}
        </div>
        {!row.approvalStatus && (
          <Button size="sm" onClick={submit} disabled={!editable || !row.allItemsDone || isPending}>
            {isPending ? "Submitting..." : "Submit for approval"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
