"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { previewExceptionRouting, submitExceptionRequest } from "@/lib/modules/pricing-exceptions/actions";
import { draftExceptionJustification } from "@/lib/services/assistant/actions";
import type { PolicyMatch, PolicyLike } from "@/lib/services/approvals";
import type { ContactOption, RooftopOption } from "@/lib/modules/pricing-exceptions/types";

const REQUEST_TYPES = {
  RATE_EXCEPTION: "Rate exception",
  PROGRAM_TIER_CHANGE: "Program tier change",
  TERM_EXTENSION: "Term extension",
  FEE_WAIVER: "Fee waiver",
};

export function IntakeDialog({ rooftops, contacts }: { rooftops: RooftopOption[]; contacts: ContactOption[] }) {
  const [open, setOpen] = useState(false);
  const [rooftopId, setRooftopId] = useState(rooftops[0]?.id ?? "");
  const [contactId, setContactId] = useState("");
  const [requestType, setRequestType] = useState<keyof typeof REQUEST_TYPES>("RATE_EXCEPTION");
  const [dollarAmount, setDollarAmount] = useState("");
  const [rationale, setRationale] = useState("");
  const [preview, setPreview] = useState<PolicyMatch<PolicyLike> | null | "unrun">("unrun");
  const [draftSources, setDraftSources] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();
  const [isPreviewing, startPreviewTransition] = useTransition();
  const [isDrafting, startDraftTransition] = useTransition();

  const rooftopContacts = useMemo(() => contacts.filter((c) => c.rooftopId === rooftopId), [contacts, rooftopId]);
  const rooftopItems = Object.fromEntries(rooftops.map((r) => [r.id, `${r.name} — ${r.dealerGroupName}`]));
  const contactItems: Record<string, string> = { "": "No specific contact" };
  for (const c of rooftopContacts) contactItems[c.id] = c.name;

  function refreshPreview(amountStr: string) {
    const amount = Number(amountStr);
    if (!amount || amount <= 0) {
      setPreview("unrun");
      return;
    }
    startPreviewTransition(async () => {
      const match = await previewExceptionRouting(amount);
      setPreview(match);
    });
  }

  function draftWithAssistant() {
    const amount = Number(dollarAmount);
    if (!rooftopId || !amount || amount <= 0) {
      toast.error("Choose a rooftop and dollar amount first.");
      return;
    }
    startDraftTransition(async () => {
      try {
        const res = await draftExceptionJustification({ rooftopId, requestType, dollarAmount: amount });
        setRationale(res.output);
        setDraftSources(res.citations.map((c) => c.label));
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to draft a justification.");
      }
    });
  }

  function submit() {
    const amount = Number(dollarAmount);
    if (!rooftopId) {
      toast.error("Choose a rooftop.");
      return;
    }
    if (!amount || amount <= 0) {
      toast.error("Enter a dollar amount.");
      return;
    }
    if (!rationale.trim()) {
      toast.error("A rationale is required.");
      return;
    }
    startTransition(async () => {
      try {
        await submitExceptionRequest({ rooftopId, contactId: contactId || null, requestType, dollarAmount: amount, rationale: rationale.trim() });
        toast.success("Exception request submitted for approval.");
        setDollarAmount("");
        setRationale("");
        setPreview("unrun");
        setOpen(false);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to submit exception request.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>New exception request</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New exception request</DialogTitle>
          <DialogDescription>Pre-fills from account context and routes to the matching approval policy.</DialogDescription>
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
            <Label>Contact (optional)</Label>
            <Select items={contactItems} value={contactId} onValueChange={(v) => typeof v === "string" && setContactId(v)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">No specific contact</SelectItem>
                {rooftopContacts.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Request type</Label>
            <Select
              items={REQUEST_TYPES}
              value={requestType}
              onValueChange={(v) => typeof v === "string" && setRequestType(v as typeof requestType)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(REQUEST_TYPES).map(([k, label]) => (
                  <SelectItem key={k} value={k}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Dollar amount</Label>
            <Input
              type="number"
              min="0"
              value={dollarAmount}
              onChange={(e) => setDollarAmount(e.target.value)}
              onBlur={(e) => refreshPreview(e.target.value)}
              placeholder="5000"
            />
          </div>

          {preview !== "unrun" && (
            <div className="rounded-md border p-2.5 text-xs">
              {isPreviewing ? (
                <p className="text-muted-foreground">Checking routing...</p>
              ) : preview === null ? (
                <p className="text-muted-foreground">No active policy matches this amount.</p>
              ) : (
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <span className="font-medium">Routes to:</span>
                    {(preview.policy.approverRoleChain as string[]).map((role, i) => (
                      <Badge key={role} variant="outline" className="text-[10px]">
                        {i + 1}. {role.replace("_", " ")}
                      </Badge>
                    ))}
                  </div>
                  <p className="text-muted-foreground">
                    {preview.policy.name} &middot; SLA {preview.policy.slaHours}h
                  </p>
                </div>
              )}
            </div>
          )}

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Label>Rationale</Label>
              <Button variant="ghost" size="sm" className="h-6 text-xs text-violet-700 dark:text-violet-300" onClick={draftWithAssistant} disabled={isDrafting}>
                <Sparkles className="mr-1 h-3 w-3" /> {isDrafting ? "Drafting..." : "Draft with assistant"}
              </Button>
            </div>
            <Textarea
              value={rationale}
              onChange={(e) => {
                setRationale(e.target.value);
                setDraftSources([]);
              }}
              placeholder="Why does this exception make sense?"
            />
            {draftSources.length > 0 && (
              <p className="text-[10px] text-muted-foreground">
                <span className="font-medium text-violet-700 dark:text-violet-300">Assistant draft</span> — sources: {draftSources.join(", ")}. Edit before submitting.
              </p>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button onClick={submit} disabled={isPending}>
            {isPending ? "Submitting..." : "Submit for approval"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
