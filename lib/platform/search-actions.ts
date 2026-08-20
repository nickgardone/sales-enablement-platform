"use server";

import { getCurrentUser } from "./current-user";
import { searchGlobal } from "./search";

export async function search(query: string) {
  const user = await getCurrentUser();
  return searchGlobal(user, query);
}
