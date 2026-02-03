import { Suspense } from "react";
import { JobsProvider } from "@/components/jobs-provider";
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
        <JobsProvider />
      </div>
    </Suspense>
  );
};

export default Page;
