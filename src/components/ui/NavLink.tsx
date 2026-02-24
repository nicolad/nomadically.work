import Link from "next/link";
import { type ComponentPropsWithoutRef, type CSSProperties } from "react";

interface NavLinkProps extends Omit<ComponentPropsWithoutRef<typeof Link>, "style"> {
  active?: boolean;
  style?: CSSProperties;
}

export function NavLink({ active = false, children, style, ...rest }: NavLinkProps) {
  return (
    <Link
      style={{
        color: active ? "var(--gray-12)" : "var(--gray-11)",
        textDecoration: "none",
        textTransform: "lowercase",
        transition: "color 0.15s",
        ...style,
      }}
      {...rest}
    >
      {children}
    </Link>
  );
}
