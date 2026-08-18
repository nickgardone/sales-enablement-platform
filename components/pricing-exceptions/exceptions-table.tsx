"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ExceptionListRow } from "@/lib/modules/pricing-exceptions/types";

const STATUS_ITEMS = { ALL: "All statuses", PENDING: "Pending", APPROVED: "Approved", REJECTED: "Rejected" };
const REQUEST_TYPE_LABEL: Record<string, string> = {
  RATE_EXCEPTION: "Rate exception",
  PROGRAM_TIER_CHANGE: "Program tier change",
  TERM_EXTENSION: "Term extension",
  FEE_WAIVER: "Fee waiver",
};

function StatusBadge({ status, isBreached }: { status: ExceptionListRow["status"]; isBreached: boolean }) {
  if (status === "APPROVED") return <Badge variant="secondary">Approved</Badge>;
  if (status === "REJECTED") return <Badge variant="destructive">Rejected</Badge>;
  return isBreached ? <Badge variant="destructive">SLA breached</Badge> : <Badge variant="outline">Pending</Badge>;
}

export function ExceptionsTable({ rows }: { rows: ExceptionListRow[] }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("ALL");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows
      .filter((r) => status === "ALL" || r.status === status)
      .filter(
        (r) =>
          !q ||
          r.rooftopName.toLowerCase().includes(q) ||
          r.dealerGroupName.toLowerCase().includes(q) ||
          r.requestedByName.toLowerCase().includes(q)
      )
      .sort((a, b) => (a.isBreached === b.isBreached ? b.submittedAt.localeCompare(a.submittedAt) : a.isBreached ? -1 : 1));
  }, [rows, query, status]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Input placeholder="Search rooftop, dealer group, requester..." value={query} onChange={(e) => setQuery(e.target.value)} className="h-9 w-72" />
          <Select items={STATUS_ITEMS} value={status} onValueChange={(v) => typeof v === "string" && setStatus(v)}>
            <SelectTrigger size="sm" className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(STATUS_ITEMS).map(([k, label]) => (
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
              <TableHead>Type</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Policy</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Requested by</TableHead>
              <TableHead>Submitted</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">
                  <Link href={`/exceptions/${r.id}`} className="hover:underline">
                    {r.rooftopName}
                  </Link>
                  <div className="text-xs text-muted-foreground">{r.dealerGroupName}</div>
                </TableCell>
                <TableCell>{REQUEST_TYPE_LABEL[r.requestType] ?? r.requestType}</TableCell>
                <TableCell className="tabular-nums">{r.dollarAmount ? `$${r.dollarAmount.toLocaleString()}` : "—"}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{r.policyName}</TableCell>
                <TableCell>
                  <StatusBadge status={r.status} isBreached={r.isBreached} />
                </TableCell>
                <TableCell>{r.requestedByName}</TableCell>
                <TableCell className="text-muted-foreground">{formatDistanceToNow(new Date(r.submittedAt), { addSuffix: true })}</TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                  No exception requests match this filter.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
