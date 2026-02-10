import { Suspense } from "react";
import { CompanyDetailProvider } from "@/components/company-detail-provider";
import { Container, Spinner, Flex } from "@radix-ui/themes";

type Props = {
  params: Promise<{ key: string }>;
};

export default async function CompanyPage({ params }: Props) {
  const { key } = await params;
  
  return (
    <Suspense
      fallback={
        <Container size="4" p="8">
          <Flex justify="center" align="center" style={{ minHeight: "400px" }}>
            <Spinner size="3" />
          </Flex>
        </Container>
      }
    >
      <CompanyDetailProvider companyKey={key} />
    </Suspense>
  );
}
