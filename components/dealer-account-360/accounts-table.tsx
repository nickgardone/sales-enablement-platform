"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { RooftopListRow } from "@/lib/modules/dealer-account-360/types";

type SortKey = "name" | "tier" | "health" | "lastInteraction";

export function AccountsTable({ rows }: { rows: RooftopListRow[] }) {
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matched = q
      ? rows.filter(
          (r) =>
            r.name.toLowerCase().includes(q) ||
            r.dealerGroupName.toLowerCase().includes(q) ||
            r.assignedAssociateName?.toLowerCase().includes(q) ||
            r.region.toLowerCase().includes(q)
        )
      : rows;

    const sorted = [...matched].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "name") cmp = a.name.localeCompare(b.name);
      else if (sortKey === "tier") cmp = (a.currentTier ?? "").localeCompare(b.currentTier ?? "");
      else if (sortKey === "health") cmp = (a.relationshipHealth ?? -1) - (b.relationshipHealth ?? -1);
      else if (sortKey === "lastInteraction") cmp = (a.lastInteractionAt ?? "").localeCompare(b.lastInteractionAt ?? "");
      return sortDir === "asc" ? cmp : -cmp;
    });
    return sorted;
  }, [rows, query, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-4">
        <Input
          placeholder="Search by rooftop, dealer group, associate, or region..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="h-9 max-w-sm"
        />
        <p className="text-sm text-muted-foreground">
          {filtered.length} of {rows.length} accounts
        </p>
      </div>
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <SortableHead label="Rooftop" active={sortKey === "name"} dir={sortDir} onClick={() => toggleSort("name")} />
              <TableHead>Dealer Group</TableHead>
              <TableHead>Associate</TableHead>
              <SortableHead label="Tier" active={sortKey === "tier"} dir={sortDir} onClick={() => toggleSort("tier")} />
              <SortableHead label="Health" active={sortKey === "health"} dir={sortDir} onClick={() => toggleSort("health")} />
              <SortableHead
                label="Last Interaction"
                active={sortKey === "lastInteraction"}
                dir={sortDir}
                onClick={() => toggleSort("lastInteraction")}
              />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((r) => (
              <TableRow key={r.id} className="cursor-pointer">
                <TableCell className="font-medium">
                  <Link href={`/accounts/${r.id}`} className="hover:underline">
                    {r.name}
                  </Link>
                  <div className="text-xs text-muted-foreground">
                    {r.region} &middot; {r.franchiseType === "FRANCHISE" ? r.oemBrand ?? "Franchise" : "Independent"}
                  </div>
                </TableCell>
                <TableCell>{r.dealerGroupName}</TableCell>
                <TableCell>{r.assignedAssociateName ?? "Unassigned"}</TableCell>
                <TableCell>
                  {r.currentTier ? (
                    <div className="flex items-center gap-1.5">
                      <Badge variant="secondary">{r.currentTier}</Badge>
                      {r.downTierRisk && (
                        <Badge variant="destructive" className="text-[10px]">
                          At risk
                        </Badge>
                      )}
                    </div>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="tabular-nums">
                  {r.relationshipHealth !== null ? r.relationshipHealth.toFixed(0) : "—"}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {r.lastInteractionAt ? formatDistanceToNow(new Date(r.lastInteractionAt), { addSuffix: true }) : "No activity yet"}
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                  No accounts match “{query}”.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function SortableHead({
  label,
  active,
  dir,
  onClick,
}: {
  label: string;
  active: boolean;
  dir: "asc" | "desc";
  onClick: () => void;
}) {
  return (
    <TableHead>
      <button type="button" onClick={onClick} className="flex items-center gap-1 hover:text-foreground">
        {label}
        {active && <span className="text-[10px]">{dir === "asc" ? "▲" : "▼"}</span>}
      </button>
    </TableHead>
  );
}
