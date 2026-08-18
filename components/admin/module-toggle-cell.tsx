"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { updateModuleEnabled } from "@/lib/platform/admin-actions";
import type { UserRole } from "@/lib/platform/types";

export function ModuleToggleCell({ moduleId, role, initialEnabled }: { moduleId: string; role: UserRole; initialEnabled: boolean }) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [isPending, startTransition] = useTransition();

  return (
    <Switch
      checked={enabled}
      disabled={isPending}
      onCheckedChange={(checked) => {
        const value = Boolean(checked);
        const prev = enabled;
        setEnabled(value);
        startTransition(async () => {
          try {
            await updateModuleEnabled(moduleId, role, value);
          } catch (e) {
            setEnabled(prev);
            toast.error(e instanceof Error ? e.message : "Failed to update module.");
          }
        });
      }}
    />
  );
}
