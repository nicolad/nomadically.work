"use client";

import Link from "next/link";
import { ExclamationTriangleIcon } from "@radix-ui/react-icons";
import { useUser } from "@clerk/nextjs";
import { ADMIN_EMAIL } from "@/lib/constants";

export function AdminNav() {
  const { isLoaded, isSignedIn, user } = useUser();

  if (!isLoaded || !isSignedIn) return null;

  const userEmail =
    user.primaryEmailAddress?.emailAddress ??
    user.emailAddresses[0]?.emailAddress;
  const isAdmin = userEmail?.toLowerCase() === ADMIN_EMAIL.toLowerCase();

  if (!isAdmin) return null;

  return (
    <>
      <Link href="/admin/deep-planner">tasks</Link>
      <Link
        href="/admin/reported-jobs"
        style={{ display: "flex", alignItems: "center" }}
        title="Reported jobs review"
      >
        <ExclamationTriangleIcon
          width={14}
          height={14}
          style={{ color: "var(--orange-9)" }}
        />
      </Link>
    </>
  );
}
