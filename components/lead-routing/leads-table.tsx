"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { updateLeadStatus } from "@/lib/modules/lead-routing/actions";
import type { LeadListRow } from "@/lib/modules/lead-routing/types";

const STATUS_ITEMS = { ALL: "All statuses", NEW: "New", ROUTED: "Routed", IN_PROGRESS: "In progress", CONVERTED: "Converted", LOST: "Lost" };
const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  NEW: "outline",
  ROUTED: "outline",
  IN_PROGRESS: "secondary",
  CONVERTED: "secondary",
  LOST: "destructive",
};

export function LeadsTable({ rows }: { rows: LeadListRow[] }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("ALL");
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows
      .filter((r) => status === "ALL" || r.status === status)
      .filter((r) => !q || r.rooftopName.toLowerCase().includes(q) || r.consumerName.toLowerCase().includes(q) || r.dealerGroupName.toLowerCase().includes(q));
  }, [rows, query, status]);

  function act(leadId: string, next: "IN_PROGRESS" | "CONVERTED" | "LOST") {
    startTransition(async () => {
      try {
        await updateLeadStatus(leadId, next);
        toast.success("Lead updated.");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to update lead.");
      }
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Input placeholder="Search rooftop, dealer group, consumer..." value={query} onChange={(e) => setQuery(e.target.value)} className="h-9 w-72" />
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
              <TableHead>Consumer</TableHead>
              <TableHead>Product</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Routed to</TableHead>
              <TableHead>Age</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((l) => (
              <TableRow key={l.id}>
                <TableCell className="font-medium">
                  {l.rooftopName}
                  <div className="text-xs text-muted-foreground">{l.dealerGroupName}</div>
                </TableCell>
                <TableCell>
                  {l.consumerName}
                  <div className="text-xs text-muted-foreground">{l.source}</div>
                </TableCell>
                <TableCell>{l.productInterest === "FINANCING" ? "Financing" : "Software"}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5">
                    <Badge variant={STATUS_VARIANT[l.status]}>{l.status.replace(/_/g, " ").toLowerCase()}</Badge>
                    {l.isBreached && (
                      <Badge variant="destructive" className="text-[10px]">
                        SLA breached
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <span>{l.routedAssociateName ?? "Unassigned"}</span>
                    {l.ruleName && (
                      <Popover>
                        <PopoverTrigger render={<Button variant="ghost" size="sm" className="h-5 px-1 text-[10px]" />}>Why?</PopoverTrigger>
                        <PopoverContent className="w-64 text-xs">
                          <p className="font-medium">Matched routing rule</p>
                          <p className="mt-1 text-muted-foreground">{l.ruleName}</p>
                          {l.reasonCodes && (
                            <pre className="mt-2 overflow-x-auto rounded bg-muted p-2 text-[10px]">{JSON.stringify(l.reasonCodes, null, 2)}</pre>
                          )}
                        </PopoverContent>
                      </Popover>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">{formatDistanceToNow(new Date(l.receivedAt), { addSuffix: true })}</TableCell>
                <TableCell>
                  {l.status === "NEW" || l.status === "ROUTED" ? (
                    <Button size="sm" variant="outline" onClick={() => act(l.id, "IN_PROGRESS")} disabled={isPending}>
                      Start working
                    </Button>
                  ) : l.status === "IN_PROGRESS" ? (
                    <div className="flex gap-1.5">
                      <Button size="sm" variant="outline" onClick={() => act(l.id, "LOST")} disabled={isPending}>
                        Lost
                      </Button>
                      <Button size="sm" onClick={() => act(l.id, "CONVERTED")} disabled={isPending}>
                        Converted
                      </Button>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                  No leads match this filter.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
