"use client";

import { Badge, Button, DropdownMenu, Flex, Text } from "@radix-ui/themes";
import { ChevronDownIcon } from "@radix-ui/react-icons";
import { sourceFilterDesktop, sourceFilterMobile } from "./source-filter.css";

const SOURCE_OPTIONS = [
  { value: "greenhouse", label: "Greenhouse", color: "blue" },
  { value: "ashby", label: "Ashby", color: "violet" },
  { value: "lever", label: "Lever", color: "cyan" },
  { value: "remotive", label: "Remotive", color: "orange" },
  { value: "arbeitnow", label: "Arbeitnow", color: "grass" },
  { value: "workable", label: "Workable", color: "teal" },
  { value: "remoteok", label: "RemoteOK", color: "red" },
  { value: "himalayas", label: "Himalayas", color: "purple" },
  { value: "jobicy", label: "Jobicy", color: "pink" },
] as const;

type SourceColor = (typeof SOURCE_OPTIONS)[number]["color"];

type SourceFilterProps = {
  selected: string[];
  onChange: (selected: string[]) => void;
};

function toggle(selected: string[], value: string): string[] {
  return selected.includes(value)
    ? selected.filter((s) => s !== value)
    : [...selected, value];
}

function SourceFilterChips({ selected, onChange }: SourceFilterProps) {
  return (
    <Flex
      align="center"
      gap="2"
      wrap="wrap"
      role="group"
      aria-label="Filter by job source"
    >
      <Text size="1" style={{ color: "var(--gray-9)" }}>
        sources
      </Text>
      {SOURCE_OPTIONS.map(({ value, label, color }) => {
        const isSelected = selected.includes(value);
        return (
          <Badge
            key={value}
            variant={isSelected ? "solid" : "outline"}
            color={color as SourceColor}
            style={{ cursor: "pointer", userSelect: "none", padding: "4px 10px", minHeight: 28 }}
            onClick={() => onChange(toggle(selected, value))}
            role="checkbox"
            aria-checked={isSelected}
            aria-label={`Filter by ${label}`}
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onChange(toggle(selected, value));
              }
            }}
          >
            {label}
          </Badge>
        );
      })}
      {selected.length > 1 && (
        <Badge
          variant="ghost"
          color="gray"
          style={{ cursor: "pointer", userSelect: "none" }}
          onClick={() => onChange([])}
          aria-label="Clear all source filters"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onChange([]);
            }
          }}
        >
          clear
        </Badge>
      )}
    </Flex>
  );
}

function SourceFilterDropdown({ selected, onChange }: SourceFilterProps) {
  const label =
    selected.length === 0
      ? "all sources"
      : selected.length === 1
        ? (SOURCE_OPTIONS.find((o) => o.value === selected[0])?.label ?? selected[0])
        : `${selected.length} sources`;

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger>
        <Button
          variant="outline"
          size="1"
          aria-label={`Filter by source. Currently: ${label}`}
        >
          {label}
          <ChevronDownIcon />
        </Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content>
        <DropdownMenu.Label>Job sources</DropdownMenu.Label>
        <DropdownMenu.Separator />
        {SOURCE_OPTIONS.map(({ value, label: optLabel }) => (
          <DropdownMenu.CheckboxItem
            key={value}
            checked={selected.includes(value)}
            onCheckedChange={() => onChange(toggle(selected, value))}
          >
            {optLabel}
          </DropdownMenu.CheckboxItem>
        ))}
        {selected.length > 0 && (
          <>
            <DropdownMenu.Separator />
            <DropdownMenu.Item color="gray" onClick={() => onChange([])}>
              clear filters
            </DropdownMenu.Item>
          </>
        )}
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  );
}

export function SourceFilter({ selected, onChange }: SourceFilterProps) {
  return (
    <>
      <div className={sourceFilterDesktop}>
        <SourceFilterChips selected={selected} onChange={onChange} />
      </div>
      <div className={sourceFilterMobile}>
        <SourceFilterDropdown selected={selected} onChange={onChange} />
      </div>
    </>
  );
}
