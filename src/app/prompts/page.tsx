import { Suspense } from "react";
import { Container, Text, Heading, Flex, Card, Box } from "@radix-ui/themes";

export default function PromptsPage() {
  return (
    <Container size="4" p={{ initial: "4", md: "8" }}>
      <Suspense
        fallback={
          <Container size="4" p="8">
            <Text color="gray">Loading...</Text>
          </Container>
        }
      >
        <Flex direction="column" gap="6">
          <Heading size="8">Prompts</Heading>
          
          <Card>
            <Box p="5">
              <Text size="3" color="gray">
                Prompt management coming soon...
              </Text>
            </Box>
          </Card>
        </Flex>
      </Suspense>
    </Container>
  );
}
