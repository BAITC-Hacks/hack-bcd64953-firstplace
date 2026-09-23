import { Suspense } from "react";
import { Dashboard } from "@/components/secondary-pages";
import { LoadingSkeleton } from "@/components/ui";
export default function Page() {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <Dashboard role="student" />
    </Suspense>
  );
}
