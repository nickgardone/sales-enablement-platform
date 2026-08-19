import { z } from "zod";
import { registerAction } from "./action-registry";
import { clearStip, createOpportunity, updateOpportunityStage } from "@/lib/modules/closing-deals/actions";
import { updateCrossSellStatus } from "@/lib/modules/cross-sell/actions";
import { submitOnboardingForApproval, toggleChecklistItem } from "@/lib/modules/dealer-onboarding/actions";
import { raiseEscalation, resolveEscalation } from "@/lib/modules/escalations/actions";
import { updateLeadStatus } from "@/lib/modules/lead-routing/actions";
import { logPitch } from "@/lib/modules/pitching/actions";
import { decideApprovalStep, submitExceptionRequest } from "@/lib/modules/pricing-exceptions/actions";
import { logInteraction, shareContent } from "@/lib/modules/dealer-account-360/actions";

// Import for the side effect of populating the registry (spec Section 11's action-registry
// contract). Imported once, from the Admin Console's registry viewer, so every module's
// mutations get registered without every page load paying the cost.

registerAction({
  id: "closing-deals.createOpportunity",
  moduleId: "closing-deals",
  capability: "view",
  description: "Create a new opportunity against a rooftop, starting in the Prospecting stage.",
  inputShape: "{ rooftopId: string, productType: 'FINANCING'|'SOFTWARE', expectedValue: number, closeDate: string }",
  inputSchema: z.object({
    rooftopId: z.string(),
    productType: z.enum(["FINANCING", "SOFTWARE"]),
    expectedValue: z.number().positive(),
    closeDate: z.string(),
  }),
  handler: (input) => createOpportunity(input),
});

registerAction({
  id: "closing-deals.updateOpportunityStage",
  moduleId: "closing-deals",
  capability: "view",
  description: "Move an opportunity to a new deal stage (Funded is excluded — that's an underwriting outcome).",
  inputShape: "{ opportunityId: string, dealStageId: string }",
  inputSchema: z.object({ opportunityId: z.string(), dealStageId: z.string() }),
  handler: (input) => updateOpportunityStage(input.opportunityId, input.dealStageId),
});

registerAction({
  id: "closing-deals.clearStip",
  moduleId: "closing-deals",
  capability: "view",
  description: "Mark an outstanding stipulation as cleared.",
  inputShape: "{ stipId: string }",
  inputSchema: z.object({ stipId: z.string() }),
  handler: (input) => clearStip(input.stipId),
});

registerAction({
  id: "cross-sell.updateStatus",
  moduleId: "cross-sell",
  capability: "view",
  description: "Dismiss or mark-actioned a cross-sell signal.",
  inputShape: "{ signalId: string, status: 'DISMISSED'|'ACTIONED' }",
  inputSchema: z.object({ signalId: z.string(), status: z.enum(["DISMISSED", "ACTIONED"]) }),
  handler: (input) => updateCrossSellStatus(input.signalId, input.status),
});

registerAction({
  id: "dealer-onboarding.toggleChecklistItem",
  moduleId: "dealer-onboarding",
  capability: "view",
  description: "Toggle a checklist item's done state on an onboarding case.",
  inputShape: "{ caseId: string, itemIndex: number }",
  inputSchema: z.object({ caseId: z.string(), itemIndex: z.number().int().nonnegative() }),
  handler: (input) => toggleChecklistItem(input.caseId, input.itemIndex),
});

registerAction({
  id: "dealer-onboarding.submitForApproval",
  moduleId: "dealer-onboarding",
  capability: "view",
  description: "Hand off a completed onboarding checklist to the Approvals service.",
  inputShape: "{ caseId: string }",
  inputSchema: z.object({ caseId: z.string() }),
  handler: (input) => submitOnboardingForApproval(input.caseId),
});

registerAction({
  id: "escalations-disputes.raise",
  moduleId: "escalations-disputes",
  capability: "view",
  description: "Raise an escalation against a rooftop and route it for triage via the Approvals service.",
  inputShape: "{ rooftopId: string, category: string, description: string }",
  inputSchema: z.object({ rooftopId: z.string(), category: z.string().min(1), description: z.string().min(1) }),
  handler: (input) => raiseEscalation(input),
});

