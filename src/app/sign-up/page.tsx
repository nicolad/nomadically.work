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

export default function SignUpPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setLoading(true);

    try {
      const result = await authClient.signUp.email(
        { email, password, name },
        {
          onSuccess: () => {
            router.push("/");
            router.refresh();
          },
          onError: (err) => {
            setError(err.error?.message || "Sign up failed");
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
        <Heading>Create Account</Heading>

        <Card style={{ width: "100%", maxWidth: "400px" }}>
          <form onSubmit={handleSignUp}>
            <Flex direction="column" gap="4">
              <div>
                <Text as="label" size="2">
                  Name
                </Text>
                <TextField.Root
                  type="text"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

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
                <Text size="1" color="gray">
                  At least 8 characters
                </Text>
              </div>

              <div>
                <Text as="label" size="2">
                  Confirm Password
                </Text>
                <TextField.Root
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
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
                {loading ? "Creating account..." : "Sign Up"}
              </Button>
            </Flex>
          </form>
        </Card>

        <Text size="2">
          Already have an account?{" "}
          <Link href="/sign-in" style={{ color: "var(--blue-11)" }}>
            Sign in
          </Link>
        </Text>
      </Flex>
    </Container>
  );
}
