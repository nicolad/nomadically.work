import type { Metadata } from "next";
import "@radix-ui/themes/styles.css";
import "./globals.css";
import { Theme, Flex, Container } from "@radix-ui/themes";
import { GitHubLogoIcon } from "@radix-ui/react-icons";
import Image from "next/image";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Nomadically.Work",
  description: "Nomadically - Remote jobs",
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
            </Container>
          </header>
          {children}
        </Theme>
      </body>
    </html>
  );
}
