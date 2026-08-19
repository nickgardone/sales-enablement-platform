import { prisma } from "@/lib/prisma";
import type { CertificationRow, ContentAssetRow, PlaybookRow } from "./types";

const STALE_AFTER_DAYS = 120;

export async function getContentAssets(): Promise<ContentAssetRow[]> {
  const assets = await prisma.contentAsset.findMany({ orderBy: { title: "asc" } });
  const staleThreshold = Date.now() - STALE_AFTER_DAYS * 86400000;
  return assets.map((a) => ({
    id: a.id,
    title: a.title,
    assetType: a.assetType,
    personaTags: (a.personaTags as string[]) ?? [],
    productTags: (a.productTags as string[]) ?? [],
    programTags: (a.programTags as string[]) ?? [],
    lastVerifiedAt: a.lastVerifiedAt.toISOString(),
    isStale: a.lastVerifiedAt.getTime() < staleThreshold,
  }));
}

export async function getPlaybooks(): Promise<PlaybookRow[]> {
  const playbooks = await prisma.playbook.findMany({ orderBy: [{ contactPersona: "asc" }, { productType: "asc" }] });
  return playbooks.map((p) => ({
    id: p.id,
    title: p.title,
    contactPersona: p.contactPersona,
    productType: p.productType,
    steps: ((p.steps as { steps?: string[] })?.steps ?? []) as string[],
  }));
}

// Certification.programId is a bare scalar (no Prisma relation) — join manually.
export async function getCertifications(): Promise<CertificationRow[]> {
  const [certs, programs] = await Promise.all([
    prisma.certification.findMany({ orderBy: { name: "asc" } }),
    prisma.pricingProgram.findMany({ select: { id: true, name: true } }),
  ]);
  const programNameById = new Map(programs.map((p) => [p.id, p.name]));
  return certs.map((c) => ({
    id: c.id,
    name: c.name,
    programName: c.programId ? (programNameById.get(c.programId) ?? null) : null,
    description: c.description,
  }));
}
