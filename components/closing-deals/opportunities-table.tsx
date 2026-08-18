"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { OpportunityListRow } from "@/lib/modules/closing-deals/types";

export function OpportunitiesTable({ rows }: { rows: OpportunityListRow[] }) {
  const [query, setQuery] = useState("");
  const [stageFilter, setStageFilter] = useState("ALL");

  const stageItems = useMemo(() => {
    const items: Record<string, string> = { ALL: "All stages" };
    for (const r of rows) items[r.stageName] = r.stageName;
    return items;
  }, [rows]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows
      .filter((r) => stageFilter === "ALL" || r.stageName === stageFilter)
      .filter((r) => !q || r.rooftopName.toLowerCase().includes(q) || r.dealerGroupName.toLowerCase().includes(q) || r.associateName.toLowerCase().includes(q))
      .sort((a, b) => a.closeDate.localeCompare(b.closeDate));
  }, [rows, query, stageFilter]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Input placeholder="Search rooftop, dealer group, associate..." value={query} onChange={(e) => setQuery(e.target.value)} className="h-9 w-72" />
          <Select items={stageItems} value={stageFilter} onValueChange={(v) => typeof v === "string" && setStageFilter(v)}>
            <SelectTrigger size="sm" className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(stageItems).map(([k, label]) => (
                <SelectItem key={k} value={k}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <p className="text-sm text-muted-foreground">
          {filtered.length} of {rows.length}
        </p>
      </div>
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Rooftop</TableHead>
              <TableHead>Product</TableHead>
              <TableHead>Stage</TableHead>
              <TableHead>Stips</TableHead>
              <TableHead>Expected value</TableHead>
              <TableHead>Close date</TableHead>
              <TableHead>Associate</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((o) => (
              <TableRow key={o.id}>
                <TableCell className="font-medium">
                  <Link href={`/deals/${o.id}`} className="hover:underline">
                    {o.rooftopName}
                  </Link>
                  <div className="text-xs text-muted-foreground">{o.dealerGroupName}</div>
                </TableCell>
                <TableCell>{o.productType === "FINANCING" ? "Financing" : "Software"}</TableCell>
                <TableCell>
                  <Badge variant={o.isWon ? "secondary" : o.isClosed ? "destructive" : "outline"}>{o.stageName}</Badge>
                </TableCell>
                <TableCell>
                  {o.outstandingStipCount > 0 ? (
                    <Badge variant="destructive" className="text-[10px]">
                      {o.outstandingStipCount} outstanding
                    </Badge>
                  ) : o.applicationStatus ? (
                    <span className="text-xs text-muted-foreground">Clear</span>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="tabular-nums">${o.expectedValue.toLocaleString()}</TableCell>
                <TableCell className="text-muted-foreground">{new Date(o.closeDate).toLocaleDateString()}</TableCell>
                <TableCell>{o.associateName}</TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                  No opportunities match this filter.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
