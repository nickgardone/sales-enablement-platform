import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PrintButton } from "@/components/shared/print-button";
import type { ExceptionDetail } from "@/lib/modules/pricing-exceptions/types";

const REQUEST_TYPE_LABEL: Record<string, string> = {
  RATE_EXCEPTION: "Rate exception",
  PROGRAM_TIER_CHANGE: "Program tier change",
  TERM_EXTENSION: "Term extension",
  FEE_WAIVER: "Fee waiver",
};

const STEP_STATUS_VARIANT: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  PENDING: "outline",
  APPROVED: "secondary",
  REJECTED: "destructive",
  SKIPPED: "outline",
  DELEGATED: "outline",
};

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm">{value}</p>
    </div>
  );
}

export function ExceptionArtifact({ detail }: { detail: ExceptionDetail }) {
  const ar = detail.approvalRequest;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Exception Request</h1>
          <p className="text-sm text-muted-foreground">
            {detail.rooftopName} &middot; {detail.dealerGroupName}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {ar && (
            <Badge variant={ar.status === "APPROVED" ? "secondary" : ar.status === "REJECTED" ? "destructive" : "outline"}>
              {ar.status}
            </Badge>
          )}
          <PrintButton />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Request</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Field label="Requested by" value={detail.requestedByName} />
          <Field label="Contact" value={detail.contactName ?? "—"} />
          <Field label="Request type" value={REQUEST_TYPE_LABEL[detail.requestType] ?? detail.requestType} />
          <Field label="Dollar amount" value={detail.dollarAmount ? `$${detail.dollarAmount.toLocaleString()}` : "—"} />
          <Field label="Current program" value={detail.currentProgramName ?? "—"} />
          <Field label="Applicable rate sheet" value={detail.rateSheetSummary ?? "—"} />
          <Field label="Submitted" value={new Date(detail.submittedAt).toLocaleString()} />
          <Field label="Last updated" value={new Date(detail.updatedAt).toLocaleString()} />
          <div className="col-span-2 sm:col-span-3">
            <p className="text-xs text-muted-foreground">Rationale</p>
            <p className="text-sm">{detail.rationale}</p>
          </div>
        </CardContent>
      </Card>

      {ar && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Policy basis</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{ar.policyName}</span>
              <Badge variant="outline" className="text-[10px]">
                SLA {ar.slaHours}h
              </Badge>
            </div>
            <pre className="overflow-x-auto rounded bg-muted p-2 text-xs">{JSON.stringify(ar.reasonCodes, null, 2)}</pre>
          </CardContent>
        </Card>
      )}

      {ar && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Approver chain</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {ar.steps.map((s) => (
              <div key={s.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-2.5 text-sm">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">
                      {s.stepOrder}. {s.approverRole.replace("_", " ")}
                    </span>
                    <Badge variant={STEP_STATUS_VARIANT[s.status]} className="text-[10px]">
                      {s.status}
                    </Badge>
                  </div>
                  {s.rationale && <p className="mt-0.5 text-xs text-muted-foreground">{s.rationale}</p>}
                </div>
                <div className="text-right text-xs text-muted-foreground">
                  {s.deciderName && <p>{s.deciderName}</p>}
                  {s.decidedAt && <p>{new Date(s.decidedAt).toLocaleString()}</p>}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {ar && ar.status !== "PENDING" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Decision</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <Field label="Outcome" value={ar.status} />
            <Field label="Decided by" value={ar.deciderName ?? "—"} />
            <Field label="Decided at" value={ar.decidedAt ? new Date(ar.decidedAt).toLocaleString() : "—"} />
            <div className="col-span-2 sm:col-span-3">
              <p className="text-xs text-muted-foreground">Decision rationale</p>
              <p className="text-sm">{ar.decisionRationale ?? "—"}</p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Outcome tracking</CardTitle>
        </CardHeader>
        <CardContent>
          {detail.outcome ? (
            <p className="text-sm">
              Converted to a funded deal — ${detail.outcome.fundedAmount.toLocaleString()} on{" "}
              {new Date(detail.outcome.fundedAt).toLocaleDateString()}.
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">Not yet converted to funded volume.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
