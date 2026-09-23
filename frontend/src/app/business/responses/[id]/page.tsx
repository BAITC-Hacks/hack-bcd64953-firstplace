import { Suspense } from "react";
import { ResponseDetails } from "@/components/response-pages";
import { LoadingSkeleton } from "@/components/ui";
import { notFound } from "next/navigation";
import { isUuid } from "@/validators/csv";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <ResponseDetails role="business" id={id} />
    </Suspense>
  );
}
