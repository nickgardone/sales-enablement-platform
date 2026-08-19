import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { ActionSummary } from "@/lib/services/action-registry";

// Read-only viewer proving the Phase 9 action-registry contract is live (spec
// Section 11's "hook for later"): every module's state-changing operations,
// registered as typed, entitlement-checked, Zod-validated functions. Nothing
// invokes these yet — the assistant only reads and drafts in v1 — but the
// registry existing and being inspectable here is the point: agentic mode
// later is handing the assistant this same list as tools.
export function ActionRegistryTab({ actions }: { actions: ActionSummary[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Action Registry</CardTitle>
        <p className="text-sm text-muted-foreground">
          {actions.length} registered action{actions.length === 1 ? "" : "s"} across every module — the typed, entitlement-checked, auditable surface
          the assistant will be handed as tools once it moves from mock templates to a real model call.
        </p>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Action ID</TableHead>
              <TableHead>Module</TableHead>
              <TableHead>Capability</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Input shape</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {actions.map((a) => (
              <TableRow key={a.id}>
                <TableCell className="font-mono text-xs font-medium">{a.id}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-[10px]">
                    {a.moduleId}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">{a.capability}</TableCell>
                <TableCell className="max-w-xs text-xs text-muted-foreground">{a.description}</TableCell>
                <TableCell className="max-w-sm font-mono text-[10px] text-muted-foreground">{a.inputShape}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
