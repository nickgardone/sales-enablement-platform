import { getModuleAccess } from "@/lib/platform/route-guard";
import { AccessRestricted } from "@/components/shared/access-restricted";
import { RaiseEscalationDialog } from "@/components/escalations/raise-escalation-dialog";
import { EscalationsList } from "@/components/escalations/escalations-list";
import { getEscalationsForUser, getRooftopOptionsForUser } from "@/lib/modules/escalations/queries";

export const dynamic = "force-dynamic";

export default async function Page() {
  const { user, allowed } = await getModuleAccess("escalations-disputes");
  if (!allowed) return <AccessRestricted moduleName="Escalations & Disputes" role={user.role} />;

  const [rows, rooftops] = await Promise.all([getEscalationsForUser(user), getRooftopOptionsForUser(user)]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Escalations & Disputes</h1>
          <p className="text-sm text-muted-foreground">
            {user.role === "SALES_LEADER" ? "Your team's territory" : "Your book"} — {rows.length} escalation{rows.length === 1 ? "" : "s"}.
          </p>
        </div>
        <RaiseEscalationDialog rooftops={rooftops} />
      </div>
      <EscalationsList rows={rows} />
    </div>
  );
}
