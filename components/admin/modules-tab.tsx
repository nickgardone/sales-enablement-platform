import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ModuleToggleCell } from "./module-toggle-cell";

export type ModuleManifestRow = {
  moduleId: string;
  name: string;
  enabledAssociate: boolean;
  enabledLeader: boolean;
  enabledAdmin: boolean;
};

export function ModulesTab({ rows }: { rows: ModuleManifestRow[] }) {
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
            <TableCell className="font-medium">{row.name}</TableCell>
            <TableCell>
              <ModuleToggleCell moduleId={row.moduleId} role="SALES_ASSOCIATE" initialEnabled={row.enabledAssociate} />
            </TableCell>
            <TableCell>
              <ModuleToggleCell moduleId={row.moduleId} role="SALES_LEADER" initialEnabled={row.enabledLeader} />
            </TableCell>
            <TableCell>
              <ModuleToggleCell moduleId={row.moduleId} role="ADMIN" initialEnabled={row.enabledAdmin} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
