"use client";

import { Flex } from "@radix-ui/themes";
import { DeleteAllJobsButton } from "./delete-all-jobs-button";
import { ProcessAllJobsButton } from "./process-all-jobs-button";
import { Card, Badge } from "@/components/ui";

interface AdminBarProps {
  userEmail: string | null;
}

export function AdminBar({ userEmail }: AdminBarProps) {
  return (
    <Card padding="2" style={{ marginBottom: 8 }}>
      <Flex align="center" gap="2">
        <Badge variant="orange">admin</Badge>
        <Flex gap="2" flexGrow="1" wrap="wrap">
          <DeleteAllJobsButton />
          <ProcessAllJobsButton />
        </Flex>
        <span className="yc-row-meta">{userEmail}</span>
      </Flex>
    </Card>
  );
}
