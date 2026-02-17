"use client";

import { Flex } from "@radix-ui/themes";
import { DeleteAllJobsButton } from "./delete-all-jobs-button";
import { ProcessAllJobsButton } from "./process-all-jobs-button";

interface AdminBarProps {
  userEmail: string | null;
}

export function AdminBar({ userEmail }: AdminBarProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "6px 12px",
        marginBottom: 8,
        background: "var(--gray-2)",
        border: "1px solid var(--gray-6)",
        borderRadius: 0,
      }}
    >
      <span
        style={{
          fontSize: 10,
          padding: "0 4px",
          border: "1px solid var(--accent-9)",
          color: "var(--accent-9)",
          lineHeight: "16px",
          textTransform: "lowercase",
        }}
      >
        admin
      </span>
      <Flex gap="2" flexGrow="1" wrap="wrap">
        <DeleteAllJobsButton />
        <ProcessAllJobsButton />
      </Flex>
      <span className="yc-row-meta">{userEmail}</span>
    </div>
  );
}
