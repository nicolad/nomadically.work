import type { ApplicationStatus } from "@/__generated__/hooks";

export const COLUMNS: {
  status: ApplicationStatus;
  label: string;
  color: "gray" | "blue" | "orange" | "green" | "red";
}[] = [
  { status: "pending", label: "Saved", color: "gray" },
  { status: "submitted", label: "Applied", color: "blue" },
  { status: "reviewed", label: "Interviewing", color: "orange" },
  { status: "accepted", label: "Offer", color: "green" },
  { status: "rejected", label: "Rejected", color: "red" },
];

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function companyInitials(name: string): string {
  return name
    .split(/[\s\-_.]/)
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}
