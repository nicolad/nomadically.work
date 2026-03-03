"use client";

import { Flex, Text, Button } from "@radix-ui/themes";
import { DeleteAllJobsButton } from "./delete-all-jobs-button";
import { ProcessAllJobsButton } from "./process-all-jobs-button";
import { Card, Badge } from "@/components/ui";
import { useSearchParams, useRouter } from "next/navigation";

interface AdminBarProps {
  userEmail: string | null;
}

export function AdminBar({ userEmail }: AdminBarProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const showAll = searchParams.get("showAll") === "1";

  const toggleShowAll = () => {
    const params = new URLSearchParams(searchParams.toString());
    if (showAll) {
      params.delete("showAll");
    } else {
      params.set("showAll", "1");
    }
    router.push(`?${params.toString()}`, { scroll: false });
  };

  return (
    <Card padding="2" mb="2">
      <Flex align="center" gap="2">
        <Badge variant="orange">admin</Badge>
        <Flex gap="2" flexGrow="1" wrap="wrap">
          <DeleteAllJobsButton />
          <ProcessAllJobsButton />
          <Button size="1" variant={showAll ? "solid" : "outline"} color="orange" onClick={toggleShowAll}>
            {showAll ? "showing all" : "show all"}
          </Button>
        </Flex>
        <Text size="1" color="gray">{userEmail}</Text>
      </Flex>
    </Card>
  );
}
