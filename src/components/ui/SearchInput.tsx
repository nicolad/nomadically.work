import { TextField } from "@radix-ui/themes";
import { MagnifyingGlassIcon } from "@radix-ui/react-icons";
import { type ComponentPropsWithoutRef } from "react";

type TextFieldRootProps = ComponentPropsWithoutRef<typeof TextField.Root>;

interface SearchInputProps extends Omit<TextFieldRootProps, "children"> {
  placeholder?: string;
}

export function SearchInput({
  placeholder = "search...",
  ...rest
}: SearchInputProps) {
  return (
    <TextField.Root placeholder={placeholder} {...rest}>
      <TextField.Slot>
        <MagnifyingGlassIcon width={14} height={14} />
      </TextField.Slot>
    </TextField.Root>
  );
}
