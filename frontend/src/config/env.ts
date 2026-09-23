export const env = {
  apiBase: (
    process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api/v1"
  ).replace(/\/$/, ""),
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
};
export const authConfigured = Boolean(env.supabaseUrl && env.supabaseKey);
