import { prisma } from "@/lib/prisma";
import { can, scopeFilter } from "./entitlements";
import type { CurrentUser } from "./types";

/**
 * Global search / command palette (spec Section 7): cross-entity, cross-module.
 * The single most visceral "one system, not six" demonstration, so it needs to
 * be fast and rank sensibly — every entity type is scoped through the same
 * entitlement/scope rules its own module's list view uses, never a separate
 * search-only permission model.
 */
export type SearchResultKind = "ROOFTOP" | "CONTACT" | "OPPORTUNITY" | "EXCEPTION_REQUEST" | "CONTENT_ASSET";

export type SearchResult = {
  kind: SearchResultKind;
  id: string;
  title: string;
  subtitle: string;
  href: string;
  score: number;
};

const REQUEST_TYPE_LABELS: Record<string, string> = {
  RATE_EXCEPTION: "Rate exception",
  PROGRAM_TIER_CHANGE: "Program tier change",
  TERM_EXTENSION: "Term extension",
  FEE_WAIVER: "Fee waiver",
};

function scoreMatch(query: string, ...fields: (string | null | undefined)[]): number {
  let best = 0;
  for (const field of fields) {
    if (!field) continue;
    const f = field.toLowerCase();
    if (f === query) best = Math.max(best, 100);
    else if (f.startsWith(query)) best = Math.max(best, 60);
    else if (f.includes(query)) best = Math.max(best, 25);
  }
  return best;
}

export async function searchGlobal(user: CurrentUser, rawQuery: string): Promise<SearchResult[]> {
  const query = rawQuery.trim().toLowerCase().slice(0, 100);
  if (query.length < 2) return [];

  const results: SearchResult[] = [];

  const [canAccounts, canDeals, canExceptions, canContent] = await Promise.all([
    can(user, "dealer-account-360", "view"),
    can(user, "closing-deals", "view"),
    can(user, "pricing-exceptions", "view"),
    can(user, "enablement-content", "view"),
  ]);

  if (canAccounts) {
    const rooftopWhere = await scopeFilter(user, "Rooftop", "dealer-account-360");

    const rooftops = await prisma.rooftop.findMany({
      where: rooftopWhere,
      include: { dealerGroup: { select: { name: true } } },
      take: 500,
    });
    for (const r of rooftops) {
      const score = scoreMatch(query, r.name, r.oemBrand, r.dealerGroup.name, r.region);
      if (score > 0) {
        results.push({ kind: "ROOFTOP", id: r.id, title: r.name, subtitle: `${r.dealerGroup.name} · ${r.region}`, href: `/accounts/${r.id}`, score });
      }
    }

    const contacts = await prisma.contact.findMany({
      where: { rooftop: rooftopWhere },
      include: { rooftop: { select: { id: true, name: true } } },
      take: 1000,
    });
    for (const c of contacts) {
      if (!c.rooftop) continue;
      const fullName = `${c.firstName} ${c.lastName}`;
      const score = scoreMatch(query, c.firstName, c.lastName, fullName, c.email);
      if (score > 0) {
        results.push({
          kind: "CONTACT",
          id: c.id,
          title: fullName,
          subtitle: `${c.personaType.replace(/_/g, " ").toLowerCase()} · ${c.rooftop.name}`,
          href: `/accounts/${c.rooftop.id}`,
          score,
        });
      }
    }
  }

  if (canDeals) {
    const rooftopWhere = await scopeFilter(user, "Rooftop", "closing-deals");
    const opportunities = await prisma.opportunity.findMany({
      where: { rooftop: rooftopWhere },
      include: { rooftop: { select: { name: true } }, dealStage: { select: { name: true } } },
      take: 1000,
    });
    for (const o of opportunities) {
      const productLabel = o.productType === "FINANCING" ? "Financing" : "Software";
      const score = scoreMatch(query, o.rooftop.name, productLabel, o.dealStage.name);
      if (score > 0) {
        results.push({
          kind: "OPPORTUNITY",
          id: o.id,
          title: `${o.rooftop.name} — ${productLabel} opportunity`,
          subtitle: `${o.dealStage.name} · $${Math.round(o.expectedValue).toLocaleString()}`,
          href: `/deals/${o.id}`,
          score,
        });
      }
    }
  }

  if (canExceptions) {
    const rooftopWhere = await scopeFilter(user, "Rooftop", "pricing-exceptions");
    const exceptions = await prisma.exceptionRequest.findMany({
      where: { rooftop: rooftopWhere },
      include: { rooftop: { select: { name: true } } },
      take: 1000,
    });
    for (const e of exceptions) {
      const typeLabel = REQUEST_TYPE_LABELS[e.requestType] ?? e.requestType;
      const score = scoreMatch(query, e.rooftop.name, typeLabel, e.rationale);
      if (score > 0) {
        results.push({
          kind: "EXCEPTION_REQUEST",
          id: e.id,
          title: `${typeLabel} — ${e.rooftop.name}`,
          subtitle: e.dollarAmount ? `$${Math.round(e.dollarAmount).toLocaleString()}` : "Exception request",
          href: `/exceptions/${e.id}`,
          score,
        });
      }
    }
  }

  if (canContent) {
    const assets = await prisma.contentAsset.findMany({ take: 200 });
    for (const a of assets) {
      const personaTags = (a.personaTags as string[]) ?? [];
      const productTags = (a.productTags as string[]) ?? [];
      const score = scoreMatch(query, a.title, a.assetType, ...personaTags, ...productTags);
      if (score > 0) {
        results.push({
          kind: "CONTENT_ASSET",
          id: a.id,
          title: a.title,
          subtitle: a.assetType.replace(/_/g, " ").toLowerCase(),
          href: "/content",
          score,
        });
      }
    }
  }

  return results.sort((a, b) => b.score - a.score).slice(0, 20);
}
