import { Suspense } from "react";
import { Container, Text } from "@radix-ui/themes";
import { SqlQueryInterface } from "@/components/SqlQueryInterface";

export default function QueryPage() {
  return (
    <Suspense
      fallback={
        <Container size="4" p="8">
          <Text color="gray">Loading...</Text>
        </Container>
      }
    >
      <Container size="4" p="8">
        <SqlQueryInterface
          title="SQL Query"
          description="Write a question in natural language or input raw SQL to query the database"
          placeholder="e.g. Top 10 companies hiring React in the last 14 days"
        />
      </Container>
    </Suspense>
  );
}
