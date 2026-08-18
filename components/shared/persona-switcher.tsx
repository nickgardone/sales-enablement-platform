"use client";

import { useTransition } from "react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { switchPersona } from "@/lib/platform/actions";
import type { SwitchablePersona } from "@/lib/platform/current-user";

const ROLE_LABEL: Record<SwitchablePersona["role"], string> = {
  SALES_ASSOCIATE: "Associates",
  SALES_LEADER: "Leaders",
  ADMIN: "Admin",
};

export function PersonaSwitcher({
  currentUserId,
  personas,
}: {
  currentUserId: string;
  personas: SwitchablePersona[];
}) {
  const [isPending, startTransition] = useTransition();

  const grouped = personas.reduce<Record<string, SwitchablePersona[]>>((acc, p) => {
    (acc[p.role] ??= []).push(p);
    return acc;
  }, {});

  // `items` lets SelectValue resolve the trigger's display label for the
  // current value — without it, the trigger shows the raw value (user id).
  const items = Object.fromEntries(personas.map((p) => [p.id, p.name]));

  return (
    <Select
      items={items}
      value={currentUserId}
      onValueChange={(value) => {
        if (typeof value !== "string") return;
        startTransition(() => {
          switchPersona(value);
        });
      }}
      disabled={isPending}
    >
      <SelectTrigger className="w-56" aria-label="Switch persona">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {(Object.keys(ROLE_LABEL) as SwitchablePersona["role"][]).map((role) =>
          grouped[role]?.length ? (
            <SelectGroup key={role}>
              <SelectLabel>{ROLE_LABEL[role]}</SelectLabel>
              {grouped[role].map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectGroup>
          ) : null
        )}
      </SelectContent>
    </Select>
  );
}
