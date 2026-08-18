"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { logPitch } from "@/lib/modules/pitching/actions";
import type { ContactOption, RooftopOption } from "@/lib/modules/pitching/types";

const PRODUCT_TYPES = { FINANCING: "Financing", SOFTWARE: "Software" };
const OUTCOMES = { POSITIVE: "Positive", NEUTRAL: "Neutral", DECLINED: "Declined", FOLLOW_UP_NEEDED: "Follow-up needed" };

export function LogPitchDialog({ rooftops, contacts }: { rooftops: RooftopOption[]; contacts: ContactOption[] }) {
  const [open, setOpen] = useState(false);
  const [rooftopId, setRooftopId] = useState(rooftops[0]?.id ?? "");
  const [contactId, setContactId] = useState("");
  const [productPitched, setProductPitched] = useState<keyof typeof PRODUCT_TYPES>("FINANCING");
  const [outcome, setOutcome] = useState<keyof typeof OUTCOMES>("POSITIVE");
  const [objection, setObjection] = useState("");
  const [isPending, startTransition] = useTransition();

  const rooftopContacts = useMemo(() => contacts.filter((c) => c.rooftopId === rooftopId), [contacts, rooftopId]);
  const rooftopItems = Object.fromEntries(rooftops.map((r) => [r.id, `${r.name} — ${r.dealerGroupName}`]));
  const contactItems = Object.fromEntries(rooftopContacts.map((c) => [c.id, c.name]));

  function submit() {
    if (!contactId) {
      toast.error("A pitch needs a contact.");
      return;
    }
    startTransition(async () => {
      try {
        await logPitch({ rooftopId, contactId, productPitched, outcome, objection: objection.trim() || null });
        toast.success("Pitch logged.");
        setObjection("");
        setOpen(false);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to log pitch.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>Log pitch</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Log a pitch</DialogTitle>
          <DialogDescription>Records a product pitch and its outcome.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Rooftop</Label>
            <Select
              items={rooftopItems}
              value={rooftopId}
              onValueChange={(v) => {
                if (typeof v !== "string") return;
                setRooftopId(v);
                setContactId("");
              }}
            >
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
            <Label>Contact</Label>
            <Select items={contactItems} value={contactId} onValueChange={(v) => typeof v === "string" && setContactId(v)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {rooftopContacts.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Product</Label>
            <Select
              items={PRODUCT_TYPES}
              value={productPitched}
              onValueChange={(v) => typeof v === "string" && setProductPitched(v as typeof productPitched)}
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
            <Label>Outcome</Label>
            <Select items={OUTCOMES} value={outcome} onValueChange={(v) => typeof v === "string" && setOutcome(v as typeof outcome)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(OUTCOMES).map(([k, label]) => (
                  <SelectItem key={k} value={k}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Objection (optional)</Label>
            <Textarea value={objection} onChange={(e) => setObjection(e.target.value)} placeholder="Any pushback raised?" />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={submit} disabled={isPending}>
            {isPending ? "Logging..." : "Log pitch"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
