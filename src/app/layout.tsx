import type { Metadata } from "next";
import "@radix-ui/themes/styles.css";
import "./globals.css";
import { Theme, Flex } from "@radix-ui/themes";
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
          <Flex asChild justify="center" align="center">
            <header>
              <Link href="/" style={{ display: "flex" }}>
                <Image
                  src="/logo.svg"
                  alt="Nomadically Logo"
                  width={360}
                  height={84}
                  priority
                />
              </Link>
            </header>
          </Flex>
          {children}
        </Theme>
      </body>
    </html>
  );
}
