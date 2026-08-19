import { getModuleAccess } from "@/lib/platform/route-guard";
import { AccessRestricted } from "@/components/shared/access-restricted";
import { OnboardingCaseCard } from "@/components/dealer-onboarding/onboarding-case-card";
import { getOnboardingCasesForUser } from "@/lib/modules/dealer-onboarding/queries";

export const dynamic = "force-dynamic";

export default async function Page() {
  const { user, allowed } = await getModuleAccess("dealer-onboarding");
  if (!allowed) return <AccessRestricted moduleName="Dealer Onboarding" role={user.role} />;

  const rows = await getOnboardingCasesForUser(user);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dealer Onboarding</h1>
        <p className="text-sm text-muted-foreground">
          {user.role === "SALES_LEADER" ? "Your team's territory" : "Your book"} — {rows.length} case{rows.length === 1 ? "" : "s"}.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((r) => (
          <OnboardingCaseCard key={r.id} row={r} />
        ))}
        {rows.length === 0 && <p className="col-span-full py-8 text-center text-sm text-muted-foreground">No onboarding cases in scope.</p>}
      </div>
    </div>
  );
}
