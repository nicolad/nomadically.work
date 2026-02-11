import type { Metadata } from "next";
import "@radix-ui/themes/styles.css";
import "./globals.css";
import { Theme, Flex, Container, Button } from "@radix-ui/themes";
import { GitHubLogoIcon } from "@radix-ui/react-icons";
import Image from "next/image";
import Link from "next/link";
import { AuthHeader } from "@/components/auth-header";
import { Providers } from "@/components/providers";

export const metadata: Metadata = {
  title: "Nomadically.Work",
  description:
    "Fully remote jobs within the EU - Find remote positions you can work from anywhere in Europe",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" style={{ fontFamily: "var(--font-geist-sans)" }}>
      <body>
        <Theme appearance="dark">
          <Providers>
            <header>
              <Container size="4">
                <Flex justify="between" align="center" py="4">
                  <Link href="/" style={{ display: "flex" }}>
                    <Image
                      src="/logo.svg"
                      alt="Nomadically Logo"
                      width={600}
                      height={100}
                      priority
                    />
                  </Link>
                  <Flex gap="4" align="center">
                    <Link href="/companies">
                      <Button variant="soft">Companies</Button>
                    </Link>
                    <Link href="/prompts">
                      <Button variant="soft">Prompts</Button>
                    </Link>
                    <Link href="/chats">
                      <Button variant="soft">Query</Button>
                    </Link>
                    <AuthHeader />
                    <Link
                      href="https://github.com/nicolad/nomadically.work"
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ display: "flex", alignItems: "center" }}
                    >
                      <GitHubLogoIcon
                        width={32}
                        height={32}
                        style={{ color: "#888888" }}
                      />
                    </Link>
                  </Flex>
                </Flex>
              </Container>
            </header>
            {children}
          </Providers>
        </Theme>
      </body>
    </html>
  );
}
