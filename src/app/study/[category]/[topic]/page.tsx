"use client";

import { useRef, useState } from "react";
import { notFound } from "next/navigation";
import { useParams } from "next/navigation";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Badge, Box, Container, Flex, Heading, Skeleton } from "@radix-ui/themes";
import { useStudyTopicQuery, useGenerateStudyConceptExplanationMutation } from "@/__generated__/hooks";
import { useTextSelection } from "@/hooks/useTextSelection";
import { StudyConceptToolbar } from "@/components/study/StudyConceptToolbar";
import { ConceptExplanationDialog } from "@/components/study/ConceptExplanationDialog";

export default function StudyTopicPage() {
  const params = useParams<{ category: string; topic: string }>();
  const { category, topic } = params;

  const contentRef = useRef<HTMLDivElement>(null);
  const { selectedText, selectionRect, clearSelection } = useTextSelection(contentRef);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [currentExplanation, setCurrentExplanation] = useState<string | null>(null);

  const { data, loading } = useStudyTopicQuery({
    variables: { category, topic },
  });

  const [generateExplanation, { loading: explanationLoading, error: explanationError }] =
    useGenerateStudyConceptExplanationMutation();

  const handleExplain = async (text: string) => {
    if (!data?.studyTopic) return;
    try {
      const result = await generateExplanation({
        variables: { studyTopicId: data.studyTopic.id, selectedText: text },
      });
      if (result.data?.generateStudyConceptExplanation.explanation) {
        setCurrentExplanation(result.data.generateStudyConceptExplanation.explanation);
        setDialogOpen(true);
      }
    } catch {
      setDialogOpen(true);
    }
  };

  if (loading) {
    return (
      <Container size="3" p={{ initial: "4", md: "6" }}>
        <Skeleton height="40px" mb="4" />
        <Skeleton height="24px" width="120px" mb="4" />
        <Skeleton height="400px" />
      </Container>
    );
  }

  if (!data?.studyTopic) {
    notFound();
  }

  const { title, difficulty, tags, bodyMd } = data.studyTopic;

  const difficultyColor =
    difficulty === "beginner"
      ? "green"
      : difficulty === "advanced"
        ? "red"
        : "blue";

  return (
    <Container size="3" p={{ initial: "4", md: "6" }}>
      <Box mb="4">
        <Link href={`/study/${category}`} style={{ color: "var(--accent-9)", textDecoration: "none" }}>
          ← Back to {category}
        </Link>
      </Box>

      <Heading size="7" mb="3">
        {title}
      </Heading>

      <Flex gap="2" align="center" mb="4" wrap="wrap">
        <Badge color={difficultyColor} size="2">
          {difficulty}
        </Badge>
        {tags.map((tag) => (
          <Badge key={tag} variant="outline" size="1">
            {tag}
          </Badge>
        ))}
      </Flex>

      {bodyMd && (
        <div ref={contentRef}>
          <Box style={{ lineHeight: 1.7 }}>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{bodyMd}</ReactMarkdown>
          </Box>
        </div>
      )}

      <StudyConceptToolbar
        selectedText={selectedText}
        selectionRect={selectionRect}
        isLoading={explanationLoading}
        onExplain={handleExplain}
      />

      <ConceptExplanationDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) clearSelection();
        }}
        selectedText={selectedText}
        explanation={currentExplanation}
        loading={explanationLoading}
        error={explanationError?.message ?? null}
      />
    </Container>
  );
}
