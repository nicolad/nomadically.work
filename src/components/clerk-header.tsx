"use client";

import { Button, Flex } from "@radix-ui/themes";
import { GearIcon } from "@radix-ui/react-icons";
import Link from "next/link";
import {
  SignInButton,
  SignUpButton,
  SignedIn,
  SignedOut,
  UserButton,
} from "@clerk/nextjs";

export function ClerkHeader() {
  return (
    <Flex gap="4" align="center">
      <SignedOut>
        <SignInButton mode="modal">
          <Button variant="ghost" style={{ cursor: "pointer" }}>
            Sign In
          </Button>
        </SignInButton>
        <SignUpButton mode="modal">
          <Button style={{ cursor: "pointer" }}>Sign Up</Button>
        </SignUpButton>
      </SignedOut>
      <SignedIn>
        <Link href="/settings" style={{ display: "flex", alignItems: "center" }}>
          <GearIcon width={32} height={32} style={{ color: "#888888" }} />
        </Link>
        <UserButton />
      </SignedIn>
    </Flex>
  );
}
