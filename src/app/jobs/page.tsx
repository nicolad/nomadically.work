import { JobsProvider } from "@/components/jobs-provider";
import { Suspense } from "react";

export default function JobsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <JobsProvider />
    </Suspense>
  );
}
