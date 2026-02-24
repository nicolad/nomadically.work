"use client";

import { GearIcon } from "@radix-ui/react-icons";
import Link from "next/link";
import { useUser, useClerk } from "@clerk/nextjs";
import { Button } from "@/components/ui";

export function AuthHeader() {
  const { isLoaded, isSignedIn, user } = useUser();
  const { signOut } = useClerk();

  if (!isLoaded) {
    return (
      <span className="yc-row-meta" style={{ padding: "0 4px" }}>
        …
      </span>
    );
  }

  if (!isSignedIn) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <Link href="/sign-in">
          <Button variant="ghost" size="sm" style={{ width: "100%" }}>sign in</Button>
        </Link>
        <Link href="/sign-up">
          <Button variant="primary" size="sm" style={{ width: "100%" }}>sign up</Button>
        </Link>
      </div>
    );
  }

  const displayName =
    user.fullName ||
    user.primaryEmailAddress?.emailAddress ||
    user.username;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span
        style={{
          color: "var(--gray-9)",
          fontSize: 12,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
        title={displayName ?? undefined}
      >
        {displayName}
      </span>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Link href="/settings" style={{ display: "flex", alignItems: "center" }}>
          <GearIcon width={14} height={14} style={{ color: "var(--gray-9)" }} />
        </Link>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => signOut({ redirectUrl: "/" })}
        >
          sign out
        </Button>
      </div>
    </div>
  );
}
