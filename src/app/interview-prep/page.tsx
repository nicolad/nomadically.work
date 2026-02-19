"use client";

import { Container, Heading, Text, Flex, Card, Link, Box, Button } from "@radix-ui/themes";
import { ExternalLinkIcon } from "@radix-ui/react-icons";
import { useQuery } from "@apollo/client";
import { gql } from "@/__generated__";

export default function InterviewPrepPage() {
  const { data, loading, error } = useQuery(
    gql(`
      query GetPrepResources {
        prepResources {
          categories {
            id
            name
            emoji
            description
            resources {
              id
              title
              href
              description
              category
              tags
            }
          }
          totalResources
        }
      }
    `)
  );

  if (error) {
    return (
      <Container size="4" p="8">
        <Text color="red">Error loading prep resources: {error.message}</Text>
      </Container>
    );
  }

  if (loading) {
    return (
      <Container size="4" p="8">
        <Text color="gray">Loading prep resources...</Text>
      </Container>
    );
  }

  const { categories = [], totalResources = 0 } = data?.prepResources || {};

  return (
    <Container size="4" p="8">
      <Flex direction="column" gap="8">
        {/* Header */}
        <Box>
          <Heading size="9" mb="4">
            Interview Prep Guide
          </Heading>
          <Text size="5" color="gray">
            Master system design, data structures, algorithms, and behavioral interviews with curated resources and references. ({totalResources} total resources)
          </Text>
        </Box>

        {/* Dynamic Categories from GraphQL */}
        {categories.map((category) => (
          <Card key={category.id}>
            <Heading size="6" mb="4">
              {category.emoji} {category.name}
            </Heading>
            <Flex direction="column" gap="3">
              <Text color="gray" mb="4">
                {category.description}
              </Text>

              <Flex direction="column" gap="2">
                {category.resources.map((resource) => (
                  <ResourceLink
                    key={resource.id}
                    title={resource.title}
                    href={resource.href}
                    description={resource.description}
                    tags={resource.tags}
                  />
                ))}
              </Flex>
            </Flex>
          </Card>
        ))}

        {/* Tips & Advice */}
        <Card style={{ backgroundColor: "var(--accent-3)" }}>
          <Heading size="6" mb="4">
            💡 Interview Tips
          </Heading>
          <Flex direction="column" gap="3">
            <Text as="p">
              • <strong>Clarify requirements first</strong> - Ask about scale, constraints, and edge cases
            </Text>
            <Text as="p">
              • <strong>Discuss trade-offs</strong> - No single "best" solution; show understanding of pros/cons
            </Text>
            <Text as="p">
              • <strong>Start with simple solutions</strong> - Then optimize for scale and efficiency
            </Text>
            <Text as="p">
              • <strong>Draw diagrams</strong> - Visualize components and communication flows
            </Text>
            <Text as="p">
              • <strong>Discuss monitoring & alerting</strong> - How will you know if something breaks?
            </Text>
            <Text as="p">
              • <strong>Think about failure modes</strong> - What if a component goes down?
            </Text>
            <Text as="p">
              • <strong>Communicate throughout</strong> - Explain your reasoning as you design
            </Text>
            <Text as="p">
              • <strong>Ask for feedback</strong> - "Does this approach make sense to you?"
            </Text>
          </Flex>
        </Card>
      </Flex>
    </Container>
  );
}

// Helper component for resource links
function ResourceLink({
  title,
  href,
  description,
  tags = [],
}: {
  title: string;
  href: string;
  description: string;
  tags?: string[];
}) {
  return (
    <Box>
      <Link href={href} target="_blank" rel="noopener noreferrer">
        <Flex gap="2" align="center" asChild>
          <Button variant="ghost" size="2">
            <Text weight="medium">{title}</Text>
            <ExternalLinkIcon width={16} height={16} />
          </Button>
        </Flex>
      </Link>
      <Text size="2" color="gray" mt="1">
        {description}
      </Text>
      {tags && tags.length > 0 && (
        <Flex gap="2" mt="2" wrap="wrap">
          {tags.map((tag) => (
            <Text
              key={tag}
              size="1"
              style={{
                padding: "2px 8px",
                backgroundColor: "var(--accent-3)",
                borderRadius: "4px",
              }}
            >
              {tag}
            </Text>
          ))}
        </Flex>
      )}
    </Box>
  );
}
