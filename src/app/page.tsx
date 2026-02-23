import { Suspense } from "react";
import { UnifiedJobsProvider } from "@/components/unified-jobs-provider";
import { Container, Box, Flex, Skeleton } from "@radix-ui/themes";
import { checkIsAdmin } from "@/lib/admin";
import { AdminBar } from "@/components/admin-bar";
import styles from "./page.module.css";

function PageSkeleton() {
  return (
    <Container size="4" py="4">
      <Box mb="5">
        <Skeleton width="160px" height="24px" mb="1" />
        <Skeleton width="280px" height="16px" style={{ marginTop: 6 }} />
      </Box>
      <Box mb="4">
        <Skeleton width="100%" height="36px" mb="2" style={{ borderRadius: 8 }} />
        <Skeleton width="100px" height="22px" style={{ borderRadius: 999 }} />
      </Box>
      <Box mt="4">
        <Flex justify="between" align="center" py="2" px="3">
          <Skeleton width="28px" height="14px" />
          <Skeleton width="48px" height="14px" />
        </Flex>
        <Box style={{ border: "1px solid var(--gray-4)", borderRadius: 8, overflow: "hidden" }}>
          {Array.from({ length: 8 }).map((_, i) => (
            <Flex key={i} align="center" gap="3" px="3" py="3" style={{ borderBottom: i < 7 ? "1px solid var(--gray-3)" : undefined }}>
              <Skeleton width="36px" height="36px" style={{ borderRadius: 6, flexShrink: 0 }} />
              <Box style={{ flex: 1 }}>
                <Skeleton width={`${120 + (i % 3) * 40}px`} height="14px" />
                <Skeleton width="80px" height="12px" style={{ marginTop: 4 }} />
                <Skeleton width="140px" height="11px" style={{ marginTop: 4 }} />
              </Box>
            </Flex>
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
      <Container size="4" className={styles.content}>
        {isAdmin && <AdminBar userEmail={userEmail} />}
        <UnifiedJobsProvider />
      </Container>
    </Suspense>
  );
};

export default Page;
