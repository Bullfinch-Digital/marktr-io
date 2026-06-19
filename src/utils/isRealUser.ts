import type { User } from "@supabase/supabase-js";

export function isRealUser(user: User | null | undefined): boolean {
  return Boolean(user && !(user as { is_anonymous?: boolean }).is_anonymous);
}
