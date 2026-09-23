import type { Role } from "@/types/api";
export function safePath(
  value: string | null | undefined,
  fallback = "/complete-profile",
): string {
  if (
    !value ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    /[\\\r\n]/.test(value)
  )
    return fallback;
  return value;
}
export function roleDestination(role: Role, requested?: string | null) {
  const next = safePath(requested, `/${role}/dashboard`);
  return next.startsWith(`/${role}/`) ? next : `/${role}/dashboard`;
}
export function httpUrl(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) ? url.href : undefined;
  } catch {
    return undefined;
  }
}
