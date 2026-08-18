import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EntitlementCell } from "./entitlement-cell";
import type { UserRole, DataScope } from "@/lib/platform/types";

export type EntitlementMatrixRow = {
  moduleId: string;
  moduleName: string;
  scopes: Record<UserRole, DataScope>;
};

export function EntitlementsTab({ rows }: { rows: EntitlementMatrixRow[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Module</TableHead>
          <TableHead>Associate</TableHead>
          <TableHead>Leader</TableHead>
          <TableHead>Admin</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.moduleId}>
            <TableCell className="font-medium">{row.moduleName}</TableCell>
            <TableCell>
              <EntitlementCell moduleId={row.moduleId} role="SALES_ASSOCIATE" initialScope={row.scopes.SALES_ASSOCIATE} />
            </TableCell>
            <TableCell>
              <EntitlementCell moduleId={row.moduleId} role="SALES_LEADER" initialScope={row.scopes.SALES_LEADER} />
            </TableCell>
            <TableCell>
              <EntitlementCell moduleId={row.moduleId} role="ADMIN" initialScope={row.scopes.ADMIN} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
