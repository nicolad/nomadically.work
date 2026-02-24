"use client";

import Link from "next/link";
import { ExclamationTriangleIcon, EnvelopeClosedIcon, CheckboxIcon } from "@radix-ui/react-icons";
import { useUser } from "@clerk/nextjs";
import { ADMIN_EMAIL } from "@/lib/constants";

export function AdminNav() {
  const { isLoaded, isSignedIn, user } = useUser();

  if (!isLoaded || !isSignedIn) return null;

  const userEmail =
    user.primaryEmailAddress?.emailAddress ??
    user.emailAddresses[0]?.emailAddress;
  const isAdmin = userEmail?.toLowerCase() === ADMIN_EMAIL.toLowerCase();
  const isEmailsUser = userEmail?.toLowerCase() === "contact@vadim.blog";

  if (!isAdmin) return null;

  return (
    <>
      <Link href="/admin/deep-planner" style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <CheckboxIcon width={15} height={15} />
        tasks
      </Link>
      {isEmailsUser && (
        <Link
          href="/admin/emails"
          style={{ display: "flex", alignItems: "center", gap: 6 }}
          title="Emails"
        >
          <EnvelopeClosedIcon width={14} height={14} />
          emails
        </Link>
      )}
      <Link
        href="/admin/reported-jobs"
        style={{ display: "flex", alignItems: "center", gap: 6 }}
        title="Reported jobs review"
      >
        <ExclamationTriangleIcon
          width={14}
          height={14}
          style={{ color: "var(--orange-9)" }}
        />
        reported
      </Link>
    </>
  );
}
