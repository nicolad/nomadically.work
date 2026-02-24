import type { Metadata } from "next";
import "@radix-ui/themes/styles.css";
import "./globals.css";
import { Theme } from "@radix-ui/themes";
import { GitHubLogoIcon } from "@radix-ui/react-icons";
import Image from "next/image";
import Link from "next/link";
import { ClerkProvider } from "@clerk/nextjs";
import { AuthHeader } from "@/components/auth-header";
import { AdminNav } from "@/components/admin-nav";
import { Providers } from "@/components/providers";
import { NavLink } from "@/components/ui";
import { Inter } from "next/font/google";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

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
        <body className={inter.variable}>
          <Theme appearance="dark">
            <Providers>
              <div className="yc-app-shell">
                {/* ── left sidebar nav ── */}
                <nav className="yc-nav">
                  <Link href="/" style={{ display: "flex", alignItems: "center" }}>
                    <Image
                      src="/logo.svg"
                      alt="Nomadically"
                      width={160}
                      height={22}
                      priority
                    />
                  </Link>
                  <div className="yc-nav-links">
                    <NavLink href="/">jobs</NavLink>
                    <NavLink href="/applications">applications</NavLink>
                    <NavLink href="/companies">companies</NavLink>
                    <NavLink href="/prep">prep</NavLink>
                    <NavLink href="/resume">resume</NavLink>
                    <NavLink href="/prompts">prompts</NavLink>
                    <NavLink href="/chats">query</NavLink>
                    <AdminNav />
                  </div>
                  <div className="yc-nav-footer">
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
                  </div>
                </nav>

                <main className="yc-main">{children}</main>
              </div>
            </Providers>
          </Theme>
        </body>
      </html>
    </ClerkProvider>
  );
}
