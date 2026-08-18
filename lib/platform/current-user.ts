import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import type { CurrentUser } from "./types";

export const PERSONA_COOKIE = "demo_persona_user_id";
// Deterministic default from prisma/seed.ts — the golden-path demo associate (first
// of the 6 seeded associates, ~30-rooftop book).
const DEFAULT_PERSONA_EMAIL = "jordan.ellis@demo-lender.com";

async function toCurrentUser(userId: string): Promise<CurrentUser | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { associate: { include: { team: true } }, teamsLed: true },
  });
  if (!user) return null;

  const ledTeam = user.teamsLed[0] ?? null;
  const team = user.associate?.team ?? ledTeam ?? null;

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    associateId: user.associate?.id ?? null,
    teamId: team?.id ?? null,
    territoryId: team?.territoryId ?? null,
  };
}

export async function getCurrentUser(): Promise<CurrentUser> {
  const cookieStore = await cookies();
  const cookieUserId = cookieStore.get(PERSONA_COOKIE)?.value;

  if (cookieUserId) {
    const user = await toCurrentUser(cookieUserId);
    if (user) return user;
  }

  const fallback = await prisma.user.findFirstOrThrow({ where: { email: DEFAULT_PERSONA_EMAIL } });
  const user = await toCurrentUser(fallback.id);
  if (!user) throw new Error("Failed to resolve default demo persona.");
  return user;
}

export type SwitchablePersona = {
  id: string;
  name: string;
  role: CurrentUser["role"];
};

export async function listSwitchablePersonas(): Promise<SwitchablePersona[]> {
  const users = await prisma.user.findMany({
    orderBy: [{ role: "asc" }, { name: "asc" }],
    select: { id: true, name: true, role: true },
  });
  return users;
}
