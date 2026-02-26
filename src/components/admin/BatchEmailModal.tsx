"use client";

import { useState } from "react";
import {
  Badge,
  Box,
  Button,
  Dialog,
  Flex,
  Heading,
  Separator,
  Spinner,
  Text,
  TextArea,
  TextField,
} from "@radix-ui/themes";
import {
  Cross2Icon,
  MagicWandIcon,
  PaperPlaneIcon,
  CheckCircledIcon,
  CrossCircledIcon,
} from "@radix-ui/react-icons";

interface Recipient {
  email: string;
  name: string;
}

interface SendResult {
  email: string;
  status: "sent" | "failed";
}

interface FailedResult {
  email: string;
  error: string;
}

interface BatchSendResponse {
  success: boolean;
  message: string;
  sent: SendResult[];
  failed: FailedResult[];
}

interface BatchEmailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipients: Recipient[];
}

type ModalState = "compose" | "sending" | "done";

export function BatchEmailModal({
  open,
  onOpenChange,
  recipients,
}: BatchEmailModalProps) {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  function defaultScheduledAt() {
    return new Date(Date.now() + 10 * 60 * 1000).toISOString().slice(0, 16);
  }
  const [scheduledAt, setScheduledAt] = useState(defaultScheduledAt);
  const [state, setState] = useState<ModalState>("compose");
  const [result, setResult] = useState<BatchSendResponse | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [instructions, setInstructions] = useState("");
  const [companyName, setCompanyName] = useState("");

  function resetForm() {
    setSubject("");
    setBody("");
    setScheduledAt(defaultScheduledAt());
    setState("compose");
    setResult(null);
    setSendError(null);
    setGenerating(false);
    setGenError(null);
    setInstructions("");
    setCompanyName("");
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) resetForm();
    onOpenChange(nextOpen);
  }

  async function handleGenerate() {
    setGenerating(true);
    setGenError(null);
    try {
      const res = await fetch("/api/emails/generate-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: companyName.trim() || undefined,
          instructions: instructions.trim() || undefined,
          recipientCount: recipients.length,
        }),
      });
      if (!res.ok) {
        const err = await res.text();
        throw new Error(err || `HTTP ${res.status}`);
      }
      const data = (await res.json()) as { subject: string; body: string };
      setSubject(data.subject);
      setBody(data.body);
    } catch (err) {
      setGenError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  }

  async function handleSend() {
    if (!subject.trim() || !body.trim() || recipients.length === 0) return;

    setState("sending");
    setSendError(null);
    setResult(null);

    try {
      const payload: {
        recipients: Recipient[];
        subject: string;
        body: string;
        scheduledAt?: string;
      } = { recipients, subject: subject.trim(), body: body.trim() };

      if (scheduledAt) {
        payload.scheduledAt = new Date(scheduledAt).toISOString();
      }

      const response = await fetch("/api/emails/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = (await response.json()) as BatchSendResponse;
      setResult(data);
      setState("done");
    } catch (err) {
      setSendError(err instanceof Error ? err.message : "Unexpected error");
      setState("compose");
    }
  }

  const canSend =
    state === "compose" &&
    subject.trim().length > 0 &&
    body.trim().length > 0 &&
    recipients.length > 0;

  const minScheduledAt = new Date(Date.now() + 5 * 60 * 1000)
    .toISOString()
    .slice(0, 16);

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Content maxWidth="640px" style={{ maxHeight: "90vh", overflowY: "auto" }}>
          <Flex justify="between" align="center" mb="4">
            <Dialog.Title>
              <Heading size="5">Send Batch Email</Heading>
            </Dialog.Title>
            <Dialog.Close>
              <Button variant="ghost" size="1" aria-label="Close">
                <Cross2Icon />
              </Button>
            </Dialog.Close>
          </Flex>

          {state === "compose" && (
            <Flex direction="column" gap="4">
              <Flex gap="2" align="center">
                <Text size="2" color="gray">
                  Recipients:
                </Text>
                <Badge color="blue" variant="soft" size="2">
                  {recipients.length} subscriber
                  {recipients.length === 1 ? "" : "s"}
                </Badge>
              </Flex>

              {sendError !== null && (
                <Box
                  style={{
                    background: "var(--red-3)",
                    borderRadius: "var(--radius-2)",
                    padding: "var(--space-3)",
                  }}
                >
                  <Text size="2" color="red">
                    {sendError}
                  </Text>
                </Box>
              )}

              <Box>
                <Text size="2" weight="medium" mb="2" style={{ display: "block" }}>
                  AI Generation
                </Text>
                <Flex direction="column" gap="2">
                  <TextField.Root
                    placeholder="Company name (optional)"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    size="2"
                  />
                  <TextArea
                    placeholder="Instructions — e.g. pitch Rust/trading background, ask for a call"
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                    rows={3}
                    size="2"
                  />
                  <Button
                    variant="soft"
                    color="violet"
                    disabled={generating || state !== "compose"}
                    onClick={() => void handleGenerate()}
                  >
                    {generating ? (
                      <>
                        <Spinner size="1" />
                        Generating with DeepSeek Reasoner...
                      </>
                    ) : (
                      <>
                        <MagicWandIcon />
                        Generate subject &amp; body
                      </>
                    )}
                  </Button>
                  {genError !== null && (
                    <Box
                      style={{
                        background: "var(--red-3)",
                        borderRadius: "var(--radius-2)",
                        padding: "var(--space-3)",
                      }}
                    >
                      <Text size="2" color="red">
                        {genError}
                      </Text>
                    </Box>
                  )}
                </Flex>
              </Box>

              <Separator size="4" />

              <Box>
                <Text
                  as="label"
                  size="2"
                  weight="medium"
                  mb="1"
                  style={{ display: "block" }}
                >
                  Subject
                </Text>
                <TextField.Root
                  placeholder="Email subject..."
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  size="2"
                />
              </Box>

              <Box>
                <Text
                  as="label"
                  size="2"
                  weight="medium"
                  mb="1"
                  style={{ display: "block" }}
                >
                  Body
                </Text>
                <Text
                  size="1"
                  color="gray"
                  mb="1"
                  style={{ display: "block" }}
                >
                  Use {"{{name}}"} for personalization. Separate paragraphs
                  with a blank line.
                </Text>
                <TextArea
                  placeholder={
                    "Hi {{name}},\n\nYour message here...\n\nThanks,\nNomadically Team"
                  }
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={10}
                  size="2"
                />
              </Box>

              <Box>
                <Text
                  as="label"
                  size="2"
                  weight="medium"
                  mb="1"
                  style={{ display: "block" }}
                >
                  Scheduled send time
                </Text>
                <Text size="1" color="gray" mb="1" style={{ display: "block" }}>
                  Emails are always scheduled. Default: 10 minutes from now.
                </Text>
                <input
                  type="datetime-local"
                  value={scheduledAt}
                  min={minScheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "6px 10px",
                    borderRadius: "var(--radius-2)",
                    border: "1px solid var(--gray-6)",
                    background: "var(--color-surface)",
                    color: "var(--gray-12)",
                    fontSize: "var(--font-size-2)",
                  }}
                />
              </Box>

              <Flex justify="end" gap="3" mt="2">
                <Dialog.Close>
                  <Button variant="soft" color="gray">
                    Cancel
                  </Button>
                </Dialog.Close>
                <Button disabled={!canSend} onClick={handleSend} variant="solid">
                  <PaperPlaneIcon />
                  Schedule for {recipients.length} recipient{recipients.length === 1 ? "" : "s"}
                </Button>
              </Flex>
            </Flex>
          )}

          {state === "sending" && (
            <Flex direction="column" align="center" gap="4" py="8">
              <Text size="3" color="gray">
                Sending emails...
              </Text>
            </Flex>
          )}

          {state === "done" && result !== null && (
            <Flex direction="column" gap="4">
              <Box
                style={{
                  background: result.success
                    ? "var(--green-3)"
                    : "var(--amber-3)",
                  borderRadius: "var(--radius-2)",
                  padding: "var(--space-3)",
                }}
              >
                <Text
                  size="2"
                  color={result.success ? "green" : "amber"}
                  weight="medium"
                >
                  {result.message}
                </Text>
              </Box>

              {result.sent.length > 0 && (
                <Box>
                  <Flex gap="2" align="center" mb="2">
                    <CheckCircledIcon color="var(--green-9)" />
                    <Text size="2" weight="medium">
                      Sent ({result.sent.length})
                    </Text>
                  </Flex>
                  <Flex direction="column" gap="1">
                    {result.sent.map((r) => (
                      <Text key={r.email} size="1" color="gray">
                        {r.email}
                      </Text>
                    ))}
                  </Flex>
                </Box>
              )}

              {result.failed.length > 0 && (
                <Box>
                  <Flex gap="2" align="center" mb="2">
                    <CrossCircledIcon color="var(--red-9)" />
                    <Text size="2" weight="medium">
                      Failed ({result.failed.length})
                    </Text>
                  </Flex>
                  <Flex direction="column" gap="1">
                    {result.failed.map((r) => (
                      <Box key={r.email}>
                        <Text size="1" color="red">
                          {r.email}: {r.error}
                        </Text>
                      </Box>
                    ))}
                  </Flex>
                </Box>
              )}

              <Flex justify="end" gap="3" mt="2">
                <Button variant="soft" color="gray" onClick={resetForm}>
                  Compose Another
                </Button>
                <Dialog.Close>
                  <Button variant="solid">Done</Button>
                </Dialog.Close>
              </Flex>
            </Flex>
          )}
        </Dialog.Content>
    </Dialog.Root>
  );
}
