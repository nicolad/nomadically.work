"use client";

import { GearIcon, ExclamationTriangleIcon } from "@radix-ui/react-icons";
import Link from "next/link";
import { useUser, useClerk } from "@clerk/nextjs";
import { ADMIN_EMAIL } from "@/lib/constants";

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

  const isAdmin = user.primaryEmailAddress?.emailAddress === ADMIN_EMAIL;

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
      {isAdmin && (
        <Link
          href="/admin/reported-jobs"
          style={{ display: "flex", alignItems: "center" }}
          title="Reported jobs review"
        >
          <ExclamationTriangleIcon width={14} height={14} style={{ color: "var(--orange-9)" }} />
        </Link>
      )}
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
