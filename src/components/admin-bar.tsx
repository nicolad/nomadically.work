"use client";

import { Flex, Button, Badge, Text } from "@radix-ui/themes";
import Link from "next/link";
import { DeleteAllJobsButton } from "./delete-all-jobs-button";
import { ProcessAllJobsButton } from "./process-all-jobs-button";

interface AdminBarProps {
  userEmail: string | null;
}

export function AdminBar({ userEmail }: AdminBarProps) {
  return (
    <Flex
      gap="3"
      mb="4"
      p="3"
      style={{
        background: "var(--accent-2)",
        borderRadius: "var(--radius-3)",
        border: "1px solid var(--accent-6)",
      }}
      wrap="wrap"
      align="center"
    >
      <Badge color="orange" size="2">
        Admin
      </Badge>
      <Flex gap="2" flexGrow="1" wrap="wrap">
        <DeleteAllJobsButton />
        <ProcessAllJobsButton />
      </Flex>
      <Text size="1" color="gray">
        {userEmail}
      </Text>
    </Flex>
  );
}
