import type { Metadata } from "next";
import "@radix-ui/themes/styles.css";
import "./globals.css";
import { Theme, Container } from "@radix-ui/themes";
import { GitHubLogoIcon } from "@radix-ui/react-icons";
import Image from "next/image";
import Link from "next/link";
import { ClerkProvider } from "@clerk/nextjs";
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
    <ClerkProvider>
      <html lang="en">
        <body>
          <Theme appearance="dark">
            <Providers>
              {/* ── nav strip with logo ── */}
              <nav className="yc-nav">
                <Link
                  href="/"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    marginRight: 24,
                  }}
                >
                  <Image
                    src="/logo.svg"
                    alt="Nomadically"
                    width={200}
                    height={28}
                    priority
                  />
                </Link>
                <Link href="/">jobs</Link>
                <Link href="/applications">applications</Link>
                <Link href="/companies">companies</Link>
                <Link href="/prep">prep</Link>
                <Link href="/prompts">prompts</Link>
                <Link href="/chats">query</Link>
                <span style={{ flex: 1 }} />
                <AuthHeader />
                <Link
                  href="https://github.com/nicolad/nomadically.work"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: "flex", alignItems: "center" }}
                >
                  <GitHubLogoIcon
                    width={18}
                    height={18}
                    style={{ color: "var(--gray-9)" }}
                  />
                </Link>
              </nav>

              {children}
            </Providers>
          </Theme>
        </body>
      </html>
    </ClerkProvider>
  );
}
