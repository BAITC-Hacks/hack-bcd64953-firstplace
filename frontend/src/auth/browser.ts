import { createBrowserClient } from "@supabase/ssr";
import { authConfigured, env } from "@/config/env";
export function browserAuth() {
  if (!authConfigured)
    throw new Error("Для входа требуется настройка Supabase.");
  return createBrowserClient(env.supabaseUrl, env.supabaseKey);
}
