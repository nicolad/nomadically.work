import { ContactDetailClient } from "./contact-detail-client";
import { Suspense } from "react";
import { Container, Text } from "@radix-ui/themes";

export default async function ContactDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <Suspense
      fallback={
        <Container size="3" p="8">
          <Text color="gray">Loading...</Text>
        </Container>
      }
    >
      <ContactDetailClient contactId={parseInt(id)} />
    </Suspense>
  );
}
