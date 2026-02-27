import { OpportunitiesClient } from "./opportunities-client";
import { Suspense } from "react";
import { Container, Text } from "@radix-ui/themes";

export default function OpportunitiesPage() {
  return (
    <Suspense
      fallback={
        <Container size="4" p="8">
          <Text color="gray">Loading...</Text>
        </Container>
      }
    >
      <OpportunitiesClient />
    </Suspense>
  );
}
