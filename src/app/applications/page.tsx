import { Container, Heading, Text, Button, Flex } from "@radix-ui/themes";
import { PlusIcon } from "@radix-ui/react-icons";

export default function ApplicationsPage() {
  return (
    <Container size="4" p="8">
      <Flex justify="between" align="center" mb="4">
        <Heading size="8">Applications</Heading>
        <Button>
          <PlusIcon /> Add Application
        </Button>
      </Flex>
      <Text color="gray">Your job applications will appear here.</Text>
    </Container>
  );
}
