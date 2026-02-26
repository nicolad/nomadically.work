"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Badge,
  Box,
  Button,
  Card,
  Container,
  Flex,
  Heading,
  Tabs,
  Text,
} from "@radix-ui/themes";
import {
  ExternalLinkIcon,
  ReloadIcon,
  ExclamationTriangleIcon,
  EnvelopeClosedIcon,
  EnvelopeOpenIcon,
} from "@radix-ui/react-icons";
import Link from "next/link";
import { useAuth } from "@/lib/auth-hooks";
import { getSentEmails, getReceivedEmails, getEmailSubscribers } from "./actions";
import type { EmailSubscriber } from "./actions";
import { BatchEmailModal } from "@/components/admin/BatchEmailModal";

type SentEmail = {
  id: string;
  to: string[];
  from: string;
  subject: string;
  created_at: string;
  last_event: string;
};

type ReceivedEmail = {
  id: string;
  to: string[];
  from: string;
  subject: string;
  created_at: string;
};

function statusColor(
  status: string,
): "green" | "blue" | "red" | "orange" | "gray" {
  switch (status) {
    case "delivered":
      return "green";
    case "sent":
      return "blue";
    case "bounced":
    case "complained":
      return "red";
    case "delivery_delayed":
      return "orange";
    default:
      return "gray";
  }
}

