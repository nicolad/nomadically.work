import type { Metadata } from "next";
import "@radix-ui/themes/styles.css";
import "./globals.css";
import { Theme, Flex } from "@radix-ui/themes";
import { ClerkProvider } from "@clerk/nextjs";
import { Providers } from "@/components/providers";
import { SidebarProvider } from "@/components/sidebar-provider";
import { Sidebar, MainContent } from "@/components/sidebar";
import { ErrorBoundary } from "@/components/ErrorBoundary";
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
              <ErrorBoundary>
                <SidebarProvider>
                  <Sidebar />
                  <Flex minHeight="100vh">
                    <MainContent>{children}</MainContent>
                  </Flex>
                </SidebarProvider>
              </ErrorBoundary>
            </Providers>
          </Theme>
        </body>
      </html>
    </ClerkProvider>
  );
}
