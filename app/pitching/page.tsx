import { getModuleAccess } from "@/lib/platform/route-guard";
import { AccessRestricted } from "@/components/shared/access-restricted";
import { GoalProgressCard } from "@/components/pitching/goal-progress-card";
import { PitchesTable } from "@/components/pitching/pitches-table";
import { LogPitchDialog } from "@/components/pitching/log-pitch-dialog";
import {
  getContactOptionsForUser,
  getPitchGoalProgress,
  getPitchesForUser,
  getRooftopOptionsForUser,
} from "@/lib/modules/pitching/queries";

export const dynamic = "force-dynamic";

export default async function Page() {
  const { user, allowed } = await getModuleAccess("pitching");
  if (!allowed) return <AccessRestricted moduleName="Pitching" role={user.role} />;

  const [rows, goals, rooftops, contacts] = await Promise.all([
    getPitchesForUser(user),
    getPitchGoalProgress(user),
    getRooftopOptionsForUser(user),
    getContactOptionsForUser(user),
  ]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Pitching</h1>
          <p className="text-sm text-muted-foreground">
            {user.role === "SALES_LEADER" ? "Your team's territory" : "Your book"} — {rows.length} pitches.
          </p>
        </div>
        <LogPitchDialog rooftops={rooftops} contacts={contacts} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <GoalProgressCard label="Your monthly goal" goal={goals.individual} />
        {user.role === "SALES_LEADER" && <GoalProgressCard label="Team monthly goal" goal={goals.team} />}
      </div>

      <PitchesTable rows={rows} />
    </div>
  );
}
