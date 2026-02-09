import { CompaniesProvider } from "@/components/companies-provider";
import { Suspense } from "react";
import { Container, Text } from "@radix-ui/themes";

export default function CompaniesPage() {
  return (
    <Suspense
      fallback={
        <Container size="4" p="8">
          <Text color="gray">Loading...</Text>
        </Container>
      }
    >
      <CompaniesProvider />
    </Suspense>
  );
}
