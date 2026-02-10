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
      <div className={styles.content}>
        <UnifiedJobsProvider />
      </div>
    </Suspense>
  );
};

export default Page;
