"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createOpportunity } from "@/lib/modules/closing-deals/actions";
import type { RooftopOption } from "@/lib/modules/closing-deals/types";

const PRODUCT_TYPES = { FINANCING: "Financing", SOFTWARE: "Software" };

export function CreateOpportunityDialog({ rooftops }: { rooftops: RooftopOption[] }) {
  const [open, setOpen] = useState(false);
  const [rooftopId, setRooftopId] = useState(rooftops[0]?.id ?? "");
  const [productType, setProductType] = useState<keyof typeof PRODUCT_TYPES>("FINANCING");
  const [expectedValue, setExpectedValue] = useState("");
  const [closeDate, setCloseDate] = useState("");
  const [isPending, startTransition] = useTransition();

  const rooftopItems = Object.fromEntries(rooftops.map((r) => [r.id, `${r.name} — ${r.dealerGroupName}`]));

  function submit() {
    const value = Number(expectedValue);
    if (!rooftopId) {
      toast.error("Choose a rooftop.");
      return;
    }
    if (!value || value <= 0) {
      toast.error("Enter an expected value.");
      return;
    }
    if (!closeDate) {
      toast.error("Pick an expected close date.");
      return;
    }
    startTransition(async () => {
      try {
        await createOpportunity({ rooftopId, productType, expectedValue: value, closeDate });
        toast.success("Opportunity created.");
        setExpectedValue("");
        setCloseDate("");
        setOpen(false);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to create opportunity.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>New opportunity</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create an opportunity</DialogTitle>
          <DialogDescription>Opens a new deal in Prospecting.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Rooftop</Label>
            <Select items={rooftopItems} value={rooftopId} onValueChange={(v) => typeof v === "string" && setRooftopId(v)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {rooftops.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.name} — {r.dealerGroupName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Product</Label>
            <Select
              items={PRODUCT_TYPES}
              value={productType}
              onValueChange={(v) => typeof v === "string" && setProductType(v as typeof productType)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(PRODUCT_TYPES).map(([k, label]) => (
                  <SelectItem key={k} value={k}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Expected value ($)</Label>
            <Input type="number" min="0" value={expectedValue} onChange={(e) => setExpectedValue(e.target.value)} placeholder="35000" />
          </div>
          <div className="space-y-1">
            <Label>Expected close date</Label>
            <Input type="date" value={closeDate} onChange={(e) => setCloseDate(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={submit} disabled={isPending}>
            {isPending ? "Creating..." : "Create opportunity"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
