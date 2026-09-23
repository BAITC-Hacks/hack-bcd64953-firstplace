import { Suspense } from "react";
import { NotificationsPage } from "@/components/secondary-pages";
import { LoadingSkeleton } from "@/components/ui";
export default function Page() {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <NotificationsPage role="business" />
    </Suspense>
  );
}
