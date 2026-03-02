"use client";

import { ExclamationTriangleIcon, EnvelopeClosedIcon, CheckboxIcon, GearIcon } from "@radix-ui/react-icons";
import { Flex } from "@radix-ui/themes";
import { useUser } from "@clerk/nextjs";
import { NavLink } from "@/components/ui";
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
      <NavLink href="/admin/deep-planner">
        <Flex align="center" gap="1">
          <CheckboxIcon width={15} height={15} />
          tasks
        </Flex>
      </NavLink>
      {isEmailsUser && (
        <NavLink href="/admin/emails" title="Emails">
          <Flex align="center" gap="1">
            <EnvelopeClosedIcon width={14} height={14} />
            emails
          </Flex>
        </NavLink>
      )}
      <NavLink href="/admin/reported-jobs" title="Reported jobs review">
        <Flex align="center" gap="1">
          <ExclamationTriangleIcon width={14} height={14} style={{ color: "var(--orange-9)" }} />
          reported
        </Flex>
      </NavLink>
      <NavLink href="/admin/workers" title="Workers">
        <Flex align="center" gap="1">
          <GearIcon width={14} height={14} />
          workers
        </Flex>
      </NavLink>
    </>
  );
}
