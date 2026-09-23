import { Suspense } from "react";
import { ProfilePage } from "@/components/profile-form";
import { LoadingSkeleton } from "@/components/ui";
export default function Page() {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <ProfilePage />
    </Suspense>
  );
}
