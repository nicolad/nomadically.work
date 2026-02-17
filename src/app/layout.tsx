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
      <html lang="en" style={{ fontFamily: "var(--yc-font-body)" }}>
        <body>
          <Theme appearance="dark" accentColor="orange">
            <Providers>
              {/* ── YC orange topbar ── */}
              <div className="yc-topbar">
                <Link
                  href="/"
                  style={{ display: "flex", alignItems: "center" }}
                >
                  <Image
                    src="/logo.svg"
                    alt="Nomadically"
                    width={120}
                    height={18}
                    priority
                    style={{ marginRight: 12 }}
                  />
                </Link>
                <span style={{ flex: 1 }} />
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: "var(--orange-contrast)",
                  }}
                >
                  remote eu jobs
                </span>
              </div>

              {/* ── flat nav strip ── */}
              <nav className="yc-nav">
                <Link href="/">jobs</Link>
                <Link href="/applications">applications</Link>
                <Link href="/companies">companies</Link>
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
