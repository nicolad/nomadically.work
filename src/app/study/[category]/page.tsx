"use client";

import { useRef, useState } from "react";
import { useParams } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Badge,
  Box,
  Button,
  Card,
  Container,
  Dialog,
  Flex,
  Heading,
  ScrollArea,
  Skeleton,
  Text,
} from "@radix-ui/themes";
import { BookmarkIcon, Cross2Icon, ExclamationTriangleIcon, ReloadIcon } from "@radix-ui/react-icons";
import { useStudyTopicsQuery, useStudyTopicQuery, useGenerateStudyConceptExplanationMutation, useGenerateStudyDeepDiveMutation } from "@/__generated__/hooks";
import { useTextSelection } from "@/hooks/useTextSelection";
import { StudyConceptToolbar } from "@/components/study/StudyConceptToolbar";
import { ConceptExplanationDialog } from "@/components/study/ConceptExplanationDialog";

function difficultyColor(d: string) {
  if (d === "beginner") return "green" as const;
  if (d === "advanced") return "red" as const;
  return "blue" as const;
}

function TopicDialog({
  category,
  topic,
  onClose,
}: {
  category: string;
  topic: string;
  onClose: () => void;
}) {
  const [deepDiveContent, setDeepDiveContent] = useState<string | null | undefined>(undefined);

  const { data, loading } = useStudyTopicQuery({
    variables: { category, topic },
    onCompleted: (d) => {
      if (deepDiveContent === undefined) {
        setDeepDiveContent(d.studyTopic?.deepDive ?? null);
      }
    },
  });
  const t = data?.studyTopic;

  const contentRef = useRef<HTMLDivElement>(null);
  const { selectedText, selectionRect, clearSelection } = useTextSelection(contentRef);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [currentExplanation, setCurrentExplanation] = useState<string | null>(null);

  const [generateExplanation, { loading: explanationLoading, error: explanationError }] =
    useGenerateStudyConceptExplanationMutation();

  const [generateDeepDive, { loading: deepDiveLoading, error: deepDiveError }] =
    useGenerateStudyDeepDiveMutation();

  const handleGenerateDeepDive = async (force = false) => {
    if (!t) return;
    try {
      const result = await generateDeepDive({
        variables: { studyTopicId: t.id, force },
      });
      if (result.data?.generateStudyDeepDive.deepDive) {
        setDeepDiveContent(result.data.generateStudyDeepDive.deepDive);
      }
    } catch {
      // error shown via deepDiveError
    }
  };

  const handleExplain = async (text: string) => {
    if (!t) return;
    try {
      const result = await generateExplanation({
        variables: { studyTopicId: t.id, selectedText: text },
      });
      if (result.data?.generateStudyConceptExplanation.explanation) {
        setCurrentExplanation(result.data.generateStudyConceptExplanation.explanation);
        setDialogOpen(true);
      }
    } catch {
      setDialogOpen(true);
    }
  };

  return (
    <>
      <Dialog.Root open onOpenChange={(open) => { if (!open) onClose(); }}>
        <Dialog.Content
          maxWidth="780px"
          style={{ maxHeight: "85vh", display: "flex", flexDirection: "column" }}
        >
          {loading || !t ? (
            <Flex direction="column" gap="3" p="2">
              <Skeleton height="32px" width="60%" />
              <Skeleton height="20px" width="30%" />
              <Skeleton height="300px" />
            </Flex>
          ) : (
            <>
              <Flex justify="between" align="start" mb="3" gap="4">
                <Flex direction="column" gap="2" style={{ flex: 1, minWidth: 0 }}>
                  <Dialog.Title size="6" mb="0">{t.title}</Dialog.Title>
                  <Flex gap="2" wrap="wrap">
                    <Badge color={difficultyColor(t.difficulty)} size="1">
                      {t.difficulty}
                    </Badge>
                    {t.tags.map((tag) => (
                      <Badge key={tag} variant="outline" size="1">
                        {tag}
                      </Badge>
                    ))}
                  </Flex>
                </Flex>
                <Dialog.Close>
                  <Box
                    style={{ cursor: "pointer", color: "var(--gray-9)", flexShrink: 0, marginTop: 2 }}
                    onClick={onClose}
                  >
                    <Cross2Icon width={16} height={16} />
                  </Box>
                </Dialog.Close>
              </Flex>

              <ScrollArea style={{ flex: 1 }} scrollbars="vertical">
                {t.bodyMd && (
                  <div ref={contentRef}>
                    <Box style={{ lineHeight: 1.7, paddingRight: 8 }}>
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{t.bodyMd}</ReactMarkdown>
                    </Box>
                  </div>
                )}

                {/* Deep Dive section */}
                <Box
                  mt="5"
                  pt="4"
                  style={{ borderTop: "1px solid var(--gray-4)", paddingRight: 8 }}
                >
                  <Flex justify="between" align="center" mb="3">
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

                  {deepDiveLoading ? (
                    <Flex direction="column" gap="2">
                      <Flex align="center" gap="3" mb="2">
                        <Box style={{ display: "flex", gap: 4 }}>
                          {[0, 1, 2].map((i) => (
                            <Box
                              key={i}
                              style={{
                                width: 6, height: 6,
                                backgroundColor: "var(--violet-9)",
                                animation: "loadingDot 1.2s ease-in-out infinite",
                                animationDelay: `${i * 0.2}s`,
                              }}
                            />
                          ))}
                          <style>{`@keyframes loadingDot { 0%,80%,100%{opacity:.2;transform:scale(.8)} 40%{opacity:1;transform:scale(1)} }`}</style>
                        </Box>
                        <Text size="2" color="gray">Generating deep dive…</Text>
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
                    <Box className="deep-dive-content">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{deepDiveContent}</ReactMarkdown>
                    </Box>
                  ) : (
                    <Box
                      p="4"
                      style={{
                        backgroundColor: "var(--gray-2)",
                        border: "1px dashed var(--gray-5)",
                        textAlign: "center",
                      }}
                    >
                      <Box mb="2" style={{ color: "var(--gray-6)" }}>
                        <BookmarkIcon width={24} height={24} />
                      </Box>
                      <Text size="2" weight="medium" color="gray" as="div" mb="1">
                        No deep dive yet
                      </Text>
                      <Text size="1" color="gray" as="div" mb="3">
                        Generate a technically rigorous breakdown for interview prep.
                      </Text>
                      <Button size="2" variant="soft" color="violet" onClick={() => handleGenerateDeepDive()}>
                        <BookmarkIcon /> Generate deep dive
                      </Button>
                    </Box>
                  )}
                </Box>
              </ScrollArea>
            </>
          )}
        </Dialog.Content>
      </Dialog.Root>

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
    </>
  );
}

