import type { Metadata } from "next";
import "@radix-ui/themes/styles.css";
import "./globals.css";
import { Theme, Flex, Box } from "@radix-ui/themes";
import {
  GitHubLogoIcon,
  BackpackIcon,
  FileTextIcon,
  PersonIcon,
  ResumeIcon,
  ChatBubbleIcon,
  MagicWandIcon,
  LightningBoltIcon,
} from "@radix-ui/react-icons";
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

const NAV_ITEMS = [
  { href: "/", label: "jobs", icon: <BackpackIcon width={15} height={15} /> },
  { href: "/applications", label: "applications", icon: <FileTextIcon width={15} height={15} /> },
  { href: "/companies", label: "companies", icon: <PersonIcon width={15} height={15} /> },
  { href: "/prep", label: "prep", icon: <LightningBoltIcon width={15} height={15} /> },
  { href: "/resume", label: "resume", icon: <ResumeIcon width={15} height={15} /> },
  { href: "/prompts", label: "prompts", icon: <MagicWandIcon width={15} height={15} /> },
  { href: "/chats", label: "query", icon: <ChatBubbleIcon width={15} height={15} /> },
];

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
              <Flex minHeight="100vh">
                {/* ── left sidebar ── */}
                <Flex
                  asChild
                  direction="column"
                  p="4"
                  gap="2"
                  flexShrink="0"
                  style={{
                    width: 200,
                    borderRight: "1px solid var(--gray-6)",
                    background: "var(--gray-2)",
                    position: "sticky",
                    top: 0,
                    height: "100vh",
                    overflowY: "auto",
                    fontSize: 14,
                    letterSpacing: "0.01em",
                  }}
                >
                  <nav>
                    <Link href="/" style={{ display: "flex", alignItems: "center" }}>
                      <Image
                        src="/logo.svg"
                        alt="Nomadically"
                        width={190}
                        height={30}
                        priority
                      />
                    </Link>

                    {/* primary links */}
                    <Flex direction="column" gap="1" mt="5" flexGrow="1">
                      {NAV_ITEMS.map(({ href, label, icon }) => (
                        <NavLink key={href} href={href} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          {icon}
                          {label}
                        </NavLink>
                      ))}
                      <AdminNav />
                    </Flex>

                    {/* footer: auth + github */}
                    <Flex
                      direction="column"
                      gap="3"
                      pt="3"
                      mt="auto"
                      style={{ borderTop: "1px solid var(--gray-6)" }}
                    >
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
                    </Flex>
                  </nav>
                </Flex>

                {/* ── main content ── */}
                <Box flexGrow="1" minWidth="0" style={{ overflowY: "auto" }}>
                  {children}
                </Box>
              </Flex>
            </Providers>
          </Theme>
        </body>
      </html>
    </ClerkProvider>
  );
}
