"use server";

import { getCurrentUser } from "@/lib/platform/current-user";
import {
  draftExceptionJustification as draftExceptionJustificationIntent,
  explainMetric as explainMetricIntent,
  generateVisitBrief as generateVisitBriefIntent,
  summarizeAccount as summarizeAccountIntent,
  suggestNextAction as suggestNextActionIntent,
} from "./intents";
import type { ExceptionJustificationDraft } from "./types";

export async function summarizeAccount(rooftopId: string) {
  const user = await getCurrentUser();
  return summarizeAccountIntent(user, rooftopId);
}

export async function generateVisitBrief(rooftopId: string, contactPersona: string) {
  const user = await getCurrentUser();
  return generateVisitBriefIntent(user, rooftopId, contactPersona);
}

export async function explainMetric(metricKey: string, rooftopId: string) {
  const user = await getCurrentUser();
  return explainMetricIntent(user, metricKey, rooftopId);
}

export async function suggestNextAction(rooftopId: string) {
  const user = await getCurrentUser();
  return suggestNextActionIntent(user, rooftopId);
}

export async function draftExceptionJustification(draft: ExceptionJustificationDraft) {
  const user = await getCurrentUser();
  return draftExceptionJustificationIntent(user, draft);
}
