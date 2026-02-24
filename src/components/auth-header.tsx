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
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Link href="/sign-in">
          <Button variant="ghost" size="sm">sign in</Button>
        </Link>
        <Link href="/sign-up">
          <Button variant="primary" size="sm">sign up</Button>
        </Link>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span
        style={{
          color: "var(--gray-9)",
        }}
      >
        {user.fullName ||
          user.primaryEmailAddress?.emailAddress ||
          user.username}
      </span>
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
  );
}
