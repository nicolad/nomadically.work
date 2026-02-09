"use client";

import { Button, Flex } from "@radix-ui/themes";
import { GearIcon } from "@radix-ui/react-icons";
import Link from "next/link";
import { useAuth, useSignOut } from "@/auth/hooks";

export function AuthHeader() {
  const { user, loading } = useAuth();
  const { signOut } = useSignOut();

  if (loading) {
    return (
      <Flex gap="4" align="center">
        <Button disabled>Loading...</Button>
      </Flex>
    );
  }

  if (!user) {
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
      <Link href="/settings" style={{ display: "flex", alignItems: "center" }}>
        <GearIcon width={32} height={32} style={{ color: "#888888" }} />
      </Link>
      <Button
        variant="soft"
        onClick={() => signOut()}
        style={{ cursor: "pointer" }}
      >
        Sign Out
      </Button>
    </Flex>
  );
}
