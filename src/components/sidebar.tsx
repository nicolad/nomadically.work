"use client";

import { Flex, Box } from "@radix-ui/themes";
import {
  GitHubLogoIcon,
  BackpackIcon,
  FileTextIcon,
  PersonIcon,
  CubeIcon,
  ResumeIcon,
  ChatBubbleIcon,
  MagicWandIcon,
  LightningBoltIcon,
  DoubleArrowLeftIcon,
  DoubleArrowRightIcon,
} from "@radix-ui/react-icons";
import Image from "next/image";
import Link from "next/link";
import { NavLink } from "@/components/ui";
import { AuthHeader } from "@/components/auth-header";
import { AdminNav } from "@/components/admin-nav";
import { useSidebar } from "@/components/sidebar-provider";

const SIDEBAR_WIDTH = 200;
const SIDEBAR_COLLAPSED_WIDTH = 56;

const NAV_ITEMS = [
  { href: "/", label: "jobs", icon: <BackpackIcon width={15} height={15} /> },
  { href: "/applications", label: "applications", icon: <FileTextIcon width={15} height={15} /> },
  { href: "/opportunities", label: "opportunities", icon: <BackpackIcon width={15} height={15} /> },
  { href: "/companies", label: "companies", icon: <CubeIcon width={15} height={15} /> },
  { href: "/contacts", label: "contacts", icon: <PersonIcon width={15} height={15} /> },
  { href: "/prep", label: "prep", icon: <LightningBoltIcon width={15} height={15} /> },
  { href: "/resume", label: "resume", icon: <ResumeIcon width={15} height={15} /> },
  { href: "/prompts", label: "prompts", icon: <MagicWandIcon width={15} height={15} /> },
  { href: "/chats", label: "query", icon: <ChatBubbleIcon width={15} height={15} /> },
];

export function Sidebar() {
  const { collapsed, toggle } = useSidebar();

  const width = collapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_WIDTH;

  return (
    <Flex
      asChild
      direction="column"
      p={collapsed ? "2" : "4"}
      gap="2"
      flexShrink="0"
      style={{
        width,
        borderRight: "1px solid var(--gray-6)",
        background: "var(--gray-2)",
        position: "fixed",
        top: 0,
        left: 0,
        height: "100vh",
        overflowY: "hidden",
        overflowX: "hidden",
        fontSize: 14,
        letterSpacing: "0.01em",
        transition: "width 0.2s ease, padding 0.2s ease",
        zIndex: 10,
      }}
    >
      <nav>
        {/* logo */}
        <Link
          href="/"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            paddingLeft: collapsed ? 0 : 10,
            overflow: "hidden",
          }}
        >
          {collapsed ? (
            <Image src="/logo.svg" alt="Nomadically" width={32} height={32} priority style={{ objectFit: "contain" }} />
          ) : (
            <Image src="/logo.svg" alt="Nomadically" width={160} height={36} priority />
          )}
        </Link>

        {/* primary links */}
        <Flex direction="column" gap="1" mt="5" flexGrow="1">
          {NAV_ITEMS.map(({ href, label, icon }) => (
            <NavLink
              key={href}
              href={href}
              title={collapsed ? label : undefined}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                justifyContent: collapsed ? "center" : "flex-start",
                padding: collapsed ? "5px 0" : "5px 8px",
              }}
            >
              {icon}
              {!collapsed && <span>{label}</span>}
            </NavLink>
          ))}
          {!collapsed && <AdminNav />}
        </Flex>

        {/* footer: auth + github + toggle */}
        <Flex
          direction="column"
          gap="3"
          pt="3"
          mt="auto"
          style={{ borderTop: "1px solid var(--gray-6)" }}
        >
          {!collapsed && <AuthHeader />}
          <Flex align="center" justify={collapsed ? "center" : "between"}>
            {!collapsed && (
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
            )}
            <button
              onClick={toggle}
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "transparent",
                border: "none",
                color: "var(--gray-9)",
                cursor: "pointer",
                padding: 4,
                transition: "color 0.15s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "var(--gray-12)")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "var(--gray-9)")}
            >
              {collapsed ? (
                <DoubleArrowRightIcon width={16} height={16} />
              ) : (
                <DoubleArrowLeftIcon width={16} height={16} />
              )}
            </button>
          </Flex>
        </Flex>
      </nav>
    </Flex>
  );
}

export function MainContent({ children }: { children: React.ReactNode }) {
  const { collapsed } = useSidebar();
  const marginLeft = collapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_WIDTH;

  return (
    <Box
      flexGrow="1"
      minWidth="0"
      style={{
        marginLeft,
        transition: "margin-left 0.2s ease",
      }}
    >
      {children}
    </Box>
  );
}
