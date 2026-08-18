import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { CurrentUser } from "@/lib/platform/types";

const ROLE_LABEL: Record<CurrentUser["role"], string> = {
  SALES_ASSOCIATE: "Sales Associate",
  SALES_LEADER: "Sales Leader",
  ADMIN: "Admin",
};

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function PersonaBadge({ user }: { user: CurrentUser }) {
  return (
    <div className="flex items-center gap-2.5">
      <Avatar className="size-8">
        <AvatarFallback className="text-xs">{initials(user.name)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{user.name}</p>
        <p className="truncate text-xs text-muted-foreground">{ROLE_LABEL[user.role]}</p>
      </div>
    </div>
  );
}
