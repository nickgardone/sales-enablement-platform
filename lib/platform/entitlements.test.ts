import { describe, it, expect, vi, beforeEach } from "vitest";
import type { CurrentUser } from "./types";

type EntitlementRow = {
  role: string;
  moduleId: string;
  capability: string;
  dataScope: "OWN" | "TEAM" | "GLOBAL" | "NONE";
  allowed: boolean;
};

type ManifestRow = {
  moduleId: string;
  enabledAssociate: boolean;
  enabledLeader: boolean;
  enabledAdmin: boolean;
};

const entitlements = new Map<string, EntitlementRow>();
const manifests = new Map<string, ManifestRow>();

function key(role: string, moduleId: string, capability: string) {
  return `${role}::${moduleId}::${capability}`;
}

vi.mock("@/lib/prisma", () => ({
  prisma: {
    entitlement: {
      findUnique: vi.fn(({ where: { role_moduleId_capability } }) => {
        const { role, moduleId, capability } = role_moduleId_capability;
        return Promise.resolve(entitlements.get(key(role, moduleId, capability)) ?? null);
      }),
    },
    moduleManifest: {
      findUnique: vi.fn(({ where: { moduleId } }) => Promise.resolve(manifests.get(moduleId) ?? null)),
    },
  },
}));

const { can, getDataScope, scopeFilter } = await import("./entitlements");

function setEntitlement(row: EntitlementRow) {
  entitlements.set(key(row.role, row.moduleId, row.capability), row);
}

function setManifest(row: ManifestRow) {
  manifests.set(row.moduleId, row);
}

const associateUser: CurrentUser = {
  id: "user-associate",
  name: "Jordan Ellis",
  email: "jordan@demo.test",
  role: "SALES_ASSOCIATE",
  associateId: "associate-1",
  teamId: "team-1",
  territoryId: "territory-1",
};

const leaderUser: CurrentUser = {
  id: "user-leader",
  name: "Patricia Nguyen",
  email: "patricia@demo.test",
  role: "SALES_LEADER",
  associateId: null,
  teamId: "team-1",
  territoryId: "territory-1",
};

const adminUser: CurrentUser = {
  id: "user-admin",
  name: "Sam Okafor",
  email: "sam@demo.test",
  role: "ADMIN",
  associateId: null,
  teamId: null,
  territoryId: null,
};

beforeEach(() => {
  entitlements.clear();
  manifests.clear();
});

describe("can()", () => {
  it("allows a role with an OWN-scope, allowed entitlement", async () => {
    setEntitlement({ role: "SALES_ASSOCIATE", moduleId: "dealer-account-360", capability: "view", dataScope: "OWN", allowed: true });
    await expect(can(associateUser, "dealer-account-360")).resolves.toBe(true);
  });

  it("denies when no entitlement row exists", async () => {
    await expect(can(associateUser, "admin-console")).resolves.toBe(false);
  });

  it("denies when dataScope is NONE even if allowed is true", async () => {
    setEntitlement({ role: "ADMIN", moduleId: "dealer-account-360", capability: "view", dataScope: "NONE", allowed: true });
    await expect(can(adminUser, "dealer-account-360")).resolves.toBe(false);
  });

  it("denies when the entitlement row is explicitly not allowed", async () => {
    setEntitlement({ role: "SALES_ASSOCIATE", moduleId: "forecasting-pipeline", capability: "view", dataScope: "OWN", allowed: false });
    await expect(can(associateUser, "forecasting-pipeline")).resolves.toBe(false);
  });

  it("denies when the ModuleManifest disables the module for that role, even if entitled", async () => {
    setEntitlement({ role: "SALES_ASSOCIATE", moduleId: "pitching", capability: "view", dataScope: "OWN", allowed: true });
    setManifest({ moduleId: "pitching", enabledAssociate: false, enabledLeader: true, enabledAdmin: true });
    await expect(can(associateUser, "pitching")).resolves.toBe(false);
  });

  it("allows when the ModuleManifest enables the module for that role", async () => {
    setEntitlement({ role: "SALES_LEADER", moduleId: "pitching", capability: "view", dataScope: "TEAM", allowed: true });
    setManifest({ moduleId: "pitching", enabledAssociate: false, enabledLeader: true, enabledAdmin: true });
    await expect(can(leaderUser, "pitching")).resolves.toBe(true);
  });
});

describe("getDataScope()", () => {
  it("returns the stored scope for an allowed entitlement", async () => {
    setEntitlement({ role: "SALES_LEADER", moduleId: "performance-insights", capability: "view", dataScope: "TEAM", allowed: true });
    await expect(getDataScope(leaderUser, "performance-insights")).resolves.toBe("TEAM");
  });

  it("returns NONE when no entitlement row exists", async () => {
    await expect(getDataScope(adminUser, "pitching")).resolves.toBe("NONE");
  });

  it("returns NONE when the row exists but is not allowed", async () => {
    setEntitlement({ role: "SALES_ASSOCIATE", moduleId: "admin-console", capability: "view", dataScope: "GLOBAL", allowed: false });
    await expect(getDataScope(associateUser, "admin-console")).resolves.toBe("NONE");
  });
});

describe("scopeFilter()", () => {
  it("OWN scope filters Rooftop by the associate's own id", async () => {
    setEntitlement({ role: "SALES_ASSOCIATE", moduleId: "dealer-account-360", capability: "view", dataScope: "OWN", allowed: true });
    const where = await scopeFilter(associateUser, "Rooftop", "dealer-account-360");
    expect(where).toEqual({ assignedAssociateId: "associate-1" });
  });

  it("TEAM scope filters Rooftop by the user's territory, for both leaders and associates", async () => {
    setEntitlement({ role: "SALES_LEADER", moduleId: "dealer-account-360", capability: "view", dataScope: "TEAM", allowed: true });
    const where = await scopeFilter(leaderUser, "Rooftop", "dealer-account-360");
    expect(where).toEqual({ territoryId: "territory-1" });
  });

  it("GLOBAL scope returns an unfiltered where clause", async () => {
    setEntitlement({ role: "ADMIN", moduleId: "performance-insights", capability: "view", dataScope: "GLOBAL", allowed: true });
    const where = await scopeFilter(adminUser, "Rooftop", "performance-insights");
    expect(where).toEqual({});
  });

  it("NONE scope (no entitlement) returns a filter that matches nothing", async () => {
    const where = await scopeFilter(adminUser, "Rooftop", "dealer-account-360");
    expect(where).toEqual({ id: "__no_access__" });
  });

  it("OWN scope with no associateId (e.g. a leader misused with an OWN-scoped module) safely denies rather than leaking data", async () => {
    setEntitlement({ role: "SALES_LEADER", moduleId: "dealer-account-360", capability: "view", dataScope: "OWN", allowed: true });
    const where = await scopeFilter(leaderUser, "Rooftop", "dealer-account-360");
    expect(where).toEqual({ id: "__no_access__" });
  });
});
