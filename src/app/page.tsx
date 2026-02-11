import { Suspense } from "react";
import { UnifiedJobsProvider } from "@/components/unified-jobs-provider";
import { Container, Text } from "@radix-ui/themes";
import styles from "./page.module.css";

const Page = () => {
  return (
    <Suspense
      fallback={
        <Container size="4" p="8">
          <Text color="gray">Loading...</Text>
        </Container>
      }
    >
      <Container size="4" p="8" className={styles.content}>
        <UnifiedJobsProvider />
      </Container>
    </Suspense>
  );
};

export default Page;
