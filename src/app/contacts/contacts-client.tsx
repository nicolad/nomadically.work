"use client";

import * as React from "react";
import { useCallback, useState } from "react";
import { useGetContactsQuery } from "@/__generated__/hooks";
import type { GetContactsQuery } from "@/__generated__/hooks";
import Link from "next/link";
import { useAuth } from "@/lib/auth-hooks";
import { ADMIN_EMAIL } from "@/lib/constants";
import {
  Badge,
  Box,
  Button,
  Callout,
  Card,
  Container,
  Flex,
  Heading,
  Spinner,
  Text,
  TextField,
} from "@radix-ui/themes";
import {
  EnvelopeClosedIcon,
  ExclamationTriangleIcon,
  InfoCircledIcon,
  LinkedInLogoIcon,
  MagnifyingGlassIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "@radix-ui/react-icons";

type Contact = NonNullable<
  GetContactsQuery["contacts"]["contacts"]
>[number];

const PAGE_SIZE = 50;

export function ContactsClient() {
  const { user } = useAuth();
  const isAdmin = user?.email === ADMIN_EMAIL;

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(0);

  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleSearch = useCallback((val: string) => {
    setSearch(val);
    setPage(0);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSearch(val), 300);
  }, []);

  const { data, loading } = useGetContactsQuery({
    variables: {
      search: debouncedSearch || undefined,
      limit: PAGE_SIZE,
      offset: page * PAGE_SIZE,
    },
    skip: !isAdmin,
    fetchPolicy: "cache-and-network",
  });

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

  const contactsList = data?.contacts?.contacts ?? [];
  const totalCount = data?.contacts?.totalCount ?? 0;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <Container size="3" p={{ initial: "4", md: "6" }}>
      <Flex direction="column" gap="5">
        <Heading size="6">Contacts</Heading>

        {/* Toolbar */}
        <Flex align="center" justify="between" gap="3" wrap="wrap">
          <Text size="2" color="gray">
            {loading
              ? "Loading…"
              : `${totalCount} contact${totalCount !== 1 ? "s" : ""}`}
          </Text>
          <Box style={{ width: 280 }}>
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

        {/* Contacts list */}
        {loading && contactsList.length === 0 ? (
          <Flex justify="center" py="6">
            <Spinner size="3" />
          </Flex>
        ) : contactsList.length === 0 ? (
          <Callout.Root color="gray" variant="soft">
            <Callout.Icon>
              <InfoCircledIcon />
            </Callout.Icon>
            <Callout.Text>No contacts found.</Callout.Text>
          </Callout.Root>
        ) : (
          <Flex direction="column" gap="2">
            {contactsList.map((contact) => (
              <ContactCard key={contact.id} contact={contact} />
            ))}
          </Flex>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <Flex justify="center" align="center" gap="3">
            <Button
              size="2"
              variant="soft"
              color="gray"
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeftIcon />
              Previous
            </Button>
            <Text size="2" color="gray">
              Page {page + 1} of {totalPages}
            </Text>
            <Button
              size="2"
              variant="soft"
              color="gray"
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
              <ChevronRightIcon />
            </Button>
          </Flex>
        )}
      </Flex>
    </Container>
  );
}

function ContactCard({ contact }: { contact: Contact }) {
  return (
    <Link
      href={`/contacts/${contact.id}`}
      style={{ textDecoration: "none", color: "inherit" }}
    >
      <Card
        style={{ cursor: "pointer", transition: "box-shadow 0.15s" }}
        className="contact-card"
      >
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

              {(contact.position || contact.company) && (
                <Text size="2" color="gray" mt="1" as="p">
                  {contact.position}
                  {contact.position && contact.company && " · "}
                  {contact.company}
                </Text>
              )}

              <Flex gap="3" mt="2" wrap="wrap" align="center">
                {contact.email && (
                  <Flex align="center" gap="1">
                    <EnvelopeClosedIcon color="gray" />
                    <Text size="2" color="gray">
                      {contact.email}
                    </Text>
                  </Flex>
                )}
                {contact.linkedinUrl && (
                  <Flex align="center" gap="1">
                    <LinkedInLogoIcon color="gray" />
                    <Text size="2" color="gray">
                      LinkedIn
                    </Text>
                  </Flex>
                )}
              </Flex>

              {contact.tags && contact.tags.length > 0 && (
                <Flex gap="1" mt="2" wrap="wrap">
                  {contact.tags.map((tag) => (
                    <Badge key={tag} color="gray" variant="surface" size="1">
                      {tag}
                    </Badge>
                  ))}
                </Flex>
              )}
            </Box>
          </Flex>
        </Box>
      </Card>
    </Link>
  );
}
