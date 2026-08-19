"use client";

import { useState, useTransition } from "react";
import { Printer, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { generateVisitBrief } from "@/lib/services/assistant/actions";
import type { Citation, VisitBrief } from "@/lib/services/assistant/types";

const PERSONA_LABELS: Record<string, string> = {
  DEALER_PRINCIPAL: "Dealer Principal",
  GENERAL_MANAGER: "General Manager",
  SALES_DESK_MANAGER: "Sales Desk Manager",
  FI_MANAGER: "F&I Manager",
  BDC_MANAGER: "BDC Manager",
  INTERNET_MANAGER: "Internet Manager",
};

/**
 * The Phase 9 acceptance-criterion intent (spec Section 13: "Visit brief
 * generates from live data with citations"). One click produces a
 * printable pre-visit pack targeted at a chosen contact persona.
 */
export function VisitBriefDialog({ rooftopId, availablePersonas }: { rooftopId: string; availablePersonas: string[] }) {
  const personaOptions = availablePersonas.length > 0 ? availablePersonas : Object.keys(PERSONA_LABELS);
  const [open, setOpen] = useState(false);
  const [persona, setPersona] = useState(personaOptions[0]);
  const [brief, setBrief] = useState<VisitBrief | null>(null);
  const [citations, setCitations] = useState<Citation[]>([]);
  const [isPending, startTransition] = useTransition();

  const personaItems = Object.fromEntries(personaOptions.map((p) => [p, PERSONA_LABELS[p] ?? p]));

  function generate() {
    startTransition(async () => {
      try {
        const res = await generateVisitBrief(rooftopId, persona);
        setBrief(res.output);
        setCitations(res.citations);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to generate visit brief.");
      }
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setBrief(null);
      }}
    >
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        <Sparkles className="mr-1 h-3.5 w-3.5" /> Generate visit brief
      </DialogTrigger>
      <DialogContent className="max-w-lg print:max-w-none print:shadow-none">
        <DialogHeader className="print:hidden">
          <DialogTitle>Visit brief</DialogTitle>
          <DialogDescription>One-click pre-visit pack generated from live account data, targeted at a chosen contact persona.</DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2 print:hidden">
          <Select items={personaItems} value={persona} onValueChange={(v) => typeof v === "string" && setPersona(v)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(personaItems).map(([k, label]) => (
                <SelectItem key={k} value={k}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={generate} disabled={isPending} size="sm" className="shrink-0">
            {isPending ? "Generating..." : brief ? "Regenerate" : "Generate"}
          </Button>
        </div>

        {brief && (
          <div className="space-y-3 rounded-lg border border-violet-200 bg-violet-50/50 p-3 dark:border-violet-900 dark:bg-violet-950/20 print:border-none print:bg-transparent print:p-0">
            <div className="flex items-center justify-between print:hidden">
              <div className="flex items-center gap-1.5 text-[10px] font-medium tracking-wide text-violet-700 uppercase dark:text-violet-300">
                <Sparkles className="h-3 w-3" /> Assistant-generated
              </div>
              <Button variant="ghost" size="sm" onClick={() => window.print()}>
                <Printer className="mr-1 h-3.5 w-3.5" /> Print
              </Button>
            </div>
            <div>
              <h3 className="text-sm font-semibold">
                {brief.rooftopName} — {brief.dealerGroupName}
              </h3>
              <p className="text-xs text-muted-foreground">
                Visit brief for {PERSONA_LABELS[brief.contactPersona] ?? brief.contactPersona}
                {brief.contactName ? ` — ${brief.contactName}` : ""}
              </p>
            </div>
            <div className="space-y-2.5">
              {brief.sections.map((s) => (
                <div key={s.heading}>
                  <p className="text-xs font-medium">{s.heading}</p>
                  <p className="text-xs text-muted-foreground">{s.body}</p>
                </div>
              ))}
            </div>
            <div className="border-t pt-2 print:hidden">
              <p className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">Sources</p>
              <div className="mt-1 flex flex-wrap gap-1">
                {citations.map((c, i) => (
                  <span key={`${c.entityType}-${c.entityId}-${i}`} className="rounded border px-1.5 py-0.5 text-[10px] text-muted-foreground">
                    {c.label}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="print:hidden">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
