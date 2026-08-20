"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  createOpportunity,
  logInteraction,
  logPitch,
  shareContent,
  startExceptionRequest,
} from "@/lib/modules/dealer-account-360/actions";
import { useDegradedMode } from "@/components/shared/degraded-mode-context";

type ContactOption = { id: string; name: string; personaType: string };
type ContentAssetOption = { id: string; title: string; assetType: string };

const INTERACTION_TYPES = { VISIT: "Visit", CALL: "Call", EMAIL: "Email", VIRTUAL: "Virtual" };
const PRODUCT_TYPES = { FINANCING: "Financing", SOFTWARE: "Software" };
const PITCH_OUTCOMES = { POSITIVE: "Positive", NEUTRAL: "Neutral", DECLINED: "Declined", FOLLOW_UP_NEEDED: "Follow-up needed" };
const EXCEPTION_TYPES = {
  RATE_EXCEPTION: "Rate exception",
  PROGRAM_TIER_CHANGE: "Program tier change",
  TERM_EXTENSION: "Term extension",
  FEE_WAIVER: "Fee waiver",
};

export function AccountActions({
  rooftopId,
  contacts,
  contentAssets,
}: {
  rooftopId: string;
  contacts: ContactOption[];
  contentAssets: ContentAssetOption[];
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <LogInteractionDialog rooftopId={rooftopId} contacts={contacts} />
      <LogPitchDialog rooftopId={rooftopId} contacts={contacts} />
      <ShareContentDialog rooftopId={rooftopId} contacts={contacts} contentAssets={contentAssets} />
      <StartExceptionDialog rooftopId={rooftopId} contacts={contacts} />
      <CreateOpportunityDialog rooftopId={rooftopId} />
    </div>
  );
}

