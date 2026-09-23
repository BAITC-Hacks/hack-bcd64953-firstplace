import { Suspense } from "react";
import { AuthForm } from "@/components/auth-form";
import { LoadingSkeleton } from "@/components/ui";
export default function Page() {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <AuthForm mode="reset" />
    </Suspense>
  );
}
