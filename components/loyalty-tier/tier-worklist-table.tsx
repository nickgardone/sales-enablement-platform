"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatDealerVisibility } from "@/lib/platform/dealer-visibility";
import type { TierWorklistRow } from "@/lib/modules/loyalty-tier/types";

export function TierWorklistTable({ rows }: { rows: TierWorklistRow[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => r.rooftopName.toLowerCase().includes(q) || r.dealerGroupName.toLowerCase().includes(q));
  }, [rows, query]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <Input placeholder="Search rooftop, dealer group..." value={query} onChange={(e) => setQuery(e.target.value)} className="h-9 w-72" />
        <p className="text-sm text-muted-foreground">
          {filtered.length} of {rows.length}
        </p>
      </div>
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Rooftop</TableHead>
              <TableHead>Tier</TableHead>
              <TableHead>Threshold distance</TableHead>
              <TableHead>Dollar impact</TableHead>
              <TableHead>Last evaluated</TableHead>
              <TableHead>Why</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((r) => (
              <TableRow key={r.rooftopId}>
                <TableCell className="font-medium">
                  <Link href={`/accounts/${r.rooftopId}`} className="hover:underline">
                    {r.rooftopName}
                  </Link>
                  <div className="text-xs text-muted-foreground">{r.dealerGroupName}</div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5">
                    <Badge variant="secondary">
                      {r.tierName} &middot; L{r.tierLevel}
                    </Badge>
                    {r.downTierRisk && (
                      <Badge variant="destructive" className="text-[10px]">
                        At risk
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="tabular-nums">
                  {r.thresholdDistance >= 0 ? "+" : ""}
                  {Math.round(r.thresholdDistance).toLocaleString()}
                </TableCell>
                <TableCell className="tabular-nums">
                  {r.estimatedDollarImpact !== null ? `$${Math.round(r.estimatedDollarImpact).toLocaleString()}` : "—"}
                </TableCell>
                <TableCell className="text-muted-foreground">{formatDistanceToNow(new Date(r.evaluatedAt), { addSuffix: true })}</TableCell>
                <TableCell>
                  <Popover>
                    <PopoverTrigger render={<Button variant="ghost" size="sm" className="h-6 text-xs" />}>Why?</PopoverTrigger>
                    <PopoverContent className="w-64 text-xs">
                      <p className="font-medium">Reason codes</p>
                      <ul className="mt-1 list-disc space-y-0.5 pl-4 text-muted-foreground">
                        {r.reasonCodes.map((code) => (
                          <li key={code}>{code.replace(/_/g, " ").toLowerCase()}</li>
                        ))}
                      </ul>
                      {r.dealerVisibleAt && <p className="mt-2 text-muted-foreground">{formatDealerVisibility(r.dealerVisibleAt)}</p>}
                    </PopoverContent>
                  </Popover>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                  No accounts match this search.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
