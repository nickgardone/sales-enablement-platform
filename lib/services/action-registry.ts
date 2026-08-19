import { z } from "zod";
import type { CurrentUser } from "@/lib/platform/types";
import type { ModuleId } from "@/lib/platform/module-ids";
import { can } from "@/lib/platform/entitlements";

/**
 * The Phase 9 "hook for later" contract (spec Section 11): every module's
 * state-changing operations are registered here as typed, entitlement-checked,
 * auditable functions. In v1 nothing calls invokeAction() yet — the assistant
 * only reads and drafts — but the shape exists now so agentic mode later is
 * just handing the assistant this registry as tools and swapping the mock
 * provider for a real model call, with zero changes to the underlying module
 * actions (which already audit and emit signals themselves).
 */
export type ActionDefinition<TInput = unknown, TOutput = unknown> = {
  id: string;
  moduleId: ModuleId;
  capability: string;
  description: string;
  /** Human-readable input shape, shown in the Admin Console registry viewer. */
  inputShape: string;
  inputSchema: z.ZodType<TInput>;
  handler: (input: TInput) => Promise<TOutput>;
};

export type ActionSummary = {
  id: string;
  moduleId: ModuleId;
  capability: string;
  description: string;
  inputShape: string;
};

const registry = new Map<string, ActionDefinition<never, unknown>>();

export function registerAction<TInput, TOutput>(def: ActionDefinition<TInput, TOutput>) {
  registry.set(def.id, def as unknown as ActionDefinition<never, unknown>);
}

export class ActionRegistryError extends Error {}

/** Not called anywhere in v1 — this is the entry point agentic mode will use once the assistant is handed the registry as tools. */
export async function invokeAction<TOutput = unknown>(user: CurrentUser, actionId: string, rawInput: unknown): Promise<TOutput> {
  const def = registry.get(actionId);
  if (!def) throw new ActionRegistryError(`Unknown action: "${actionId}"`);

  const allowed = await can(user, def.moduleId, def.capability);
  if (!allowed) throw new ActionRegistryError(`Not entitled to invoke "${actionId}".`);

  const input = def.inputSchema.parse(rawInput);
  return def.handler(input) as Promise<TOutput>;
}

export function listActions(): ActionSummary[] {
  return Array.from(registry.values())
    .map((def) => ({ id: def.id, moduleId: def.moduleId, capability: def.capability, description: def.description, inputShape: def.inputShape }))
    .sort((a, b) => a.id.localeCompare(b.id));
}
