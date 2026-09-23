import { Suspense } from "react";
import { CSVCheck } from "@/components/csv-pages";
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
      <CSVCheck id={id} />
    </Suspense>
  );
}
