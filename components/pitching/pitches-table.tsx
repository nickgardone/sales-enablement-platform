"use client";

import { useMemo, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { PitchListRow } from "@/lib/modules/pitching/types";

const OUTCOME_VARIANT: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  POSITIVE: "secondary",
  NEUTRAL: "outline",
  DECLINED: "destructive",
  FOLLOW_UP_NEEDED: "outline",
};

export function PitchesTable({ rows }: { rows: PitchListRow[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.rooftopName.toLowerCase().includes(q) ||
        r.dealerGroupName.toLowerCase().includes(q) ||
        r.contactName.toLowerCase().includes(q) ||
        r.associateName.toLowerCase().includes(q)
    );
  }, [rows, query]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <Input placeholder="Search rooftop, contact, associate..." value={query} onChange={(e) => setQuery(e.target.value)} className="h-9 w-72" />
        <p className="text-sm text-muted-foreground">
          {filtered.length} of {rows.length}
        </p>
      </div>
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Rooftop</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Product</TableHead>
              <TableHead>Outcome</TableHead>
              <TableHead>Associate</TableHead>
              <TableHead>When</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">
                  {p.rooftopName}
                  <div className="text-xs text-muted-foreground">{p.dealerGroupName}</div>
                </TableCell>
                <TableCell>{p.contactName}</TableCell>
                <TableCell>{p.productPitched === "FINANCING" ? "Financing" : "Software"}</TableCell>
                <TableCell>
                  <Badge variant={OUTCOME_VARIANT[p.outcome]}>{p.outcome.replace(/_/g, " ").toLowerCase()}</Badge>
                  {p.objection && <p className="mt-1 text-xs text-muted-foreground">{p.objection}</p>}
                </TableCell>
                <TableCell>{p.associateName}</TableCell>
                <TableCell className="text-muted-foreground">{formatDistanceToNow(new Date(p.occurredAt), { addSuffix: true })}</TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                  No pitches match this search.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
