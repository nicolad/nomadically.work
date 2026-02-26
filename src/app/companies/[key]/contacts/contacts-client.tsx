"use client";

import * as React from "react";
import { useCallback, useState } from "react";
import {
  useGetCompanyQuery,
  useGetContactsQuery,
  useImportContactsMutation,
  useFindContactEmailMutation,
  useFindCompanyEmailsMutation,
  useApplyEmailPatternMutation,
} from "@/__generated__/hooks";
import Link from "next/link";
import { useAuth } from "@/lib/auth-hooks";
import { ADMIN_EMAIL } from "@/lib/constants";
import { useStreamingEmail } from "@/hooks/useStreamingEmail";
import type { GetContactsQuery } from "@/__generated__/hooks";
import {
  Badge,
  Box,
  Button,
  Callout,
  Card,
  Code,
  Container,
  Dialog,
  Flex,
  Heading,
  Link as RadixLink,
  Spinner,
  Text,
  TextArea,
  TextField,
} from "@radix-ui/themes";
import {
  ArrowLeftIcon,
  CheckIcon,
  CopyIcon,
  EnvelopeClosedIcon,
  ExclamationTriangleIcon,
  ExternalLinkIcon,
  GitHubLogoIcon,
  InfoCircledIcon,
  LinkedInLogoIcon,
  MagnifyingGlassIcon,
  MagicWandIcon,
  PaperPlaneIcon,
  UpdateIcon,
} from "@radix-ui/react-icons";
import { BatchEmailModal } from "@/components/admin/BatchEmailModal";

type Contact = NonNullable<
  GetContactsQuery["contacts"]["contacts"]
>[number];

function parseLinkedInHTML(html: string) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const contacts: Array<{ name: string; title: string; profileUrl: string }> =
    [];

  const cards = doc.querySelectorAll(
    "li.org-people-profile-card__profile-card-spacing",
  );

  cards.forEach((card) => {
    const nameElement = card.querySelector(
      ".artdeco-entity-lockup__title .lt-line-clamp",
    );
    const name = nameElement?.textContent?.trim() || "";

    const profileLink = card.querySelector('a[href*="/in/"]');
    let profileUrl = profileLink?.getAttribute("href") || "";
    if (profileUrl) {
      profileUrl = profileUrl.split("?")[0];
      if (!profileUrl.startsWith("http")) {
        profileUrl = `https://www.linkedin.com${profileUrl}`;
      }
    }

    const titleElement = card.querySelector(
      ".artdeco-entity-lockup__subtitle .lt-line-clamp",
    );
    const title = titleElement?.textContent?.trim() || "";

    if (name && profileUrl && name !== "LinkedIn Member") {
      contacts.push({ name, title, profileUrl });
    }
  });

  return contacts;
}