function SentList() {
  const [emails, setEmails] = useState<SentEmail[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const result = await getSentEmails(100);
    setEmails(result.emails as SentEmail[]);
    setError(result.error);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  if (loading) {
    return (
      <Text color="gray" size="2">
        Loading…
      </Text>
    );
  }

  if (error) {
    return (
      <Card>
        <Flex gap="2" align="center">
          <ExclamationTriangleIcon color="red" />
          <Text color="red" size="2">
            {error}
          </Text>
        </Flex>
      </Card>
    );
  }

  if (emails.length === 0) {
    return (
      <Card>
        <Text color="gray" size="2">
          No sent emails found.
        </Text>
      </Card>
    );
  }

  return (
    <Flex direction="column" gap="2">
      <Flex justify="between" align="center" mb="2">
        <Badge color="gray" size="2" variant="soft">
          {emails.length} emails
        </Badge>
        <Button size="1" variant="ghost" onClick={load}>
          <ReloadIcon /> Refresh
        </Button>
      </Flex>
      {emails.map((email) => (
        <Card key={email.id}>
          <Flex justify="between" align="start" gap="4">
            <Box style={{ minWidth: 0, flex: 1 }}>
              <Flex gap="2" align="center" mb="1" wrap="wrap">
                <EnvelopeClosedIcon />
                <Text size="2" weight="bold" style={{ flex: 1 }}>
                  {email.subject || "(no subject)"}
                </Text>
                {email.last_event && (
                  <Badge
                    color={statusColor(email.last_event)}
                    size="1"
                    variant="soft"
                  >
                    {email.last_event}
                  </Badge>
                )}
              </Flex>
              <Text size="1" color="gray">
                To: {email.to?.join(", ")}
              </Text>
              <Text size="1" color="gray" as="div">
                {new Date(email.created_at).toLocaleString()}
              </Text>
            </Box>
            <Button asChild size="1" variant="ghost" style={{ flexShrink: 0 }}>
              <a
                href={`https://resend.com/emails/${email.id}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Resend <ExternalLinkIcon />
              </a>
            </Button>
          </Flex>
        </Card>
      ))}
    </Flex>
  );
}

function ReceivedList() {
  const [emails, setEmails] = useState<ReceivedEmail[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const result = await getReceivedEmails(100);
    setEmails(result.emails as ReceivedEmail[]);
    setError(result.error);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  if (loading) {
    return (
      <Text color="gray" size="2">
        Loading…
      </Text>
    );
  }

  if (error) {
    return (
      <Card>
        <Flex gap="2" align="center">
          <ExclamationTriangleIcon color="red" />
          <Text color="red" size="2">
            {error}
          </Text>
        </Flex>
      </Card>
    );
  }

  if (emails.length === 0) {
    return (
      <Card>
        <Text color="gray" size="2">
          No received emails found.
        </Text>
      </Card>
    );
  }

  return (
    <Flex direction="column" gap="2">
      <Flex justify="between" align="center" mb="2">
        <Badge color="gray" size="2" variant="soft">
          {emails.length} emails
        </Badge>
        <Button size="1" variant="ghost" onClick={load}>
          <ReloadIcon /> Refresh
        </Button>
      </Flex>
      {emails.map((email) => (
        <Card key={email.id}>
          <Flex justify="between" align="start" gap="4">
            <Box style={{ minWidth: 0, flex: 1 }}>
              <Flex gap="2" align="center" mb="1">
                <EnvelopeOpenIcon />
                <Text size="2" weight="bold" style={{ flex: 1 }}>
                  {email.subject || "(no subject)"}
                </Text>
              </Flex>
              <Text size="1" color="gray">
                From: {email.from}
              </Text>
              <Text size="1" color="gray" as="div">
                {new Date(email.created_at).toLocaleString()}
              </Text>
            </Box>
          </Flex>
        </Card>
      ))}
    </Flex>
  );
}

function EmailsPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tab = searchParams?.get("tab") ?? "sent";

  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [subscribers, setSubscribers] = useState<EmailSubscriber[]>([]);
  const [loadingSubscribers, setLoadingSubscribers] = useState(false);

  const handleTabChange = (value: string) => {
    router.push(`/admin/emails?tab=${value}`);
  };

  const handleOpenBatchModal = async () => {
    setLoadingSubscribers(true);
    const list = await getEmailSubscribers();
    setSubscribers(list);
    setLoadingSubscribers(false);
    setBatchModalOpen(true);
  };

  return (
    <Container size="4" p="8" style={{ maxWidth: "1100px" }}>
      <Flex justify="between" align="center" mb="6">
        <Box>
          <Heading size="7">Emails</Heading>
          <Text color="gray" size="2">
            Sent and received emails via Resend
          </Text>
        </Box>
        <Flex gap="2" align="center">
          <Button
            variant="solid"
            size="2"
            onClick={handleOpenBatchModal}
            disabled={loadingSubscribers}
          >
            {loadingSubscribers ? "Loading..." : "Send Batch Email"}
          </Button>
          <Button asChild variant="soft" size="2">
            <a
              href="https://resend.com/emails"
              target="_blank"
              rel="noopener noreferrer"
            >
              Resend dashboard <ExternalLinkIcon />
            </a>
          </Button>
        </Flex>
      </Flex>

      <BatchEmailModal
        open={batchModalOpen}
        onOpenChange={setBatchModalOpen}
        recipients={subscribers}
      />

      <Tabs.Root value={tab} onValueChange={handleTabChange}>
        <Tabs.List mb="4">
          <Tabs.Trigger value="sent">
            <EnvelopeClosedIcon />
            &nbsp;Sent
          </Tabs.Trigger>
          <Tabs.Trigger value="received">
            <EnvelopeOpenIcon />
            &nbsp;Received
          </Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value="sent">
          <SentList />
        </Tabs.Content>

        <Tabs.Content value="received">
          <ReceivedList />
        </Tabs.Content>
      </Tabs.Root>
    </Container>
  );
}

function AdminGuard({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  if (!user) {
    return (
      <Container size="3" p="8">
        <Text color="gray">Loading…</Text>
      </Container>
    );
  }

  if (user.email?.toLowerCase() !== "contact@vadim.blog") {
    return (
      <Container size="3" p="8">
        <Card>
          <Flex direction="column" align="center" gap="4" p="4">
            <ExclamationTriangleIcon width="32" height="32" color="red" />
            <Heading size="5">Access denied</Heading>
            <Text color="gray">This page is restricted to administrators.</Text>
            <Button asChild variant="soft">
              <Link href="/">← Back to Jobs</Link>
            </Button>
          </Flex>
        </Card>
      </Container>
    );
  }

  return <>{children}</>;
}

export default function EmailsPage() {
  return (
    <AdminGuard>
      <Suspense
        fallback={
          <Container size="3" p="8">
            <Text color="gray">Loading…</Text>
          </Container>
        }
      >
        <EmailsPageContent />
      </Suspense>
    </AdminGuard>
  );
}
