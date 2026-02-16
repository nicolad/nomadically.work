import { SignUp } from "@clerk/nextjs";
import { Container, Flex } from "@radix-ui/themes";

export default function SignUpPage() {
  return (
    <Container size="1" px="4" py="8">
      <Flex direction="column" gap="6" align="center">
        <SignUp />
      </Flex>
    </Container>
  );
}
