import { Suspense } from "react";
import { CreateApplication } from "@/components/application-pages";
import { LoadingSkeleton } from "@/components/ui";
export default function Page() {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <CreateApplication />
    </Suspense>
  );
}
