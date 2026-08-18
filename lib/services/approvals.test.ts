import { describe, it, expect, vi } from "vitest";
import { selectPolicy, type PolicyLike } from "./approvals";

const lowPolicy: PolicyLike = {
  id: "policy-low",
  name: "Exception — Under $2,500 (Leader approval)",
  triggerType: "EXCEPTION_REQUEST",
  thresholdConditions: { maxAmount: 2500 },
  approverRoleChain: ["SALES_LEADER"],
  slaHours: 24,
  active: true,
};

const midPolicy: PolicyLike = {
  id: "policy-mid",
  name: "Exception — $2,500 to $10,000 (Leader then Admin)",
  triggerType: "EXCEPTION_REQUEST",
  thresholdConditions: { minAmount: 2500, maxAmount: 10000 },
  approverRoleChain: ["SALES_LEADER", "ADMIN"],
  slaHours: 48,
  active: true,
};

const highPolicy: PolicyLike = {
  id: "policy-high",
  name: "Exception — Over $10,000 (Admin approval)",
  triggerType: "EXCEPTION_REQUEST",
  thresholdConditions: { minAmount: 10000 },
  approverRoleChain: ["ADMIN"],
  slaHours: 72,
  active: true,
};

const unconditionalPolicy: PolicyLike = {
  id: "policy-onboarding",
  name: "New Dealer Onboarding — Leader sign-off",
  triggerType: "ONBOARDING_CASE",
  thresholdConditions: {},
  approverRoleChain: ["SALES_LEADER"],
  slaHours: 72,
  active: true,
};

const threeBands = [lowPolicy, midPolicy, highPolicy];

describe("selectPolicy() — threshold-band routing", () => {
  it("routes an amount under the low band's maxAmount to the low policy", () => {
    const match = selectPolicy(threeBands, { amount: 1200 });
    expect(match?.policy.id).toBe("policy-low");
  });

  it("routes an amount exactly at a band boundary to the higher band (minAmount is inclusive)", () => {
    const match = selectPolicy(threeBands, { amount: 2500 });
    expect(match?.policy.id).toBe("policy-mid");
  });

  it("routes a mid-band amount to the mid policy with its two-step approver chain", () => {
    const match = selectPolicy(threeBands, { amount: 6000 });
    expect(match?.policy.id).toBe("policy-mid");
    expect(match?.policy.approverRoleChain).toEqual(["SALES_LEADER", "ADMIN"]);
  });

  it("routes an amount at or above the high band's minAmount to the high policy", () => {
    const match = selectPolicy(threeBands, { amount: 25000 });
    expect(match?.policy.id).toBe("policy-high");
  });

  it("returns null when no active policy's band covers the amount", () => {
    // gap scenario: only low + high seeded, mid missing
    const match = selectPolicy([lowPolicy, highPolicy], { amount: 5000 });
    expect(match).toBeNull();
  });

  it("ignores inactive policies even if their band would otherwise match", () => {
    const inactiveMid = { ...midPolicy, active: false };
    const match = selectPolicy([lowPolicy, inactiveMid, highPolicy], { amount: 6000 });
    expect(match).toBeNull();
  });

  it("an unconditional policy (no thresholdConditions) matches regardless of amount", () => {
    const match = selectPolicy([unconditionalPolicy], {});
    expect(match?.policy.id).toBe("policy-onboarding");
  });

  it("a policy with an amount condition does not match when context has no amount", () => {
    const match = selectPolicy(threeBands, {});
    expect(match).toBeNull();
  });

  it("editing a policy's threshold changes routing for the same amount — the Phase 3 acceptance behavior", () => {
    const before = selectPolicy(threeBands, { amount: 3000 });
    expect(before?.policy.id).toBe("policy-mid");

    // Simulate an admin console edit moving the low/mid boundary from $2,500 to $5,000.
    const widenedLow: PolicyLike = { ...lowPolicy, thresholdConditions: { maxAmount: 5000 } };
    const shrunkMid: PolicyLike = { ...midPolicy, thresholdConditions: { minAmount: 5000, maxAmount: 10000 } };
    const after = selectPolicy([widenedLow, shrunkMid, highPolicy], { amount: 3000 });
    expect(after?.policy.id).toBe("policy-low");
  });

  it("prefers the more specific (higher minAmount) band when two active policies overlap", () => {
    const broad: PolicyLike = { ...midPolicy, id: "policy-broad", thresholdConditions: { minAmount: 0 } };
    const narrow: PolicyLike = { ...highPolicy, id: "policy-narrow", thresholdConditions: { minAmount: 10000 } };
    const match = selectPolicy([broad, narrow], { amount: 15000 });
    expect(match?.policy.id).toBe("policy-narrow");
  });

  it("reasonCodes cite the matched policy name and the threshold conditions used", () => {
    const match = selectPolicy(threeBands, { amount: 6000 });
    expect(match?.reasonCodes).toMatchObject({
      matchedPolicy: midPolicy.name,
      triggerType: "EXCEPTION_REQUEST",
      thresholdConditions: { minAmount: 2500, maxAmount: 10000 },
      amount: 6000,
    });
  });
});

describe("evaluatePolicy() — DB-backed wrapper", () => {
  it("passes only the requested trigger type's active policies to selectPolicy", async () => {
    vi.resetModules();
    const findMany = vi.fn().mockResolvedValue([midPolicy]);
    vi.doMock("@/lib/prisma", () => ({ prisma: { approvalPolicy: { findMany } } }));

    const { evaluatePolicy } = await import("./approvals");
    const match = await evaluatePolicy("EXCEPTION_REQUEST", { amount: 6000 });

    expect(findMany).toHaveBeenCalledWith({ where: { triggerType: "EXCEPTION_REQUEST", active: true } });
    expect(match?.policy.id).toBe("policy-mid");
  });
});
