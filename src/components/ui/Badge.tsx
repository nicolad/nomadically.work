import { Badge as RadixBadge } from "@radix-ui/themes";
import { type ComponentPropsWithoutRef } from "react";

type RadixBadgeProps = ComponentPropsWithoutRef<typeof RadixBadge>;

interface BadgeProps extends Omit<RadixBadgeProps, "variant" | "color"> {
  variant?: "default" | "orange" | "green";
}

const variantMap: Record<
  NonNullable<BadgeProps["variant"]>,
  { color: RadixBadgeProps["color"] }
> = {
  default: { color: "gray" },
  orange: { color: "orange" },
  green: { color: "green" },
};

export function Badge({
  variant = "default",
  children,
  ...rest
}: BadgeProps) {
  const { color } = variantMap[variant];
  return (
    <RadixBadge variant="outline" color={color} {...rest}>
      {children}
    </RadixBadge>
  );
}
