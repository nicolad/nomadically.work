"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  useGetContactQuery,
  useFindContactEmailMutation,
  useUpdateContactMutation,
  useDeleteContactMutation,
} from "@/__generated__/hooks";
import { useAuth } from "@/lib/auth-hooks";
import { ADMIN_EMAIL } from "@/lib/constants";
import { useStreamingEmail } from "@/hooks/useStreamingEmail";
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
  Separator,
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
  Pencil1Icon,
  TrashIcon,
} from "@radix-ui/react-icons";

// ─── Generate Email Dialog ────────────────────────────────────────────────────

type EmailStep = "generate" | "edit";

function GenerateEmailDialog({
  contact,
}: {
  contact: {
    firstName: string;
    lastName: string;
    company?: string | null;
    position?: string | null;
    email?: string | null;
  };
}) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<EmailStep>("generate");
  const [instructions, setInstructions] = useState("");
  const [editSubject, setEditSubject] = useState("");
  const [editBody, setEditBody] = useState("");
  const [includeResume, setIncludeResume] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const { content, partialContent, isStreaming, error, generate, stop, reset } =
    useStreamingEmail();

  const recipientName = `${contact.firstName} ${contact.lastName}`.trim();
  const hasEmail = !!contact.email;

  const handleOpen = (val: boolean) => {
    setOpen(val);
    if (!val) {
      reset();
      setInstructions("");
      setStep("generate");
      setEditSubject("");
      setEditBody("");
      setIncludeResume(false);
      setSendResult(null);
      setCopied(false);
    }
  };

  const handleGenerate = async () => {
    await generate({
      recipientName,
      companyName: contact.company ?? undefined,
      recipientContext: contact.position ?? undefined,
      instructions: instructions || undefined,
    });
  };

  // When generation completes, seed edit fields and advance to edit step
  const handleProceedToEdit = () => {
    if (!content) return;
    setEditSubject(content.subject);
    setEditBody(content.body);
    setSendResult(null);
    setStep("edit");
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(`Subject: ${editSubject}\n\n${editBody}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSend = async () => {
    if (!contact.email) return;
    setSending(true);
    setSendResult(null);
    try {
      const res = await fetch("/api/emails/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: contact.email,
          name: recipientName,
          subject: editSubject,
          body: editBody,
          includeResume,
        }),
      });
      const json = (await res.json()) as { success: boolean; error?: string };
      if (json.success) {
        setSendResult({ type: "success", message: `Sent to ${contact.email}` });
      } else {
        setSendResult({ type: "error", message: json.error ?? "Send failed" });
      }
    } catch (err: unknown) {
      setSendResult({ type: "error", message: err instanceof Error ? err.message : "Send failed" });
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={handleOpen}>
      <Dialog.Trigger>
        <Button size="2" variant="soft" color="gray">
          <MagicWandIcon />
          Draft email
        </Button>
      </Dialog.Trigger>

      <Dialog.Content maxWidth="540px">
        <Dialog.Title>
          {step === "generate" ? "Draft email" : "Edit & send"} — {recipientName}
        </Dialog.Title>
        {(contact.position || contact.company) && (
          <Dialog.Description size="2" color="gray" mb="4">
            {contact.position ?? ""}
            {contact.position && contact.company ? " · " : ""}
            {contact.company ?? ""}
          </Dialog.Description>
        )}

        {/* ── Generate step ── */}
        {step === "generate" && (
          <Flex direction="column" gap="3">
            <TextArea
              placeholder="Special instructions (optional) — e.g. mention their recent open source work…"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              rows={3}
              disabled={isStreaming}
            />

            <Flex gap="2">
              <Button onClick={handleGenerate} loading={isStreaming} disabled={isStreaming}>
                <MagicWandIcon />
                {isStreaming ? "Generating…" : "Generate"}
              </Button>
              {isStreaming && (
                <Button variant="soft" color="red" onClick={stop}>
                  Stop
                </Button>
              )}
              {content && !isStreaming && (
                <Button variant="soft" color="gray" onClick={() => { reset(); setInstructions(""); }}>
                  Regenerate
                </Button>
              )}
            </Flex>

            {error && (
              <Callout.Root color="red" size="1">
                <Callout.Icon><ExclamationTriangleIcon /></Callout.Icon>
                <Callout.Text>{error}</Callout.Text>
              </Callout.Root>
            )}

            {isStreaming && partialContent && (
              <Box>
                <Text size="1" color="gray" mb="1" as="p">Streaming…</Text>
                <Code size="1" style={{ display: "block", whiteSpace: "pre-wrap", maxHeight: 200, overflow: "auto" }}>
                  {partialContent}
                </Code>
              </Box>
            )}

            {content && !isStreaming && (
              <Box style={{ background: "var(--green-2)", borderRadius: "var(--radius-3)", padding: "var(--space-3)" }}>
                <Flex justify="between" align="center" mb="2">
                  <Badge color="green" size="1"><CheckIcon /> Generated</Badge>
                </Flex>
                <Text size="1" color="gray" weight="bold" as="p" mb="1">SUBJECT</Text>
                <Text size="2" weight="medium" as="p" mb="3">{content.subject}</Text>
                <Text size="1" color="gray" weight="bold" as="p" mb="1">BODY</Text>
                <Text size="2" as="p" style={{ whiteSpace: "pre-wrap", lineHeight: "1.6" }}>{content.body}</Text>
              </Box>
            )}

            <Flex justify="between" mt="2">
              <Dialog.Close>
                <Button variant="soft" color="gray">Close</Button>
              </Dialog.Close>
              {content && !isStreaming && (
                <Button onClick={handleProceedToEdit}>
                  Edit & Send →
                </Button>
              )}
            </Flex>
          </Flex>
        )}

        {/* ── Edit & Send step ── */}
        {step === "edit" && (
          <Flex direction="column" gap="3">
            <Box>
              <Text size="1" color="gray" weight="medium" mb="1" as="p">Subject</Text>
              <TextField.Root
                value={editSubject}
                onChange={(e) => setEditSubject(e.target.value)}
              />
            </Box>

            <Box>
              <Text size="1" color="gray" weight="medium" mb="1" as="p">Body</Text>
              <TextArea
                value={editBody}
                onChange={(e) => setEditBody(e.target.value)}
                rows={12}
              />
            </Box>

            <Flex align="center" gap="2">
              <input
                type="checkbox"
                id="includeResume"
                checked={includeResume}
                onChange={(e) => setIncludeResume(e.target.checked)}
              />
              <Text size="2" as="label" htmlFor="includeResume">
                Include resume
              </Text>
            </Flex>

            {sendResult && (
              <Callout.Root color={sendResult.type === "success" ? "green" : "red"} size="1">
                <Callout.Icon><InfoCircledIcon /></Callout.Icon>
                <Callout.Text>{sendResult.message}</Callout.Text>
              </Callout.Root>
            )}

            <Flex justify="between" gap="2" wrap="wrap">
              <Button variant="soft" color="gray" onClick={() => setStep("generate")}>
                ← Back
              </Button>
              <Flex gap="2">
                <Button variant="soft" color="gray" onClick={handleCopy}>
                  <CopyIcon />
                  {copied ? "Copied!" : "Copy"}
                </Button>
                {hasEmail ? (
                  <Button
                    color="green"
                    onClick={handleSend}
                    disabled={sending || !editSubject || !editBody}
                    loading={sending}
                  >
                    <PaperPlaneIcon />
                    Send
                  </Button>
                ) : (
                  <Button disabled color="gray" variant="soft">
                    No email address
                  </Button>
                )}
              </Flex>
            </Flex>
          </Flex>
        )}
      </Dialog.Content>
    </Dialog.Root>
  );
}

// ─── Edit Contact Dialog ──────────────────────────────────────────────────────

function EditContactDialog({
  contact,
  onUpdated,
}: {
  contact: {
    id: number;
    firstName: string;
    lastName: string;
    email?: string | null;
    linkedinUrl?: string | null;
    position?: string | null;
    githubHandle?: string | null;
    telegramHandle?: string | null;
    doNotContact: boolean;
    tags: string[];
  };
  onUpdated: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    firstName: contact.firstName,
    lastName: contact.lastName,
    email: contact.email ?? "",
    linkedinUrl: contact.linkedinUrl ?? "",
    position: contact.position ?? "",
    githubHandle: contact.githubHandle ?? "",
    telegramHandle: contact.telegramHandle ?? "",
    doNotContact: contact.doNotContact,
    tags: contact.tags.join(", "),
  });
  const [updateContact, { loading }] = useUpdateContactMutation();
  const [error, setError] = useState<string | null>(null);

  const handleOpenChange = (val: boolean) => {
    setOpen(val);
    if (val) {
      setForm({
        firstName: contact.firstName,
        lastName: contact.lastName,
        email: contact.email ?? "",
        linkedinUrl: contact.linkedinUrl ?? "",
        position: contact.position ?? "",
        githubHandle: contact.githubHandle ?? "",
        telegramHandle: contact.telegramHandle ?? "",
        doNotContact: contact.doNotContact,
        tags: contact.tags.join(", "),
      });
      setError(null);
    }
  };

  const handleSubmit = async () => {
    if (!form.firstName.trim()) {
      setError("First name is required.");
      return;
    }
    setError(null);
    try {
      await updateContact({
        variables: {
          id: contact.id,
          input: {
            firstName: form.firstName.trim(),
            lastName: form.lastName.trim() || undefined,
            email: form.email.trim() || undefined,
            linkedinUrl: form.linkedinUrl.trim() || undefined,
            position: form.position.trim() || undefined,
            githubHandle: form.githubHandle.trim() || undefined,
            telegramHandle: form.telegramHandle.trim() || undefined,
            doNotContact: form.doNotContact,
            tags: form.tags
              .split(",")
              .map((t) => t.trim())
              .filter(Boolean),
          },
        },
      });
      setOpen(false);
      onUpdated();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update contact.");
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Trigger>
        <Button size="2" variant="soft">
          <Pencil1Icon />
          Edit
        </Button>
      </Dialog.Trigger>

      <Dialog.Content maxWidth="480px">
        <Dialog.Title>Edit contact</Dialog.Title>

        <Flex direction="column" gap="3">
          {error && (
            <Callout.Root color="red" size="1">
              <Callout.Icon>
                <ExclamationTriangleIcon />
              </Callout.Icon>
              <Callout.Text>{error}</Callout.Text>
            </Callout.Root>
          )}

          <Flex gap="2">
            <Box style={{ flex: 1 }}>
              <Text size="1" color="gray" mb="1" as="p">
                First name *
              </Text>
              <TextField.Root
                value={form.firstName}
                onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
              />
            </Box>
            <Box style={{ flex: 1 }}>
              <Text size="1" color="gray" mb="1" as="p">
                Last name
              </Text>
              <TextField.Root
                value={form.lastName}
                onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
              />
            </Box>
          </Flex>

          <Box>
            <Text size="1" color="gray" mb="1" as="p">
              Position
            </Text>
            <TextField.Root
              placeholder="e.g. Engineering Manager"
              value={form.position}
              onChange={(e) => setForm((f) => ({ ...f, position: e.target.value }))}
            />
          </Box>

          <Box>
            <Text size="1" color="gray" mb="1" as="p">
              Email
            </Text>
            <TextField.Root
              type="email"
              placeholder="name@company.com"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            />
          </Box>

          <Box>
            <Text size="1" color="gray" mb="1" as="p">
              LinkedIn URL
            </Text>
            <TextField.Root
              placeholder="https://linkedin.com/in/…"
              value={form.linkedinUrl}
              onChange={(e) => setForm((f) => ({ ...f, linkedinUrl: e.target.value }))}
            />
          </Box>

          <Box>
            <Text size="1" color="gray" mb="1" as="p">
              GitHub handle
            </Text>
            <TextField.Root
              placeholder="username"
              value={form.githubHandle}
              onChange={(e) => setForm((f) => ({ ...f, githubHandle: e.target.value }))}
            />
          </Box>

          <Box>
            <Text size="1" color="gray" mb="1" as="p">
              Telegram handle
            </Text>
            <TextField.Root
              placeholder="username"
              value={form.telegramHandle}
              onChange={(e) => setForm((f) => ({ ...f, telegramHandle: e.target.value }))}
            />
          </Box>

          <Box>
            <Text size="1" color="gray" mb="1" as="p">
              Tags (comma-separated)
            </Text>
            <TextField.Root
              placeholder="recruiter, hiring-manager"
              value={form.tags}
              onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
            />
          </Box>

          <Flex align="center" gap="2">
            <input
              type="checkbox"
              id="doNotContact"
              checked={form.doNotContact}
              onChange={(e) => setForm((f) => ({ ...f, doNotContact: e.target.checked }))}
            />
            <Text size="2" as="label" htmlFor="doNotContact">
              Do not contact
            </Text>
          </Flex>
        </Flex>

        <Flex gap="3" mt="4" justify="end">
          <Dialog.Close>
            <Button variant="soft" color="gray">
              Cancel
            </Button>
          </Dialog.Close>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Saving…" : "Save changes"}
          </Button>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
}

// ─── Delete Contact Dialog ────────────────────────────────────────────────────

function DeleteContactDialog({
  contactId,
  contactName,
  onDeleted,
}: {
  contactId: number;
  contactName: string;
  onDeleted: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [deleteContact, { loading }] = useDeleteContactMutation();
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    setError(null);
    try {
      const { data } = await deleteContact({ variables: { id: contactId } });
      if (data?.deleteContact.success) {
        onDeleted();
      } else {
        setError(data?.deleteContact.message ?? "Delete failed.");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Delete failed.");
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger>
        <Button size="2" variant="soft" color="red">
          <TrashIcon />
          Delete
        </Button>
      </Dialog.Trigger>

      <Dialog.Content maxWidth="400px">
        <Dialog.Title>Delete {contactName}?</Dialog.Title>
        <Dialog.Description size="2" color="gray" mb="4">
          This action cannot be undone.
        </Dialog.Description>

        {error && (
          <Callout.Root color="red" size="1" mb="3">
            <Callout.Icon>
              <ExclamationTriangleIcon />
            </Callout.Icon>
            <Callout.Text>{error}</Callout.Text>
          </Callout.Root>
        )}

        <Flex gap="3" justify="end">
          <Dialog.Close>
            <Button variant="soft" color="gray">
              Cancel
            </Button>
          </Dialog.Close>
          <Button color="red" onClick={handleDelete} disabled={loading}>
            {loading ? "Deleting…" : "Delete"}
          </Button>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function ContactDetailClient({ contactId }: { contactId: number }) {
  const router = useRouter();
  const { user } = useAuth();
  const isAdmin = user?.email === ADMIN_EMAIL;

  const { data, loading, refetch } = useGetContactQuery({
    variables: { id: contactId },
    skip: !contactId || isNaN(contactId) || !isAdmin,
  });

  const contact = data?.contact;

  const [findEmail, { loading: finding }] = useFindContactEmailMutation();
  const [findResult, setFindResult] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const handleFindEmail = useCallback(async () => {
    if (!contact) return;
    setFindResult(null);
    try {
      const { data: result } = await findEmail({ variables: { contactId: contact.id } });
      const res = result?.findContactEmail;
      if (res?.success && res.emailFound && res.email) {
        setFindResult({
          type: "success",
          message: `Found: ${res.email}${res.verified ? " (verified)" : ""}`,
        });
        refetch();
      } else {
        setFindResult({
          type: "error",
          message: res?.message ?? `No email found (tried ${res?.candidatesTried ?? 0} candidates)`,
        });
      }
    } catch (err: unknown) {
      setFindResult({ type: "error", message: err instanceof Error ? err.message : "Failed to find email" });
    }
  }, [contact, findEmail, refetch]);

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

  if (loading) {
    return (
      <Container size="3" p="8">
        <Flex justify="center">
          <Spinner size="3" />
        </Flex>
      </Container>
    );
  }

  if (!contact) {
    return (
      <Container size="3" p="8">
        <Callout.Root color="gray">
          <Callout.Icon>
            <InfoCircledIcon />
          </Callout.Icon>
          <Callout.Text>Contact not found.</Callout.Text>
        </Callout.Root>
      </Container>
    );
  }

  const fullName = `${contact.firstName} ${contact.lastName}`.trim();

  return (
    <Container size="3" p={{ initial: "4", md: "6" }}>
      <Flex direction="column" gap="5">
        {/* Back link */}
        <Box>
          <Link href="/contacts" style={{ textDecoration: "none" }}>
            <Flex align="center" gap="1" mb="3">
              <ArrowLeftIcon />
              <Text size="2" color="gray">
                All contacts
              </Text>
            </Flex>
          </Link>

          <Flex align="center" justify="between" wrap="wrap" gap="3">
            <Flex align="center" gap="3" wrap="wrap">
              <Heading size="6">{fullName}</Heading>
              {contact.emailVerified && (
                <Badge color="green" variant="soft">
                  verified
                </Badge>
              )}
              {contact.doNotContact && (
                <Badge color="red" variant="soft">
                  do not contact
                </Badge>
              )}
            </Flex>

            {/* Header actions */}
            <Flex gap="2" wrap="wrap">
              <EditContactDialog contact={contact} onUpdated={() => refetch()} />
              <DeleteContactDialog
                contactId={contact.id}
                contactName={fullName}
                onDeleted={() => router.push("/contacts")}
              />
            </Flex>
          </Flex>
        </Box>

        {/* Find email result */}
        {findResult && (
          <Callout.Root color={findResult.type === "success" ? "green" : "red"} size="1">
            <Callout.Icon>
              <InfoCircledIcon />
            </Callout.Icon>
            <Callout.Text>{findResult.message}</Callout.Text>
          </Callout.Root>
        )}

        {/* Main info card */}
        <Card>
          <Box p="4">
            <Flex direction="column" gap="4">
              {/* Position & Company */}
              {(contact.position || contact.company) && (
                <Box>
                  <Text size="2" color="gray" weight="medium">
                    Role
                  </Text>
                  <Text size="3" as="p" mt="1">
                    {contact.position}
                    {contact.position && contact.company && " at "}
                    {contact.companyId ? (
                      <RadixLink asChild>
                        <Link href={`/companies/${contact.companyId}`}>
                          {contact.company}
                        </Link>
                      </RadixLink>
                    ) : (
                      contact.company
                    )}
                  </Text>
                </Box>
              )}

              <Separator size="4" />

              {/* Primary email */}
              <Box>
                <Text size="2" color="gray" weight="medium">
                  Email
                </Text>
                {contact.email ? (
                  <Flex align="center" gap="2" mt="1">
                    <EnvelopeClosedIcon />
                    <RadixLink href={`mailto:${contact.email}`} size="3">
                      {contact.email}
                    </RadixLink>
                    {contact.emailVerified && (
                      <Badge color="green" variant="soft" size="1">
                        verified
                      </Badge>
                    )}
                    {!contact.emailVerified && contact.nbResult && (
                      <Badge color="orange" variant="soft" size="1">
                        {contact.nbResult}
                      </Badge>
                    )}
                  </Flex>
                ) : (
                  <Flex align="center" gap="3" mt="1">
                    <Text size="2" color="gray">
                      No email
                    </Text>
                    <Button
                      size="1"
                      variant="soft"
                      color="green"
                      onClick={handleFindEmail}
                      disabled={finding}
                    >
                      {finding ? <Spinner size="1" /> : <MagnifyingGlassIcon />}
                      Find email
                    </Button>
                  </Flex>
                )}
              </Box>

              {/* Additional emails */}
              {contact.emails && contact.emails.length > 0 && (
                <Box>
                  <Text size="2" color="gray" weight="medium">
                    Additional emails
                  </Text>
                  <Flex direction="column" gap="1" mt="1">
                    {contact.emails.map((email) => (
                      <RadixLink key={email} href={`mailto:${email}`} size="2">
                        {email}
                      </RadixLink>
                    ))}
                  </Flex>
                </Box>
              )}

              {/* Bounced emails */}
              {contact.bouncedEmails && contact.bouncedEmails.length > 0 && (
                <Box>
                  <Text size="2" color="gray" weight="medium">
                    Bounced emails
                  </Text>
                  <Flex direction="column" gap="1" mt="1">
                    {contact.bouncedEmails.map((email) => (
                      <Text key={email} size="2" color="red">
                        {email}
                      </Text>
                    ))}
                  </Flex>
                </Box>
              )}

              {/* NeverBounce details */}
              {(contact.nbStatus || (contact.nbFlags && contact.nbFlags.length > 0) || contact.nbSuggestedCorrection) && (
                <Box>
                  <Text size="2" color="gray" weight="medium">
                    NeverBounce
                  </Text>
                  <Flex direction="column" gap="1" mt="1">
                    {contact.nbStatus && (
                      <Text size="2">
                        Status:{" "}
                        <Badge
                          color={
                            contact.nbStatus === "valid"
                              ? "green"
                              : contact.nbStatus === "invalid"
                                ? "red"
                                : "orange"
                          }
                          variant="soft"
                          size="1"
                        >
                          {contact.nbStatus}
                        </Badge>
                      </Text>
                    )}
                    {contact.nbFlags && contact.nbFlags.length > 0 && (
                      <Flex gap="1" wrap="wrap">
                        {contact.nbFlags.map((flag) => (
                          <Badge key={flag} color="gray" variant="soft" size="1">
                            {flag}
                          </Badge>
                        ))}
                      </Flex>
                    )}
                    {contact.nbSuggestedCorrection && (
                      <Text size="2" color="gray">
                        Suggested:{" "}
                        <RadixLink href={`mailto:${contact.nbSuggestedCorrection}`} size="2">
                          {contact.nbSuggestedCorrection}
                        </RadixLink>
                      </Text>
                    )}
                  </Flex>
                </Box>
              )}

              <Separator size="4" />

              {/* Social links */}
              <Box>
                <Text size="2" color="gray" weight="medium">
                  Links
                </Text>
                <Flex gap="4" mt="2" wrap="wrap">
                  {contact.linkedinUrl && (
                    <Flex align="center" gap="1">
                      <LinkedInLogoIcon />
                      <RadixLink
                        href={contact.linkedinUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        size="2"
                      >
                        LinkedIn
                        <ExternalLinkIcon style={{ marginLeft: 4 }} />
                      </RadixLink>
                    </Flex>
                  )}
                  {contact.githubHandle && (
                    <Flex align="center" gap="1">
                      <GitHubLogoIcon />
                      <RadixLink
                        href={`https://github.com/${contact.githubHandle}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        size="2"
                      >
                        {contact.githubHandle}
                      </RadixLink>
                    </Flex>
                  )}
                  {contact.telegramHandle && (
                    <Flex align="center" gap="1">
                      <RadixLink
                        href={`https://t.me/${contact.telegramHandle}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        size="2"
                      >
                        @{contact.telegramHandle}
                      </RadixLink>
                    </Flex>
                  )}
                  {!contact.linkedinUrl && !contact.githubHandle && !contact.telegramHandle && (
                    <Text size="2" color="gray">
                      No links
                    </Text>
                  )}
                </Flex>
              </Box>

              {/* Tags */}
              {contact.tags && contact.tags.length > 0 && (
                <>
                  <Separator size="4" />
                  <Box>
                    <Text size="2" color="gray" weight="medium">
                      Tags
                    </Text>
                    <Flex gap="1" mt="2" wrap="wrap">
                      {contact.tags.map((tag) => (
                        <Badge key={tag} color="blue" variant="soft" size="1">
                          {tag}
                        </Badge>
                      ))}
                    </Flex>
                  </Box>
                </>
              )}

              <Separator size="4" />

              {/* Metadata */}
              <Flex gap="4" wrap="wrap">
                <Text size="1" color="gray">
                  Created: {new Date(contact.createdAt).toLocaleDateString()}
                </Text>
                <Text size="1" color="gray">
                  Updated: {new Date(contact.updatedAt).toLocaleDateString()}
                </Text>
              </Flex>
            </Flex>
          </Box>
        </Card>

        {/* Bottom actions */}
        <Flex gap="2" wrap="wrap">
          {contact.email && (
            <Button size="2" variant="soft" asChild>
              <a href={`mailto:${contact.email}`}>
                <EnvelopeClosedIcon />
                Send email
              </a>
            </Button>
          )}
          {!contact.email && (
            <Button size="2" variant="soft" color="green" onClick={handleFindEmail} disabled={finding}>
              {finding ? <Spinner size="1" /> : <MagnifyingGlassIcon />}
              Find email
            </Button>
          )}
          <GenerateEmailDialog contact={contact} />
        </Flex>
      </Flex>
    </Container>
  );
}
