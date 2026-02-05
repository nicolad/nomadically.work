import type { Metadata } from "next";
import localFont from "next/font/local";
import "@radix-ui/themes/styles.css";
import "./globals.css";
import styles from "./layout.module.css";
import { Theme } from "@radix-ui/themes";
import Image from "next/image";
import Link from "next/link";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

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
          <header className={styles.header}>
            <Link href="/" className={styles.logoContainer}>
              <Image
                src="/logo.svg"
                alt="Nomadically Logo"
                width={240}
                height={56}
                priority
                className={styles.logo}
              />
            </Link>
          </header>
          {children}
        </Theme>
      </body>
    </html>
  );
}
