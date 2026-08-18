"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { updateEntitlement } from "@/lib/platform/admin-actions";
import type { UserRole, DataScope } from "@/lib/platform/types";

const SCOPE_ITEMS = { OWN: "Own", TEAM: "Team", GLOBAL: "Global", NONE: "None" };

export function EntitlementCell({
  moduleId,
  role,
  initialScope,
}: {
  moduleId: string;
  role: UserRole;
  initialScope: DataScope;
}) {
  const [scope, setScope] = useState<DataScope>(initialScope);
  const [isPending, startTransition] = useTransition();

  return (
    <Select
      items={SCOPE_ITEMS}
      value={scope}
      disabled={isPending}
      onValueChange={(value) => {
        if (typeof value !== "string") return;
        const next = value as DataScope;
        const prev = scope;
        setScope(next);
        startTransition(async () => {
          try {
            await updateEntitlement(role, moduleId, next);
          } catch (e) {
            setScope(prev);
            toast.error(e instanceof Error ? e.message : "Failed to update entitlement.");
          }
        });
      }}
    >
      <SelectTrigger size="sm" className="w-24">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {Object.keys(SCOPE_ITEMS).map((s) => (
          <SelectItem key={s} value={s}>
            {SCOPE_ITEMS[s as DataScope]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