function GenerateEmailDialog({
  contact,
  companyName,
}: {
  contact: Contact;
  companyName: string | null | undefined;
}) {
  const [open, setOpen] = useState(false);
  const [instructions, setInstructions] = useState("");
  const [copied, setCopied] = useState(false);
  const { content, partialContent, isStreaming, error, generate, stop, reset } =
    useStreamingEmail();

  const recipientName = `${contact.firstName} ${contact.lastName}`.trim();

  const handleOpen = (val: boolean) => {
    setOpen(val);
    if (!val) {
      reset();
      setInstructions("");
      setCopied(false);
    }
  };

  const handleGenerate = async () => {
    await generate({
      recipientName,
      companyName: companyName ?? undefined,
      recipientContext: contact.position ?? undefined,
      instructions: instructions || undefined,
    });
  };

  const handleCopy = () => {
    if (!content) return;
    navigator.clipboard.writeText(
      `Subject: ${content.subject}\n\n${content.body}`,
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog.Root open={open} onOpenChange={handleOpen}>
      <Dialog.Trigger>
        <Button size="1" variant="soft" color="gray">
          <MagicWandIcon />
          Draft email
        </Button>
      </Dialog.Trigger>

      <Dialog.Content maxWidth="540px">
        <Dialog.Title>Draft email to {recipientName}</Dialog.Title>
        {companyName && (
          <Dialog.Description size="2" color="gray" mb="4">
            {contact.position ? `${contact.position} · ` : ""}
            {companyName}
          </Dialog.Description>
        )}

        <Flex direction="column" gap="3">
          <TextArea
            placeholder="Special instructions (optional) — e.g. mention their recent open source work…"
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            rows={3}
            disabled={isStreaming}
          />

          <Flex gap="2">
            <Button
              onClick={handleGenerate}
              loading={isStreaming}
              disabled={isStreaming}
            >
              <MagicWandIcon />
              {isStreaming ? "Generating…" : "Generate"}
            </Button>
            {isStreaming && (
              <Button variant="soft" color="red" onClick={stop}>
                Stop
              </Button>
            )}
            {content && !isStreaming && (
              <Button variant="soft" color="gray" onClick={reset}>
                Regenerate
              </Button>
            )}
          </Flex>

          {error && (
            <Callout.Root color="red" size="1">
              <Callout.Icon>
                <ExclamationTriangleIcon />
              </Callout.Icon>
              <Callout.Text>{error}</Callout.Text>
            </Callout.Root>
          )}

          {isStreaming && partialContent && (
            <Box>
              <Text size="1" color="gray" mb="1" as="p">
                Streaming…
              </Text>
              <Code
                size="1"
                style={{
                  display: "block",
                  whiteSpace: "pre-wrap",
                  maxHeight: 200,
                  overflow: "auto",
                }}
              >
                {partialContent}
              </Code>
            </Box>
          )}

          {content && !isStreaming && (
            <Box
              style={{
                background: "var(--green-2)",
                borderRadius: "var(--radius-3)",
                padding: "var(--space-3)",
              }}
            >
              <Flex justify="between" align="center" mb="2">
                <Badge color="green" size="1">
                  <CheckIcon />
                  Generated
                </Badge>
                <Button size="1" variant="ghost" onClick={handleCopy}>
                  <CopyIcon />
                  {copied ? "Copied!" : "Copy"}
                </Button>
              </Flex>

              <Text size="1" color="gray" weight="bold" as="p" mb="1">
                SUBJECT
              </Text>
              <Text size="2" weight="medium" as="p" mb="3">
                {content.subject}
              </Text>

              <Text size="1" color="gray" weight="bold" as="p" mb="1">
                BODY
              </Text>
              <Text
                size="2"
                as="p"
                style={{ whiteSpace: "pre-wrap", lineHeight: "1.6" }}
              >
                {content.body}
              </Text>
            </Box>
          )}
        </Flex>

        <Flex justify="end" mt="4">
          <Dialog.Close>
            <Button variant="soft" color="gray">
              Close
            </Button>
          </Dialog.Close>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
}

function FindEmailButton({
  contact,
  onFound,
}: {
  contact: Contact;
  onFound: () => void;
}) {
  const [findEmail, { loading }] = useFindContactEmailMutation();
  const [result, setResult] = useState<string | null>(null);

  const handleClick = useCallback(async () => {
    setResult(null);
    const { data } = await findEmail({ variables: { contactId: contact.id } });
    const res = data?.findContactEmail;
    if (res?.emailFound && res.email) {
      setResult(`Found: ${res.email}`);
      onFound();
    } else {
      setResult(res?.message ?? "No email found");
    }
  }, [findEmail, contact.id, onFound]);

  if (contact.emailVerified) return null;

  return (
    <Flex direction="column" align="end" gap="1">
      <Button
        size="1"
        variant="soft"
        color="blue"
        onClick={handleClick}
        disabled={loading}
      >
        {loading ? <Spinner size="1" /> : <MagnifyingGlassIcon />}
        Find email
      </Button>
      {result && (
        <Text size="1" color="gray" style={{ maxWidth: 180, textAlign: "right" }}>
          {result}
        </Text>
      )}
    </Flex>
  );
}

export function CompanyContactsClient({
  companyKey,
}: {
  companyKey: string;
}) {
  const { user } = useAuth();
  const isAdmin = user?.email === ADMIN_EMAIL;

  const { data: companyData, loading: companyLoading } = useGetCompanyQuery({
    variables: { key: companyKey },
    skip: !isAdmin,
  });

  const company = companyData?.company ?? null;

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [showImport, setShowImport] = useState(false);
  const [batchEmailOpen, setBatchEmailOpen] = useState(false);
  const [linkedinHtml, setLinkedinHtml] = useState("");
  const [importStatus, setImportStatus] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [emailDiscoveryStatus, setEmailDiscoveryStatus] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleSearch = useCallback((val: string) => {
    setSearch(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSearch(val), 300);
  }, []);

  const { data, loading, refetch } = useGetContactsQuery({
    variables: {
      companyId: company?.id ?? 0,
      search: debouncedSearch || undefined,
      limit: 100,
    },
    skip: !isAdmin || !company?.id,
    fetchPolicy: "cache-and-network",
  });

  const [importContacts, { loading: importing }] = useImportContactsMutation();
  const [findCompanyEmails, { loading: enhancing }] = useFindCompanyEmailsMutation();
  const [applyEmailPattern, { loading: applyingPattern }] = useApplyEmailPatternMutation();

  const handleImportContacts = useCallback(async () => {
    if (!linkedinHtml || !company) return;
    setImportStatus(null);

    const parsed = parseLinkedInHTML(linkedinHtml);
    if (parsed.length === 0) {
      setImportStatus({
        type: "error",
        message:
          "No contacts found in the HTML. Make sure you copied the LinkedIn company People page source.",
      });
      return;
    }

    try {
      const { data: result } = await importContacts({
        variables: {
          contacts: parsed.map((c) => ({
            firstName: c.name.split(" ")[0] || "",
            lastName: c.name.split(" ").slice(1).join(" ") || "",
            linkedinUrl: c.profileUrl || null,
            email: null,
            company: company.name || null,
            companyId: company.id,
            position: c.title || null,
          })),
        },
      });

      const imported = result?.importContacts?.imported ?? 0;
      const failed = result?.importContacts?.failed ?? 0;

      if (failed === 0) {
        setImportStatus({
          type: "success",
          message: `Imported ${imported} contact${imported !== 1 ? "s" : ""} successfully.`,
        });
      } else {
        setImportStatus({
          type: "error",
          message: `Imported ${imported}, failed ${failed}.`,
        });
      }

      setLinkedinHtml("");
      await refetch();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Import failed.";
      setImportStatus({ type: "error", message: msg });
    }
  }, [linkedinHtml, importContacts, company, refetch]);

  const handleEnhanceAll = useCallback(async () => {
    if (!company) return;
    setEmailDiscoveryStatus(null);
    try {
      const { data: result } = await findCompanyEmails({
        variables: { companyId: company.id },
      });
      const res = result?.findCompanyEmails;
      if (res?.success) {
        const errSuffix = res.errors?.length
          ? ` (${res.errors.length} errors: ${res.errors.slice(0, 3).join("; ")}${res.errors.length > 3 ? "…" : ""})`
          : "";
        setEmailDiscoveryStatus({ type: "success", message: res.message + errSuffix });
        await refetch();
      } else {
        setEmailDiscoveryStatus({
          type: "error",
          message: res?.message ?? "Email discovery failed",
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Email discovery failed.";
      setEmailDiscoveryStatus({ type: "error", message: msg });
    }
  }, [findCompanyEmails, company, refetch]);

  const handleApplyPattern = useCallback(async () => {
    if (!company) return;
    setEmailDiscoveryStatus(null);
    try {
      const { data: result } = await applyEmailPattern({
        variables: { companyId: company.id },
      });
      const res = result?.applyEmailPattern;
      setEmailDiscoveryStatus({
        type: res?.success ? "success" : "error",
        message: res?.message ?? "Pattern application failed",
      });
      if (res?.success) await refetch();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Pattern application failed.";
      setEmailDiscoveryStatus({ type: "error", message: msg });
    }
  }, [applyEmailPattern, company, refetch]);

  // Admin guard
  if (!isAdmin) {
    return (
      <Container size="3" p="8">
        <Callout.Root color="red">
          <Callout.Icon>
            <ExclamationTriangleIcon />
          </Callout.Icon>
          <Callout.Text>Access denied. Admin only.</Callout.Text>
        </Callout.Root>
      </Container>
    );
  }

  if (companyLoading) {
    return (
      <Container size="3" p="8">
        <Flex justify="center">
          <Spinner size="3" />
        </Flex>
      </Container>
    );
  }

  if (!company) {
    return (
      <Container size="3" p="8">
        <Callout.Root color="gray">
          <Callout.Icon>
            <InfoCircledIcon />
          </Callout.Icon>
          <Callout.Text>Company not found.</Callout.Text>
        </Callout.Root>
      </Container>
    );
  }

  const contactsList = data?.contacts?.contacts ?? [];
  const totalCount = data?.contacts?.totalCount ?? 0;
  const batchEmailRecipients = contactsList
    .filter((c) => c.email && !c.doNotContact)
    .map((c) => ({
      email: c.email as string,
      name: `${c.firstName} ${c.lastName}`.trim(),
    }));

  return (
    <Container size="3" p={{ initial: "4", md: "6" }}>
      <Flex direction="column" gap="5">
        {/* Back link + header */}
        <Box>
          <Link
            href={`/companies/${companyKey}`}
            style={{ textDecoration: "none" }}
          >
            <Flex align="center" gap="1" mb="3">
              <ArrowLeftIcon />
              <Text size="2" color="gray">
                {company.name}
              </Text>
            </Flex>
          </Link>
          <Heading size="6">Contacts</Heading>
        </Box>

        {/* Email discovery status */}
        {emailDiscoveryStatus && (
          <Callout.Root
            color={emailDiscoveryStatus.type === "success" ? "green" : "red"}
            size="1"
          >
            <Callout.Icon>
              <InfoCircledIcon />
            </Callout.Icon>
            <Callout.Text>{emailDiscoveryStatus.message}</Callout.Text>
          </Callout.Root>
        )}

        {/* Toolbar */}
        <Flex align="center" justify="between" gap="3" wrap="wrap">
          <Text size="2" color="gray">
            {loading
              ? "Loading…"
              : `${totalCount} contact${totalCount !== 1 ? "s" : ""}`}
          </Text>
          <Flex gap="2" align="center" wrap="wrap">
            {/* Email discovery actions */}
            <Button
              size="2"
              variant="soft"
              color="blue"
              onClick={handleEnhanceAll}
              disabled={enhancing || applyingPattern}
            >
              {enhancing ? <Spinner size="1" /> : <MagnifyingGlassIcon />}
              Find emails for all
            </Button>
            <Button
              size="2"
              variant="soft"
              color="indigo"
              onClick={handleApplyPattern}
              disabled={applyingPattern || enhancing}
            >
              {applyingPattern ? <Spinner size="1" /> : <UpdateIcon />}
              Apply pattern
            </Button>

            <Button
              size="2"
              variant="solid"
              color="indigo"
              onClick={() => setBatchEmailOpen(true)}
              disabled={batchEmailRecipients.length === 0}
            >
              <PaperPlaneIcon />
              Send Batch Email
              {batchEmailRecipients.length > 0 && ` (${batchEmailRecipients.length})`}
            </Button>

            {/* LinkedIn import */}
            <Dialog.Root
              open={showImport}
              onOpenChange={(open) => {
                setShowImport(open);
                if (!open) {
                  setLinkedinHtml("");
                  setImportStatus(null);
                }
              }}
            >
              <Dialog.Trigger>
                <Button size="2" variant="soft" color="gray">
                  <LinkedInLogoIcon />
                  Import from LinkedIn
                </Button>
              </Dialog.Trigger>

              <Dialog.Content maxWidth="520px">
                <Dialog.Title>Import LinkedIn contacts</Dialog.Title>
                <Dialog.Description size="2" color="gray" mb="4">
                  Go to the company&apos;s LinkedIn page → People tab →
                  right-click → View Page Source → copy all HTML → paste below.
                </Dialog.Description>

                {importStatus && (
                  <Callout.Root
                    color={importStatus.type === "success" ? "green" : "red"}
                    mb="3"
                  >
                    <Callout.Icon>
                      <InfoCircledIcon />
                    </Callout.Icon>
                    <Callout.Text>{importStatus.message}</Callout.Text>
                  </Callout.Root>
                )}

                <TextArea
                  placeholder="Paste LinkedIn page HTML here…"
                  value={linkedinHtml}
                  onChange={(e) => setLinkedinHtml(e.target.value)}
                  rows={12}
                  style={{ fontFamily: "monospace", fontSize: 12 }}
                />

                <Flex gap="3" mt="4" justify="end">
                  <Dialog.Close>
                    <Button variant="soft" color="gray">
                      Cancel
                    </Button>
                  </Dialog.Close>
                  <Button
                    onClick={handleImportContacts}
                    disabled={!linkedinHtml.trim() || importing}
                  >
                    {importing ? "Importing…" : "Import contacts"}
                  </Button>
                </Flex>
              </Dialog.Content>
            </Dialog.Root>

            <Box style={{ width: 240 }}>
              <TextField.Root
                size="2"
                placeholder="Search contacts…"
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
              >
                <TextField.Slot>
                  <MagnifyingGlassIcon />
                </TextField.Slot>
              </TextField.Root>
            </Box>
          </Flex>
        </Flex>

        {/* Contacts list */}
        {!loading && contactsList.length === 0 ? (
          <Callout.Root color="gray" variant="soft">
            <Callout.Icon>
              <InfoCircledIcon />
            </Callout.Icon>
            <Callout.Text>No contacts found.</Callout.Text>
          </Callout.Root>
        ) : (
          <Flex direction="column" gap="2">
            {contactsList.map((contact) => (
              <Card key={contact.id}>
                <Box p="3">
                  <Flex align="start" justify="between" gap="3" wrap="wrap">
                    <Box style={{ minWidth: 0 }}>
                      <Flex align="center" gap="2" wrap="wrap">
                        <Text size="3" weight="medium">
                          {contact.firstName} {contact.lastName}
                        </Text>
                        {contact.emailVerified && (
                          <Badge color="green" variant="soft" size="1">
                            verified
                          </Badge>
                        )}
                        {contact.email && !contact.emailVerified && contact.nbResult && (
                          <Badge color="orange" variant="soft" size="1">
                            {contact.nbResult}
                          </Badge>
                        )}
                        {contact.doNotContact && (
                          <Badge color="red" variant="soft" size="1">
                            do not contact
                          </Badge>
                        )}
                      </Flex>

                      {contact.position && (
                        <Text size="2" color="gray" mt="1" as="p">
                          {contact.position}
                        </Text>
                      )}

                      <Flex gap="3" mt="2" wrap="wrap" align="center">
                        {contact.email && (
                          <Flex align="center" gap="1">
                            <EnvelopeClosedIcon color="gray" />
                            <RadixLink
                              href={`mailto:${contact.email}`}
                              size="2"
                              color="gray"
                            >
                              {contact.email}
                            </RadixLink>
                          </Flex>
                        )}
                        {contact.linkedinUrl && (
                          <Flex align="center" gap="1">
                            <LinkedInLogoIcon color="gray" />
                            <RadixLink
                              href={contact.linkedinUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              size="2"
                              color="gray"
                            >
                              LinkedIn
                              <ExternalLinkIcon style={{ marginLeft: 4 }} />
                            </RadixLink>
                          </Flex>
                        )}
                        {contact.githubHandle && (
                          <Flex align="center" gap="1">
                            <GitHubLogoIcon color="gray" />
                            <RadixLink
                              href={`https://github.com/${contact.githubHandle}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              size="2"
                              color="gray"
                            >
                              {contact.githubHandle}
                            </RadixLink>
                          </Flex>
                        )}
                      </Flex>

                      {contact.tags && contact.tags.length > 0 && (
                        <Flex gap="1" mt="2" wrap="wrap">
                          {contact.tags.map((tag) => (
                            <Badge
                              key={tag}
                              color="gray"
                              variant="surface"
                              size="1"
                            >
                              {tag}
                            </Badge>
                          ))}
                        </Flex>
                      )}
                    </Box>

                    <Flex direction="column" align="end" gap="2" style={{ flexShrink: 0 }}>
                      {!contact.doNotContact && (
                        <GenerateEmailDialog
                          contact={contact}
                          companyName={company.name}
                        />
                      )}
                      {!contact.doNotContact && (
                        <FindEmailButton
                          contact={contact}
                          onFound={refetch}
                        />
                      )}
                    </Flex>
                  </Flex>
                </Box>
              </Card>
            ))}
          </Flex>
        )}
      </Flex>
      <BatchEmailModal
        open={batchEmailOpen}
        onOpenChange={setBatchEmailOpen}
        recipients={batchEmailRecipients}
      />
    </Container>
  );
}
