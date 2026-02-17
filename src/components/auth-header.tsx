"use client";

import { GearIcon } from "@radix-ui/react-icons";
import Link from "next/link";
import { useUser, useClerk } from "@clerk/nextjs";

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
          <button className="yc-cta-ghost">sign in</button>
        </Link>
        <Link href="/sign-up">
          <button className="yc-cta">sign up</button>
        </Link>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span
        style={{
          fontFamily: "var(--yc-font-mono)",
          fontSize: "var(--yc-font-size-mono)",
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
      <button
        className="yc-cta-ghost"
        onClick={() => signOut({ redirectUrl: "/" })}
      >
        sign out
      </button>
    </div>
  );
}
