import { Suspense } from "react";
import { ResponseList } from "@/components/response-pages";
import { LoadingSkeleton } from "@/components/ui";
export default function Page() {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <ResponseList role="student" />
    </Suspense>
  );
}
