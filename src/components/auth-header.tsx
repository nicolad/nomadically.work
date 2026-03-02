"use client";

import { GearIcon } from "@radix-ui/react-icons";
import Link from "next/link";
import { useUser, useClerk } from "@clerk/nextjs";
import { Flex, Text } from "@radix-ui/themes";
import { Button } from "@/components/ui";

export function AuthHeader() {
  const { isLoaded, isSignedIn, user } = useUser();
  const { signOut } = useClerk();

  if (!isLoaded) {
    return (
      <Text size="1" color="gray" px="1">
        …
      </Text>
    );
  }

  if (!isSignedIn) {
    return (
      <Flex direction="column" gap="2">
        <Link href="/sign-in">
          <Button variant="ghost" size="sm" style={{ width: "100%" }}>sign in</Button>
        </Link>
        <Link href="/sign-up">
          <Button variant="primary" size="sm" style={{ width: "100%" }}>sign up</Button>
        </Link>
      </Flex>
    );
  }

  const displayName =
    user.fullName ||
    user.primaryEmailAddress?.emailAddress ||
    user.username;

  return (
    <Flex direction="column" gap="2">
      <Text
        size="1"
        color="gray"
        truncate
        title={displayName ?? undefined}
      >
        {displayName}
      </Text>
      <Flex align="center" gap="2">
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
      </Flex>
    </Flex>
  );
}
