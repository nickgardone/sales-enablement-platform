import { ShieldOff } from "lucide-react";
import { EmptyState } from "./empty-state";
import type { CurrentUser } from "@/lib/platform/types";

const ROLE_LABEL: Record<CurrentUser["role"], string> = {
  SALES_ASSOCIATE: "the Sales Associate",
  SALES_LEADER: "the Sales Leader",
  ADMIN: "the Admin",
};

export function AccessRestricted({ moduleName, role }: { moduleName: string; role: CurrentUser["role"] }) {
  return (
    <EmptyState
      icon={<ShieldOff className="size-6 text-muted-foreground" />}
      title="Not part of this persona"
      description={`${moduleName} isn't entitled for ${ROLE_LABEL[role]} persona. Switch personas to see it.`}
    />
  );
}
