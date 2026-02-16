"use client";

import { Button, AlertDialog, Flex, Text } from "@radix-ui/themes";
import { useState } from "react";
import { useProcessAllJobsMutation } from "@/__generated__/hooks";

export function ProcessAllJobsButton() {
  const [open, setOpen] = useState(false);
  const [processAllJobs, { loading }] = useProcessAllJobsMutation();
  const [result, setResult] = useState<{
    enhanced?: number | null;
    enhanceErrors?: number | null;
    processed?: number | null;
    euRemote?: number | null;
    nonEuRemote?: number | null;
    errors?: number | null;
  } | null>(null);

  const handleProcessAll = async () => {
    try {
      const res = await processAllJobs({
        refetchQueries: ["GetJobs"],
        awaitRefetchQueries: true,
      });

      if (res.data?.processAllJobs?.success) {
        setResult({
          enhanced: res.data.processAllJobs.enhanced,
          enhanceErrors: res.data.processAllJobs.enhanceErrors,
          processed: res.data.processAllJobs.processed,
          euRemote: res.data.processAllJobs.euRemote,
          nonEuRemote: res.data.processAllJobs.nonEuRemote,
          errors: res.data.processAllJobs.errors,
        });
        setOpen(false);
      } else {
      }
    } catch (error) {
      console.error("Error processing all jobs:", error);
    }
  };

  return (
    <Button
      variant="solid"
      color="blue"
      onClick={handleProcessAll}
      disabled={loading}
    >
      {loading ? "Processing..." : "Process All Jobs"}
    </Button>
  );
}
