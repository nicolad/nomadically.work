"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Container,
  Heading,
  TextField,
  Button,
  Text,
  Flex,
  Card,
} from "@radix-ui/themes";
import { authClient } from "@/lib/auth-client";

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const result = await authClient.signIn.email(
        { email, password },
        {
          onSuccess: () => {
            router.push("/");
            router.refresh();
          },
          onError: (err) => {
            setError(err.error?.message || "Sign in failed");
          },
        },
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container size="1" px="4" py="8">
      <Flex direction="column" gap="6" align="center">
        <Heading>Sign In</Heading>

        <Card style={{ width: "100%", maxWidth: "400px" }}>
          <form onSubmit={handleSignIn}>
            <Flex direction="column" gap="4">
              <div>
                <Text as="label" size="2">
                  Email
                </Text>
                <TextField.Root
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              <div>
                <Text as="label" size="2">
                  Password
                </Text>
                <TextField.Root
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              {error && (
                <Text color="red" size="2">
                  {error}
                </Text>
              )}

              <Button
                type="submit"
                disabled={loading}
                style={{ width: "100%" }}
              >
                {loading ? "Signing in..." : "Sign In"}
              </Button>
            </Flex>
          </form>
        </Card>

        <Text size="2">
          Don't have an account?{" "}
          <Link href="/sign-up" style={{ color: "var(--blue-11)" }}>
            Sign up
          </Link>
        </Text>
      </Flex>
    </Container>
  );
}
