"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { safePath } from "@/validators/navigation";
export function ApiNavigation() {
  const router = useRouter();
  useEffect(() => {
    const listener = (event: Event) => {
      if (event instanceof CustomEvent && typeof event.detail === "string")
        router.replace(safePath(event.detail, "/login"));
    };
    window.addEventListener("api:navigate", listener);
    return () => window.removeEventListener("api:navigate", listener);
  }, [router]);
  return null;
}
