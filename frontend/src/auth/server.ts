import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { authConfigured, env } from "@/config/env";
export async function serverAuth() {
  if (!authConfigured) return null;
  const jar = await cookies();
  return createServerClient(env.supabaseUrl, env.supabaseKey, {
    cookies: {
      getAll: () => jar.getAll(),
      setAll: (values) => {
        try {
          values.forEach(({ name, value, options }) =>
            jar.set(name, value, options),
          );
        } catch {
          /* Server Components cannot set cookies; proxy refreshes them. */
        }
      },
    },
  });
}
