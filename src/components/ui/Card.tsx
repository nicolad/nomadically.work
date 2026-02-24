import { Card as RadixCard } from "@radix-ui/themes";
import { type ComponentPropsWithoutRef } from "react";

type RadixCardProps = ComponentPropsWithoutRef<typeof RadixCard>;

interface CardProps extends Omit<RadixCardProps, "variant"> {
  padding?: RadixCardProps["size"];
}

export function Card({ padding = "3", children, ...rest }: CardProps) {
  return (
    <RadixCard variant="surface" size={padding} {...rest}>
      {children}
    </RadixCard>
  );
}
