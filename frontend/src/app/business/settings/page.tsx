import { Suspense } from "react";
import { SettingsPage } from "@/components/secondary-pages";
import { LoadingSkeleton } from "@/components/ui";
export default function Page() {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <SettingsPage />
    </Suspense>
  );
}
