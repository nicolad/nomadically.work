import { Suspense } from "react";
import { CompanyDetailProvider } from "@/components/company-detail-provider";
import { Container, Spinner, Flex } from "@radix-ui/themes";

type Props = {
  params: { key: string };
};

export default function CompanyPage({ params }: Props) {
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
      <CompanyDetailProvider companyKey={params.key} />
    </Suspense>
  );
}
