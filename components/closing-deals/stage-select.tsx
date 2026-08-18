"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { updateOpportunityStage } from "@/lib/modules/closing-deals/actions";
import type { DealStageOption } from "@/lib/modules/closing-deals/types";

export function StageSelect({
  opportunityId,
  currentStageId,
  stages,
}: {
  opportunityId: string;
  currentStageId: string;
  stages: DealStageOption[];
}) {
  const [stageId, setStageId] = useState(currentStageId);
  const [isPending, startTransition] = useTransition();

  // Funded is an underwriting outcome, not a sales-set stage — exclude it as a manual option.
  const selectable = stages.filter((s) => s.name !== "Funded" || s.id === currentStageId);
  const items = Object.fromEntries(selectable.map((s) => [s.id, s.name]));

  return (
    <Select
      items={items}
      value={stageId}
      disabled={isPending || stageId === stages.find((s) => s.name === "Funded")?.id}
      onValueChange={(v) => {
        if (typeof v !== "string") return;
        const prev = stageId;
        setStageId(v);
        startTransition(async () => {
          try {
            await updateOpportunityStage(opportunityId, v);
            toast.success("Stage updated.");
          } catch (e) {
            setStageId(prev);
            toast.error(e instanceof Error ? e.message : "Failed to update stage.");
          }
        });
      }}
    >
      <SelectTrigger className="w-56">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {selectable.map((s) => (
          <SelectItem key={s.id} value={s.id}>
            {s.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
