import { Container, Heading, Text } from "@radix-ui/themes";

export default function ApplicationsPage() {
  return (
    <Container size="4" p="8">
      <Heading size="8" mb="4">
        Applications
      </Heading>
      <Text color="gray">Your job applications will appear here.</Text>
    </Container>
  );
}
