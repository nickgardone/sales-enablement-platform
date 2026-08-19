"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { raiseEscalation } from "@/lib/modules/escalations/actions";
import type { RooftopOption } from "@/lib/modules/escalations/types";

const CATEGORIES = ["Funding delay", "Rate dispute", "Software access issue", "Contract discrepancy", "Other"];

export function RaiseEscalationDialog({ rooftops }: { rooftops: RooftopOption[] }) {
  const [open, setOpen] = useState(false);
  const [rooftopId, setRooftopId] = useState(rooftops[0]?.id ?? "");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [description, setDescription] = useState("");
  const [isPending, startTransition] = useTransition();

  const rooftopItems = Object.fromEntries(rooftops.map((r) => [r.id, `${r.name} — ${r.dealerGroupName}`]));
  const categoryItems = Object.fromEntries(CATEGORIES.map((c) => [c, c]));

  function submit() {
    if (!rooftopId) {
      toast.error("Choose a rooftop.");
      return;
    }
    if (!description.trim()) {
      toast.error("Describe the issue.");
      return;
    }
    startTransition(async () => {
      try {
        await raiseEscalation({ rooftopId, category, description: description.trim() });
        toast.success("Escalation raised and routed for triage.");
        setDescription("");
        setOpen(false);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to raise escalation.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>Raise escalation</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Raise an escalation</DialogTitle>
          <DialogDescription>Routes to the escalation triage policy for follow-up.</DialogDescription>
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
            <Label>Category</Label>
            <Select items={categoryItems} value={category} onValueChange={(v) => typeof v === "string" && setCategory(v)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What happened?" />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={submit} disabled={isPending}>
            {isPending ? "Submitting..." : "Raise escalation"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
