"use server";

import { cookies } from "next/headers";
import { DEGRADED_MODE_COOKIE } from "./degraded-mode";

export async function setDegradedMode(enabled: boolean) {
  const cookieStore = await cookies();
  if (enabled) {
    cookieStore.set(DEGRADED_MODE_COOKIE, "true", { path: "/" });
  } else {
    cookieStore.delete(DEGRADED_MODE_COOKIE);
  }
}
