import { ContactsClient } from "./contacts-client";
import { Suspense } from "react";
import { Container, Text } from "@radix-ui/themes";

export default function ContactsPage() {
  return (
    <Suspense
      fallback={
        <Container size="4" p="8">
          <Text color="gray">Loading...</Text>
        </Container>
      }
    >
      <ContactsClient />
    </Suspense>
  );
}
