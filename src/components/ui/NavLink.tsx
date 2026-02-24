import Link from "next/link";
import { type ComponentPropsWithoutRef } from "react";

interface NavLinkProps extends Omit<ComponentPropsWithoutRef<typeof Link>, "style"> {
  active?: boolean;
}

export function NavLink({ active = false, children, ...rest }: NavLinkProps) {
  return (
    <Link
      style={{
        color: active ? "var(--gray-12)" : "var(--gray-11)",
        textDecoration: "none",
        textTransform: "lowercase",
        transition: "color 0.15s",
      }}
      {...rest}
    >
      {children}
    </Link>
  );
}
