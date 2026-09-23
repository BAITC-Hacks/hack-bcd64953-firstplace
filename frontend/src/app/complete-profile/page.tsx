import { Suspense } from "react";
import { Onboarding } from "@/components/profile-form";
import { LoadingSkeleton } from "@/components/ui";
export default function Page() {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <Onboarding />
    </Suspense>
  );
}
