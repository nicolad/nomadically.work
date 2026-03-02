"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Flex,
  Heading,
  Button,
  Box,
  Text,
  Dialog,
  IconButton,
} from "@radix-ui/themes";
import {
  ArrowLeftIcon,
  Pencil1Icon,
  TrashIcon,
} from "@radix-ui/react-icons";
import {
  useDeleteApplicationMutation,
  useUpdateApplicationMutation,
  useUpdateCompanyMutation,
  useGetCompanyQuery,
} from "@/__generated__/hooks";
import { CompanyPicker } from "@/components/company-picker";
import type { AppData } from "./types";
import { formatDate, companyInitials } from "./constants";

interface ApplicationHeaderProps {
  app: AppData;
  isAdmin: boolean;
}

export function ApplicationHeader({ app, isAdmin }: ApplicationHeaderProps) {
  const router = useRouter();
  const [deleteApplication] = useDeleteApplicationMutation();
  const [updateApplication] = useUpdateApplicationMutation();
  const [updateCompany] = useUpdateCompanyMutation();

  const { data: companyData } = useGetCompanyQuery({
    variables: { key: app.companyKey ?? "" },
    skip: !app.companyKey || !isAdmin,
  });

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editingCompany, setEditingCompany] = useState(false);
  const [companyNameValue, setCompanyNameValue] = useState("");
  const [companyWebsiteValue, setCompanyWebsiteValue] = useState("");
  const [companySaving, setCompanySaving] = useState(false);
  const [companySaveError, setCompanySaveError] = useState<string | null>(null);

  const displayName = app.companyName ?? app.jobId;
  const displayTitle = app.jobTitle ?? "Job application";
  const initials = companyInitials(displayName);

  const handleSaveCompany = async () => {
    const company = companyData?.company;
    if (!company) return;
    setCompanySaving(true);
    setCompanySaveError(null);
    try {
      await updateCompany({
        variables: {
          id: company.id,
          input: { name: companyNameValue, website: companyWebsiteValue || null },
        },
        refetchQueries: ["GetCompany"],
      });
      setEditingCompany(false);
    } catch (e) {
      setCompanySaveError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setCompanySaving(false);
    }
  };

  return (
    <>
      {/* Back link */}
      <Flex justify="between" align="center" mb="6">
        <Button variant="ghost" asChild>
          <Link href="/applications">
            <ArrowLeftIcon /> Back to Applications
          </Link>
        </Button>
        <Button variant="soft" color="red" size="2" onClick={() => setDeleteDialogOpen(true)}>
          <TrashIcon /> Delete
        </Button>
      </Flex>

      {/* Delete confirmation dialog */}
      <Dialog.Root open={deleteDialogOpen} onOpenChange={(o) => { if (!o && !deleting) setDeleteDialogOpen(false); }}>
        <Dialog.Content maxWidth="400px">
          <Dialog.Title>Delete application?</Dialog.Title>
          <Dialog.Description size="2" color="gray">
            This will permanently delete this application and all associated data. This action cannot be undone.
          </Dialog.Description>
          <Flex gap="2" justify="end" mt="4">
            <Dialog.Close>
              <Button variant="soft" color="gray" size="2" disabled={deleting}>Cancel</Button>
            </Dialog.Close>
            <Button
              color="red"
              size="2"
              disabled={deleting}
              onClick={async () => {
                setDeleting(true);
                try {
                  await deleteApplication({ variables: { id: app.id } });
                  router.push("/applications");
                } catch {
                  setDeleting(false);
                  setDeleteDialogOpen(false);
                }
              }}
            >
              {deleting ? "Deleting\u2026" : "Delete"}
            </Button>
          </Flex>
        </Dialog.Content>
      </Dialog.Root>

      {/* Header */}
      <Flex gap="4" align="start" mb="6">
        <Box
          style={{
            width: 48,
            height: 48,
            borderRadius: 8,
            backgroundColor: "var(--accent-3)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            fontWeight: 700,
            fontSize: 16,
            color: "var(--accent-11)",
          }}
        >
          {initials}
        </Box>
        <Box style={{ flex: 1 }}>
          <Heading size="7" mb="1">
            {displayTitle}
          </Heading>
          <Flex align="center" gap="2" wrap="wrap">
            <Text size="3" color="gray">
              {app.companyKey ? (
                <Link href={`/companies/${app.companyKey}`} target="_blank" rel="noopener noreferrer" style={{ color: "inherit", textDecoration: "underline", textUnderlineOffset: 2 }}>
                  {app.companyName ?? "Unknown company"}
                </Link>
              ) : (
                app.companyName ?? "Unknown company"
              )}{" "}
              &middot; Added {formatDate(app.createdAt)}
            </Text>
            {isAdmin && app.companyKey && (
              <IconButton
                size="1"
                variant="ghost"
                color="gray"
                onClick={() => {
                  setCompanyNameValue(companyData?.company?.name ?? app.companyName ?? "");
                  setCompanyWebsiteValue(companyData?.company?.website ?? "");
                  setCompanySaveError(null);
                  setEditingCompany(true);
                }}
              >
                <Pencil1Icon />
              </IconButton>
            )}
            {isAdmin && !app.companyKey && (
              <CompanyPicker
                companyKey={app.companyKey}
                companyName={app.companyName}
                onLinked={async (_key, name) => {
                  await updateApplication({
                    variables: { id: app.id, input: { companyName: name } },
                    refetchQueries: ["GetApplication"],
                  });
                }}
              />
            )}
          </Flex>
        </Box>
      </Flex>

      {/* Company edit dialog */}
      <Dialog.Root open={editingCompany} onOpenChange={(o) => { if (!o) setEditingCompany(false); }}>
        <Dialog.Content maxWidth="420px">
          <Dialog.Title>Edit Company</Dialog.Title>
          <Flex direction="column" gap="3" mt="2">
            <Box>
              <Text size="2" weight="medium" mb="1" as="div">Name</Text>
              <input
                value={companyNameValue}
                onChange={(e) => setCompanyNameValue(e.target.value)}
                placeholder="Company name"
                style={{
                  width: "100%",
                  padding: "6px 10px",
                  borderRadius: "var(--radius-2)",
                  border: "1px solid var(--gray-6)",
                  background: "var(--gray-2)",
                  color: "var(--gray-12)",
                  fontSize: "var(--font-size-2)",
                  boxSizing: "border-box",
                }}
              />
            </Box>
            <Box>
              <Text size="2" weight="medium" mb="1" as="div">Website</Text>
              <input
                value={companyWebsiteValue}
                onChange={(e) => setCompanyWebsiteValue(e.target.value)}
                placeholder="https://example.com"
                style={{
                  width: "100%",
                  padding: "6px 10px",
                  borderRadius: "var(--radius-2)",
                  border: "1px solid var(--gray-6)",
                  background: "var(--gray-2)",
                  color: "var(--gray-12)",
                  fontSize: "var(--font-size-2)",
                  boxSizing: "border-box",
                }}
              />
            </Box>
            {companySaveError && (
              <Text size="1" color="red">{companySaveError}</Text>
            )}
          </Flex>
          <Flex gap="2" justify="end" mt="4">
            <Dialog.Close>
              <Button variant="soft" color="gray" size="2">Cancel</Button>
            </Dialog.Close>
            <Button size="2" disabled={companySaving} onClick={handleSaveCompany}>
              {companySaving ? "Saving\u2026" : "Save"}
            </Button>
          </Flex>
        </Dialog.Content>
      </Dialog.Root>
    </>
  );
}
