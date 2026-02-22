"use client";

import { Button, Text, Flex } from "@radix-ui/themes";
import { useState } from "react";
import { useProcessAllJobsMutation } from "@/__generated__/hooks";

export function ProcessAllJobsButton() {
  const [processAllJobs, { loading }] = useProcessAllJobsMutation();
  const [result, setResult] = useState<{
    message?: string | null;
    enhanced?: number | null;
    enhanceErrors?: number | null;
    processed?: number | null;
    euRemote?: number | null;
    nonEuRemote?: number | null;
    errors?: number | null;
  } | null>(null);

  const handleProcessAll = async () => {
    setResult(null);
    try {
      const res = await processAllJobs({
        refetchQueries: ["GetJobs"],
        awaitRefetchQueries: true,
      });

      const data = res.data?.processAllJobs;
      if (data) {
        setResult({
          message: data.message,
          enhanced: data.enhanced,
          enhanceErrors: data.enhanceErrors,
          processed: data.processed,
          euRemote: data.euRemote,
          nonEuRemote: data.nonEuRemote,
          errors: data.errors,
        });
      }
    } catch (error) {
      setResult({ message: `Error: ${error instanceof Error ? error.message : String(error)}` });
    }
  };

  return (
    <Flex direction="column" gap="1" align="start">
      <Button
        variant="solid"
        color="blue"
        onClick={handleProcessAll}
        disabled={loading}
      >
        {loading ? "Enhancing & Classifying..." : "Enhance & Classify All"}
      </Button>
      {result?.message && (
        <Text size="1" color="gray">{result.message}</Text>
      )}
    </Flex>
  );
}
