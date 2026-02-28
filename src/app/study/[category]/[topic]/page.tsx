"use client";

import { useRef, useState } from "react";
import { notFound } from "next/navigation";
import { useParams } from "next/navigation";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Badge,
  Box,
  Button,
  Container,
  Flex,
  Heading,
  Skeleton,
  Text,
} from "@radix-ui/themes";
import { BookmarkIcon, ExclamationTriangleIcon, ReloadIcon } from "@radix-ui/react-icons";
import {
  useStudyTopicQuery,
  useGenerateStudyConceptExplanationMutation,
  useGenerateStudyDeepDiveMutation,
} from "@/__generated__/hooks";
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
  const [deepDiveContent, setDeepDiveContent] = useState<string | null | undefined>(undefined);

  const { data, loading } = useStudyTopicQuery({
    variables: { category, topic },
    onCompleted: (d) => {
      if (deepDiveContent === undefined) {
        setDeepDiveContent(d.studyTopic?.deepDive ?? null);
      }
    },
  });

  const [generateExplanation, { loading: explanationLoading, error: explanationError }] =
    useGenerateStudyConceptExplanationMutation();

  const [generateDeepDive, { loading: deepDiveLoading, error: deepDiveError }] =
    useGenerateStudyDeepDiveMutation();

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

  const handleGenerateDeepDive = async (force = false) => {
    if (!data?.studyTopic) return;
    try {
      const result = await generateDeepDive({
        variables: { studyTopicId: data.studyTopic.id, force },
      });
      if (result.data?.generateStudyDeepDive.deepDive) {
        setDeepDiveContent(result.data.generateStudyDeepDive.deepDive);
      }
    } catch {
      // error shown via deepDiveError
    }
  };

  if (loading) {
    return (
      <Container size="3" p={{ initial: "4", md: "6" }}>
        <Skeleton height="20px" width="100px" mb="4" />
        <Skeleton height="40px" mb="3" />
        <Skeleton height="24px" width="160px" mb="6" />
        <Skeleton height="400px" mb="6" />
        <Skeleton height="200px" />
      </Container>
    );
  }

  if (!data?.studyTopic) {
    notFound();
  }

  const { id, title, difficulty, tags, bodyMd } = data.studyTopic;

  const difficultyColor =
    difficulty === "beginner" ? "green" : difficulty === "advanced" ? "red" : "blue";

  return (
    <Container size="3" p={{ initial: "4", md: "6" }}>
      <Text size="2" mb="4" as="p">
        <Link href="/study" style={{ color: "var(--accent-9)", textDecoration: "none" }}>
          Study
        </Link>
        {" / "}
        <Link href={`/study/${category}`} style={{ color: "var(--accent-9)", textDecoration: "none" }}>
          {category}
        </Link>
      </Text>

      <Heading size="7" mb="3">
        {title}
      </Heading>

      <Flex gap="2" align="center" mb="6" wrap="wrap">
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

      {/* Deep Dive */}
      <Box mt="6" pt="5" style={{ borderTop: "1px solid var(--gray-4)" }}>
        <Flex justify="between" align="center" mb="4">
          <Flex align="center" gap="2">
            <Box style={{ width: 3, height: 14, backgroundColor: "var(--violet-9)" }} />
            <Text
              size="1"
              weight="medium"
              style={{ color: "var(--violet-9)", textTransform: "uppercase", letterSpacing: "0.08em" }}
            >
              Deep Dive
            </Text>
          </Flex>
          {deepDiveContent && !deepDiveLoading && (
            <Button variant="ghost" size="1" color="gray" onClick={() => handleGenerateDeepDive(true)}>
              <ReloadIcon /> Regenerate
            </Button>
          )}
        </Flex>

        <style>{`@keyframes loadingDot { 0%,80%,100%{opacity:.2;transform:scale(.8)} 40%{opacity:1;transform:scale(1)} }`}</style>

        {deepDiveLoading ? (
          <Flex direction="column" gap="2">
            <Flex align="center" gap="3" mb="2">
              <Box style={{ display: "flex", gap: 4 }}>
                {[0, 1, 2].map((i) => (
                  <Box
                    key={i}
                    style={{
                      width: 6,
                      height: 6,
                      backgroundColor: "var(--violet-9)",
                      animation: "loadingDot 1.2s ease-in-out infinite",
                      animationDelay: `${i * 0.2}s`,
                    }}
                  />
                ))}
              </Box>
              <Text size="2" color="gray">Generating…</Text>
            </Flex>
            <Skeleton height="12px" width="55%" />
            <Skeleton height="12px" width="90%" />
            <Skeleton height="12px" width="80%" />
          </Flex>
        ) : deepDiveError ? (
          <Box p="3" style={{ backgroundColor: "var(--gray-3)", borderLeft: "2px solid var(--amber-9)" }}>
            <Flex align="center" gap="2" mb="1">
              <ExclamationTriangleIcon style={{ color: "var(--amber-9)" }} />
              <Text size="2" weight="medium" style={{ color: "var(--amber-9)" }}>Generation failed</Text>
            </Flex>
            <Text size="2" color="gray" as="div" mb="3">{deepDiveError.message}</Text>
            <Button size="2" variant="soft" color="gray" onClick={() => handleGenerateDeepDive(true)}>
              <ReloadIcon /> Try again
            </Button>
          </Box>
        ) : deepDiveContent ? (
          <Box style={{ lineHeight: 1.7 }}>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{deepDiveContent}</ReactMarkdown>
          </Box>
        ) : (
          <Box
            p="4"
            style={{ backgroundColor: "var(--gray-2)", border: "1px dashed var(--gray-5)", textAlign: "center" }}
          >
            <Box mb="2" style={{ color: "var(--gray-6)" }}>
              <BookmarkIcon width={24} height={24} />
            </Box>
            <Text size="2" weight="medium" color="gray" as="div" mb="1">No deep dive yet</Text>
            <Text size="1" color="gray" as="div" mb="3">
              Generate a technically rigorous breakdown for interview prep.
            </Text>
            <Button size="2" variant="soft" color="violet" onClick={() => handleGenerateDeepDive()}>
              <BookmarkIcon /> Generate deep dive
            </Button>
          </Box>
        )}
      </Box>

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
