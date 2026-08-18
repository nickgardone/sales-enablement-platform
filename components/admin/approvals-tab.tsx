import { PolicyEditor, type PolicyRow } from "./policy-editor";
import { RoutingTester } from "./routing-tester";

export function ApprovalsTab({ policies }: { policies: PolicyRow[] }) {
  const byTrigger = policies.reduce<Record<string, PolicyRow[]>>((acc, p) => {
    (acc[p.triggerType] ??= []).push(p);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <RoutingTester />
      <div className="space-y-4">
        {Object.entries(byTrigger).map(([triggerType, rows]) => (
          <div key={triggerType} className="space-y-2">
            <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              {triggerType.replace(/_/g, " ")}
            </h3>
            <div className="space-y-2">
              {rows.map((policy) => (
                <PolicyEditor key={policy.id} policy={policy} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