function LogInteractionDialog({ rooftopId, contacts }: { rooftopId: string; contacts: ContactOption[] }) {
  const [open, setOpen] = useState(false);
  const [contactId, setContactId] = useState<string>(contacts[0]?.id ?? "");
  const [type, setType] = useState<keyof typeof INTERACTION_TYPES>("VISIT");
  const [notes, setNotes] = useState("");
  const [isPending, startTransition] = useTransition();
  const { enqueueOrRun } = useDegradedMode();

  function submit() {
    startTransition(async () => {
      try {
        const ran = await enqueueOrRun("Log interaction", async () => {
          await logInteraction({ rooftopId, contactId: contactId || null, type, notes: notes.trim() || null });
        });
        if (ran) toast.success("Interaction logged.");
        setNotes("");
        setOpen(false);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to log interaction.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>Log interaction</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Log an interaction</DialogTitle>
          <DialogDescription>Records a visit, call, email, or virtual touchpoint on this account.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Contact</Label>
            <ContactSelect contacts={contacts} value={contactId} onChange={setContactId} allowNone />
          </div>
          <div className="space-y-1">
            <Label>Type</Label>
            <Select items={INTERACTION_TYPES} value={type} onValueChange={(v) => typeof v === "string" && setType(v as typeof type)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(INTERACTION_TYPES).map(([k, label]) => (
                  <SelectItem key={k} value={k}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="What was discussed?" />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={submit} disabled={isPending}>
            {isPending ? "Logging..." : "Log interaction"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function LogPitchDialog({ rooftopId, contacts }: { rooftopId: string; contacts: ContactOption[] }) {
  const [open, setOpen] = useState(false);
  const [contactId, setContactId] = useState<string>(contacts[0]?.id ?? "");
  const [productPitched, setProductPitched] = useState<keyof typeof PRODUCT_TYPES>("FINANCING");
  const [outcome, setOutcome] = useState<keyof typeof PITCH_OUTCOMES>("POSITIVE");
  const [objection, setObjection] = useState("");
  const [isPending, startTransition] = useTransition();
  const { enqueueOrRun } = useDegradedMode();

  function submit() {
    if (!contactId) {
      toast.error("A pitch needs a contact.");
      return;
    }
    startTransition(async () => {
      try {
        const ran = await enqueueOrRun("Log pitch", async () => {
          await logPitch({ rooftopId, contactId, productPitched, outcome, objection: objection.trim() || null });
        });
        if (ran) toast.success("Pitch logged.");
        setObjection("");
        setOpen(false);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to log pitch.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>Log pitch</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Log a pitch</DialogTitle>
          <DialogDescription>Records a product pitch and its outcome for this account.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Contact</Label>
            <ContactSelect contacts={contacts} value={contactId} onChange={setContactId} />
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
            <Select items={PITCH_OUTCOMES} value={outcome} onValueChange={(v) => typeof v === "string" && setOutcome(v as typeof outcome)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(PITCH_OUTCOMES).map(([k, label]) => (
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

function ShareContentDialog({
  rooftopId,
  contacts,
  contentAssets,
}: {
  rooftopId: string;
  contacts: ContactOption[];
  contentAssets: ContentAssetOption[];
}) {
  const [open, setOpen] = useState(false);
  const [contactId, setContactId] = useState<string>(contacts[0]?.id ?? "");
  const [contentAssetId, setContentAssetId] = useState<string>(contentAssets[0]?.id ?? "");
  const [isPending, startTransition] = useTransition();
  const { enqueueOrRun } = useDegradedMode();

  const contentItems = Object.fromEntries(contentAssets.map((a) => [a.id, a.title]));

  function submit() {
    if (!contentAssetId) {
      toast.error("Choose a content asset to share.");
      return;
    }
    startTransition(async () => {
      try {
        const ran = await enqueueOrRun("Share content", async () => {
          await shareContent({ rooftopId, contactId: contactId || null, contentAssetId });
        });
        if (ran) toast.success("Content shared.");
        setOpen(false);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to share content.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>Share content</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Share content</DialogTitle>
          <DialogDescription>Shares an enablement asset with this account.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Content asset</Label>
            <Select items={contentItems} value={contentAssetId} onValueChange={(v) => typeof v === "string" && setContentAssetId(v)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {contentAssets.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Contact (optional)</Label>
            <ContactSelect contacts={contacts} value={contactId} onChange={setContactId} allowNone />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={submit} disabled={isPending}>
            {isPending ? "Sharing..." : "Share content"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function StartExceptionDialog({ rooftopId, contacts }: { rooftopId: string; contacts: ContactOption[] }) {
  const [open, setOpen] = useState(false);
  const [contactId, setContactId] = useState<string>(contacts[0]?.id ?? "");
  const [requestType, setRequestType] = useState<keyof typeof EXCEPTION_TYPES>("RATE_EXCEPTION");
  const [dollarAmount, setDollarAmount] = useState("");
  const [rationale, setRationale] = useState("");
  const [isPending, startTransition] = useTransition();
  const { enqueueOrRun } = useDegradedMode();

  function submit() {
    const amount = Number(dollarAmount);
    if (!amount || amount <= 0) {
      toast.error("Enter a dollar amount for this exception.");
      return;
    }
    if (!rationale.trim()) {
      toast.error("A rationale is required.");
      return;
    }
    startTransition(async () => {
      try {
        const ran = await enqueueOrRun("Start exception request", async () => {
          await startExceptionRequest({ rooftopId, contactId: contactId || null, requestType, dollarAmount: amount, rationale: rationale.trim() });
        });
        if (ran) toast.success("Exception request submitted for approval.");
        setDollarAmount("");
        setRationale("");
        setOpen(false);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to submit exception request.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>Start exception request</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Start an exception request</DialogTitle>
          <DialogDescription>Routes to the approval chain matching the requested amount.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Request type</Label>
            <Select
              items={EXCEPTION_TYPES}
              value={requestType}
              onValueChange={(v) => typeof v === "string" && setRequestType(v as typeof requestType)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(EXCEPTION_TYPES).map(([k, label]) => (
                  <SelectItem key={k} value={k}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Dollar amount</Label>
            <Input type="number" min="0" value={dollarAmount} onChange={(e) => setDollarAmount(e.target.value)} placeholder="5000" />
          </div>
          <div className="space-y-1">
            <Label>Contact (optional)</Label>
            <ContactSelect contacts={contacts} value={contactId} onChange={setContactId} allowNone />
          </div>
          <div className="space-y-1">
            <Label>Rationale</Label>
            <Textarea value={rationale} onChange={(e) => setRationale(e.target.value)} placeholder="Why does this exception make sense?" />
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

function CreateOpportunityDialog({ rooftopId }: { rooftopId: string }) {
  const [open, setOpen] = useState(false);
  const [productType, setProductType] = useState<keyof typeof PRODUCT_TYPES>("FINANCING");
  const [expectedValue, setExpectedValue] = useState("");
  const [closeDate, setCloseDate] = useState("");
  const [isPending, startTransition] = useTransition();
  const { enqueueOrRun } = useDegradedMode();

  function submit() {
    const value = Number(expectedValue);
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
        const ran = await enqueueOrRun("Create opportunity", async () => {
          await createOpportunity({ rooftopId, productType, expectedValue: value, closeDate });
        });
        if (ran) toast.success("Opportunity created.");
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
      <DialogTrigger render={<Button size="sm" />}>Create opportunity</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create an opportunity</DialogTitle>
          <DialogDescription>Opens a new deal in Prospecting for this account.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
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

function ContactSelect({
  contacts,
  value,
  onChange,
  allowNone,
}: {
  contacts: ContactOption[];
  value: string;
  onChange: (v: string) => void;
  allowNone?: boolean;
}) {
  const items: Record<string, string> = allowNone ? { "": "No specific contact" } : {};
  for (const c of contacts) items[c.id] = c.name;

  return (
    <Select items={items} value={value} onValueChange={(v) => typeof v === "string" && onChange(v)}>
      <SelectTrigger className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {allowNone && <SelectItem value="">No specific contact</SelectItem>}
        {contacts.map((c) => (
          <SelectItem key={c.id} value={c.id}>
            {c.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
