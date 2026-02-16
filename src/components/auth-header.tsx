"use client";

import { Button, Flex } from "@radix-ui/themes";
import { GearIcon } from "@radix-ui/react-icons";
import Link from "next/link";
import { useUser, useClerk } from "@clerk/nextjs";

export function AuthHeader() {
  const { isLoaded, isSignedIn, user } = useUser();
  const { signOut } = useClerk();

  if (!isLoaded) {
    return (
      <Flex gap="4" align="center">
        <Button disabled>Loading...</Button>
      </Flex>
    );
  }

  if (!isSignedIn) {
    return (
      <Flex gap="4" align="center">
        <Link href="/sign-in">
          <Button variant="ghost">Sign In</Button>
        </Link>
        <Link href="/sign-up">
          <Button>Sign Up</Button>
        </Link>
      </Flex>
    );
  }

  return (
    <Flex gap="4" align="center">
      <span style={{ color: "#888888", fontSize: "14px" }}>
        {user.fullName || user.primaryEmailAddress?.emailAddress || user.username}
      </span>
      <Link href="/settings" style={{ display: "flex", alignItems: "center" }}>
        <GearIcon width={32} height={32} style={{ color: "#888888" }} />
      </Link>
      <Button
        variant="soft"
        onClick={() => signOut({ redirectUrl: "/" })}
        style={{ cursor: "pointer" }}
      >
        Sign Out
      </Button>
    </Flex>
  );
}
