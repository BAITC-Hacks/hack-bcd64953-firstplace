import { Suspense } from "react";
import { ApplicationList } from "@/components/application-pages";
import { LoadingSkeleton } from "@/components/ui";
export default function Page() {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <ApplicationList role="business" />
    </Suspense>
  );
}
