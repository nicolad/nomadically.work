import { Button as RadixButton } from "@radix-ui/themes";
import { type ComponentPropsWithoutRef } from "react";

type RadixButtonProps = ComponentPropsWithoutRef<typeof RadixButton>;

interface ButtonProps extends Omit<RadixButtonProps, "variant" | "size" | "color"> {
  variant?: "primary" | "ghost" | "danger";
  size?: "sm" | "md";
}

const variantMap: Record<
  NonNullable<ButtonProps["variant"]>,
  { variant: RadixButtonProps["variant"]; color: RadixButtonProps["color"] }
> = {
  primary: { variant: "solid", color: "indigo" },
  ghost: { variant: "ghost", color: "gray" },
  danger: { variant: "solid", color: "red" },
};

const sizeMap: Record<NonNullable<ButtonProps["size"]>, RadixButtonProps["size"]> = {
  sm: "1",
  md: "2",
};

export function Button({
  variant = "primary",
  size = "md",
  children,
  ...rest
}: ButtonProps) {
  const { variant: radixVariant, color } = variantMap[variant];
  return (
    <RadixButton
      variant={radixVariant}
      color={color}
      size={sizeMap[size]}
      {...rest}
    >
      {children}
    </RadixButton>
  );
}