export default function StudyCategoryPage() {
  const params = useParams<{ category: string }>();
  const { category } = params;
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);

  const { data, loading } = useStudyTopicsQuery({ variables: { category } });
  const topics = data?.studyTopics ?? [];

  if (loading) {
    return (
      <Container size="3" p={{ initial: "4", md: "6" }}>
        <Skeleton height="40px" mb="6" />
        <Flex direction="column" gap="3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} height="100px" />
          ))}
        </Flex>
      </Container>
    );
  }

  return (
    <Container size="3" p={{ initial: "4", md: "6" }}>
      <Heading size="7" mb="6" style={{ textTransform: "capitalize" }}>
        {category}
      </Heading>

      {topics.length === 0 ? (
        <Text color="gray">No topics in this category yet.</Text>
      ) : (
        <Flex direction="column" gap="3">
          {topics.map((t) => (
            <Card
              key={t.id}
              style={{ cursor: "pointer" }}
              onClick={() => setSelectedTopic(t.topic)}
            >
              <Heading size="4" mb="1">{t.title}</Heading>
              {t.summary && (
                <Text color="gray" size="2" mb="2" as="p">
                  {t.summary}
                </Text>
              )}
              <Flex gap="2" wrap="wrap">
                <Badge color={difficultyColor(t.difficulty)} size="1">
                  {t.difficulty}
                </Badge>
                {t.tags.map((tag) => (
                  <Badge key={tag} variant="outline" size="1">
                    {tag}
                  </Badge>
                ))}
              </Flex>
            </Card>
          ))}
        </Flex>
      )}

      {selectedTopic && (
        <TopicDialog
          category={category}
          topic={selectedTopic}
          onClose={() => setSelectedTopic(null)}
        />
      )}
    </Container>
  );
}
