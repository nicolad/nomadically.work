import { Suspense } from "react";
import { UnifiedJobsProvider } from "@/components/unified-jobs-provider";
import { Container, Text } from "@radix-ui/themes";
import { checkIsAdmin } from "@/lib/admin";
import { AdminBar } from "@/components/admin-bar";
import styles from "./page.module.css";

const Page = async () => {
  const { isAdmin, userEmail } = await checkIsAdmin();
  console.log("Admin status:", isAdmin, "User email:", userEmail);

  return (
    <Suspense
      fallback={
        <Container size="4" p="8">
          <Text color="gray">Loading...</Text>
        </Container>
      }
    >
      <Container size="4" p="8" className={styles.content}>
        {isAdmin && <AdminBar userEmail={userEmail} />}
        <UnifiedJobsProvider />
      </Container>
    </Suspense>
  );
};

export default Page;
