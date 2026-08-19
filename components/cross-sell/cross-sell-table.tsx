"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { updateCrossSellStatus } from "@/lib/modules/cross-sell/actions";
import type { CrossSellRow } from "@/lib/modules/cross-sell/types";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  OPEN: "outline",
  ACTIONED: "secondary",
  DISMISSED: "destructive",
};

export function CrossSellTable({ rows }: { rows: CrossSellRow[] }) {
  const [isPending, startTransition] = useTransition();

  function act(id: string, status: "DISMISSED" | "ACTIONED") {
    startTransition(async () => {
      try {
        await updateCrossSellStatus(id, status);
        toast.success(status === "ACTIONED" ? "Marked actioned." : "Dismissed.");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to update signal.");
      }
    });
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Rooftop</TableHead>
            <TableHead>Missing product</TableHead>
            <TableHead>Confidence</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Identified</TableHead>
            <TableHead>Associate</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.id}>
              <TableCell className="font-medium">
                <Link href={`/accounts/${r.rooftopId}`} className="hover:underline">
                  {r.rooftopName}
                </Link>
                <div className="text-xs text-muted-foreground">{r.dealerGroupName}</div>
              </TableCell>
              <TableCell>{r.missingProduct === "FINANCING" ? "Financing" : "Software"}</TableCell>
              <TableCell className="tabular-nums">{r.confidence !== null ? `${Math.round(r.confidence * 100)}%` : "—"}</TableCell>
              <TableCell>
                <Badge variant={STATUS_VARIANT[r.status]}>{r.status.toLowerCase()}</Badge>
              </TableCell>
              <TableCell className="text-muted-foreground">{formatDistanceToNow(new Date(r.identifiedAt), { addSuffix: true })}</TableCell>
              <TableCell>{r.assignedAssociateName ?? "Unassigned"}</TableCell>
              <TableCell>
                {r.status === "OPEN" ? (
                  <div className="flex gap-1.5">
                    <Button size="sm" variant="outline" onClick={() => act(r.id, "DISMISSED")} disabled={isPending}>
                      Dismiss
                    </Button>
                    <Button size="sm" onClick={() => act(r.id, "ACTIONED")} disabled={isPending}>
                      Mark actioned
                    </Button>
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground">—</span>
                )}
              </TableCell>
            </TableRow>
          ))}
          {rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                No cross-sell signals in scope.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
