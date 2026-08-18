"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { PERSONA_COOKIE } from "./current-user";

export async function switchPersona(userId: string) {
  const cookieStore = await cookies();
  cookieStore.set(PERSONA_COOKIE, userId, { path: "/", sameSite: "lax" });
  revalidatePath("/", "layout");
}
