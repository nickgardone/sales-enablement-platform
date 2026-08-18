import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RoutingRuleRow, type RoutingRuleData } from "./routing-rule-row";

export function RoutingRulesTab({ rules }: { rules: RoutingRuleData[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Rule</TableHead>
          <TableHead>Target associate</TableHead>
          <TableHead>Priority</TableHead>
          <TableHead>Criteria</TableHead>
          <TableHead>Active</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rules.map((rule) => (
          <RoutingRuleRow key={rule.id} rule={rule} />
        ))}
      </TableBody>
    </Table>
  );
}
