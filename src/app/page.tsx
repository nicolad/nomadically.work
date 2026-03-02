export const dynamic = "force-dynamic";

import { Suspense } from "react";
import { UnifiedJobsProvider } from "@/components/unified-jobs-provider";
import { Container, Box, Flex, Skeleton } from "@radix-ui/themes";
import { checkIsAdmin } from "@/lib/admin";
import { AdminBar } from "@/components/admin-bar";
import styles from "./page.module.css";

function PageSkeleton() {
  return (
    <Container size="4" py="6">
      {/* heading block */}
      <Box mb="4">
        <Skeleton width="180px" height="28px" mb="1" />
        <Skeleton width="300px" height="14px" mt="1" />
      </Box>
      {/* search + filter */}
      <Box mb="3">
        <Skeleton width="100%" height="40px" mb="2" />
        <Flex gap="2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} width={`${52 + i * 8}px`} height="22px" />
          ))}
        </Flex>
      </Box>
      {/* job list */}
      <Box>
        <Flex justify="between" align="center" py="2" px="3">
          <Skeleton width="28px" height="14px" />
          <Skeleton width="48px" height="14px" />
        </Flex>
        <Box style={{ border: "1px solid var(--gray-6)", overflow: "hidden" }}>
          {Array.from({ length: 8 }).map((_, i) => (
            <Box key={i} px="5" py="4" style={{ borderBottom: i < 7 ? "1px solid var(--gray-6)" : undefined }}>
              <Flex align="center" gap="2" mb="1">
                <Skeleton width={`${140 + (i % 3) * 50}px`} height="17px" />
                <Skeleton width="64px" height="18px" />
              </Flex>
              <Skeleton width="100px" height="13px" mb="1" />
              <Skeleton width="200px" height="13px" />
            </Box>
          ))}
        </Box>
      </Box>
    </Container>
  );
}

const Page = async () => {
  const { isAdmin, userEmail } = await checkIsAdmin();

  return (
    <Suspense fallback={<PageSkeleton />}>
      <Container size="4" py="6" className={styles.content}>
        {isAdmin && <AdminBar userEmail={userEmail} />}
        <UnifiedJobsProvider />
      </Container>
    </Suspense>
  );
};

export default Page;