registerAction({
  id: "escalations-disputes.resolve",
  moduleId: "escalations-disputes",
  capability: "view",
  description: "Resolve an escalation with a resolution note.",
  inputShape: "{ escalationId: string, resolutionNotes: string }",
  inputSchema: z.object({ escalationId: z.string(), resolutionNotes: z.string().min(1) }),
  handler: (input) => resolveEscalation(input.escalationId, input.resolutionNotes),
});

registerAction({
  id: "lead-routing.updateLeadStatus",
  moduleId: "lead-routing",
  capability: "view",
  description: "Update a lead's working status.",
  inputShape: "{ leadId: string, status: 'IN_PROGRESS'|'CONVERTED'|'LOST' }",
  inputSchema: z.object({ leadId: z.string(), status: z.enum(["IN_PROGRESS", "CONVERTED", "LOST"]) }),
  handler: (input) => updateLeadStatus(input.leadId, input.status),
});

registerAction({
  id: "pitching.logPitch",
  moduleId: "pitching",
  capability: "view",
  description: "Log a pitch against a rooftop and contact, with product, outcome, and objection.",
  inputShape:
    "{ rooftopId: string, contactId: string, productPitched: 'FINANCING'|'SOFTWARE', outcome: 'POSITIVE'|'NEUTRAL'|'DECLINED'|'FOLLOW_UP_NEEDED', objection: string|null }",
  inputSchema: z.object({
    rooftopId: z.string(),
    contactId: z.string(),
    productPitched: z.enum(["FINANCING", "SOFTWARE"]),
    outcome: z.enum(["POSITIVE", "NEUTRAL", "DECLINED", "FOLLOW_UP_NEEDED"]),
    objection: z.string().nullable(),
  }),
  handler: (input) => logPitch(input),
});

registerAction({
  id: "pricing-exceptions.submit",
  moduleId: "pricing-exceptions",
  capability: "view",
  description: "Submit a pricing exception request; routes through the Approvals engine by dollar amount and type.",
  inputShape:
    "{ rooftopId: string, contactId: string|null, requestType: 'RATE_EXCEPTION'|'PROGRAM_TIER_CHANGE'|'TERM_EXTENSION'|'FEE_WAIVER', dollarAmount: number, rationale: string }",
  inputSchema: z.object({
    rooftopId: z.string(),
    contactId: z.string().nullable(),
    requestType: z.enum(["RATE_EXCEPTION", "PROGRAM_TIER_CHANGE", "TERM_EXTENSION", "FEE_WAIVER"]),
    dollarAmount: z.number().positive(),
    rationale: z.string().min(1),
  }),
  handler: (input) => submitExceptionRequest(input),
});

registerAction({
  id: "pricing-exceptions.decideStep",
  moduleId: "pricing-exceptions",
  capability: "view",
  description: "Approve or reject the active approval step on an exception request's approval chain.",
  inputShape:
    "{ exceptionRequestId: string, approvalRequestId: string, stepId: string, decision: 'APPROVED'|'REJECTED', rationale: string }",
  inputSchema: z.object({
    exceptionRequestId: z.string(),
    approvalRequestId: z.string(),
    stepId: z.string(),
    decision: z.enum(["APPROVED", "REJECTED"]),
    rationale: z.string().min(1),
  }),
  handler: (input) => decideApprovalStep(input),
});

registerAction({
  id: "dealer-account-360.logInteraction",
  moduleId: "dealer-account-360",
  capability: "view",
  description: "Log a visit, call, email, or virtual touchpoint on an account.",
  inputShape: "{ rooftopId: string, contactId: string|null, type: 'VISIT'|'CALL'|'EMAIL'|'VIRTUAL', notes: string|null }",
  inputSchema: z.object({
    rooftopId: z.string(),
    contactId: z.string().nullable(),
    type: z.enum(["VISIT", "CALL", "EMAIL", "VIRTUAL"]),
    notes: z.string().nullable(),
  }),
  handler: (input) => logInteraction(input),
});

registerAction({
  id: "dealer-account-360.shareContent",
  moduleId: "dealer-account-360",
  capability: "view",
  description: "Share an enablement content asset with an account.",
  inputShape: "{ rooftopId: string, contactId: string|null, contentAssetId: string }",
  inputSchema: z.object({ rooftopId: z.string(), contactId: z.string().nullable(), contentAssetId: z.string() }),
  handler: (input) => shareContent(input),
});
