import { cookies } from "next/headers";

export const DEGRADED_MODE_COOKIE = "degraded_mode";

/**
 * Degraded mode (spec Section 7): a host-shell-level toggle simulating a
 * source-system outage — a nod to real dealer-software outage risk, treated
 * as a product concern rather than an SRE afterthought. Persisted as a cookie
 * (like the persona switcher) since there's no real auth session to hang it
 * off of in this prototype.
 */
export async function getDegradedMode(): Promise<boolean> {
  const cookieStore = await cookies();
  return cookieStore.get(DEGRADED_MODE_COOKIE)?.value === "true";
}
