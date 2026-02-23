"use client";

import { useState, useRef, useCallback } from "react";
import {
  Container,
  Heading,
  Flex,
  Card,
  TextArea,
  Button,
  Text,
  Badge,
  Callout,
  Box,
  Separator,
  ScrollArea,
} from "@radix-ui/themes";
import {
  UploadIcon,
  ChatBubbleIcon,
  CheckCircledIcon,
  CrossCircledIcon,
  InfoCircledIcon,
  FileIcon,
  ReloadIcon,
} from "@radix-ui/react-icons";
import { useAuth } from "@/lib/auth-hooks";
import { useRouter } from "next/navigation";
import {
  useUploadResumeMutation,
  useIngestResumeParseMutation,
  useAskAboutResumeLazyQuery,
  useResumeStatusQuery,
} from "@/__generated__/hooks";

export const dynamic = "force-dynamic";

interface ToastState {
  show: boolean;
  message: string;
  type: "success" | "error" | "info";
}

const POLL_INTERVAL = 3000;
const MAX_POLLS = 60;

const STEPS = ["Select file", "Uploading", "Parsing PDF", "Storing", "Ready"] as const;
type StepIndex = 0 | 1 | 2 | 3 | 4;

const STATUS_TO_STEP: Record<string, StepIndex> = {
  idle: 0,
  uploading: 1,
  parsing: 2,
  ingesting: 3,
  success: 4,
  error: 0,
};

function ProgressStepper({ currentStep }: { currentStep: StepIndex }) {
  return (
    <Flex gap="1" align="center" wrap="wrap">
      {STEPS.map((label, i) => {
        const done = i < currentStep;
        const active = i === currentStep;
        return (
          <Flex key={label} align="center" gap="1">
            <Flex
              align="center"
              justify="center"
              style={{
                width: 22,
                height: 22,
                borderRadius: "50%",
                background: done
                  ? "var(--green-9)"
                  : active
                    ? "var(--accent-9)"
                    : "var(--gray-4)",
                color: done || active ? "white" : "var(--gray-9)",
                fontSize: 11,
                fontWeight: 600,
                flexShrink: 0,
              }}
            >
              {done ? "✓" : i + 1}
            </Flex>
            <Text
              size="1"
              weight={active ? "bold" : "regular"}
              color={done ? "green" : active ? undefined : "gray"}
              style={{ whiteSpace: "nowrap" }}
            >
              {label}
            </Text>
            {i < STEPS.length - 1 && (
              <Box
                style={{
                  width: 16,
                  height: 1,
                  background: done ? "var(--green-7)" : "var(--gray-5)",
                  flexShrink: 0,
                }}
              />
            )}
          </Flex>
        );
      })}
    </Flex>
  );
}

function DropZone({
  file,
  onChange,
  disabled,
}: {
  file: File | null;
  onChange: (f: File) => void;
  disabled: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      if (disabled) return;
      const dropped = e.dataTransfer.files[0];
      if (dropped?.type === "application/pdf") onChange(dropped);
    },
    [disabled, onChange],
  );

  return (
    <Box
      onClick={() => !disabled && inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); if (!disabled) setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      style={{
        border: `2px dashed ${dragging ? "var(--accent-9)" : file ? "var(--green-8)" : "var(--gray-6)"}`,
        borderRadius: 10,
        padding: "28px 20px",
        textAlign: "center",
        cursor: disabled ? "not-allowed" : "pointer",
        background: dragging
          ? "var(--accent-2)"
          : file
            ? "var(--green-2)"
            : "var(--gray-2)",
        transition: "all 0.15s ease",
        opacity: disabled ? 0.6 : 1,
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        style={{ display: "none" }}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onChange(f);
        }}
        disabled={disabled}
      />
      <Flex direction="column" align="center" gap="2">
        {file ? (
          <FileIcon width={28} height={28} color="var(--green-9)" />
        ) : (
          <UploadIcon width={28} height={28} color="var(--gray-9)" />
        )}
        {file ? (
          <>
            <Text size="2" weight="medium" color="green">
              {file.name}
            </Text>
            <Text size="1" color="gray">
              {(file.size / 1024).toFixed(1)} KB — click to change
            </Text>
          </>
        ) : (
          <>
            <Text size="2" weight="medium">
              Drop your PDF here or click to browse
            </Text>
            <Text size="1" color="gray">
              PDF files only · max 20 pages
            </Text>
          </>
        )}
      </Flex>
    </Box>
  );
}

function MarkdownAnswer({ text }: { text: string }) {
  // Simple markdown: bold, bullet lines, line breaks
  const lines = text.split("\n");
  return (
    <Flex direction="column" gap="1">
      {lines.map((line, i) => {
        const trimmed = line.trimStart();
        const isBullet = trimmed.startsWith("- ") || trimmed.startsWith("• ") || trimmed.startsWith("* ");
        const content = isBullet ? trimmed.slice(2) : line;
        const parts = content.split(/(\*\*[^*]+\*\*)/g);
        const rendered = parts.map((p, j) =>
          p.startsWith("**") && p.endsWith("**") ? (
            <Text key={j} weight="bold">{p.slice(2, -2)}</Text>
          ) : (
            <span key={j}>{p}</span>
          ),
        );
        if (!line.trim()) return <Box key={i} style={{ height: 6 }} />;
        return (
          <Text key={i} size="2" style={{ lineHeight: "1.65" }}>
            {isBullet && <span style={{ marginRight: 6 }}>•</span>}
            {rendered}
          </Text>
        );
      })}
    </Flex>
  );
}

const SAMPLE_QUESTIONS = [
  "What are my strongest technical skills?",
  "Summarize my work experience",
  "What companies have I worked at?",
  "What programming languages do I know?",
  "What's my educational background?",
];

function ResumePageContent() {
  const router = useRouter();
  const { user, loading, isAuthenticated } = useAuth();

  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [contextCount, setContextCount] = useState(0);

  const [uploadStatus, setUploadStatus] = useState<
    "idle" | "uploading" | "parsing" | "ingesting" | "success" | "error"
  >("idle");
  const [queryStatus, setQueryStatus] = useState<
    "idle" | "querying" | "success" | "error"
  >("idle");

  const [toast, setToast] = useState<ToastState>({
    show: false,
    message: "",
    type: "info",
  });

  const [uploadedResumeId, setUploadedResumeId] = useState<string | null>(null);
  const [chunksCount, setChunksCount] = useState<number>(0);

  const [uploadResumeMutation] = useUploadResumeMutation();
  const [ingestResumeParseMutation] = useIngestResumeParseMutation();
  const [askAboutResume] = useAskAboutResumeLazyQuery();

  const userEmail = user?.email || "";
  const resumeReady = uploadStatus === "success";

  const { data: resumeStatusData } = useResumeStatusQuery({
    variables: { email: userEmail },
    skip: !userEmail,
    // Only poll while we don't know yet — stop once confirmed
    pollInterval: resumeReady ? 0 : 5000,
    onCompleted(data) {
      const status = data?.resumeStatus;
      if (status?.exists && uploadStatus === "idle") {
        setUploadedResumeId(status.resume_id || "latest");
        setChunksCount(status.chunk_count || 0);
        setUploadStatus("success");
      }
    },
  });

  const existingFilename = resumeStatusData?.resumeStatus?.filename ?? null;
  const existingIngestedAt = resumeStatusData?.resumeStatus?.ingested_at ?? null;

  const showToast = (message: string, type: ToastState["type"]) => {
    setToast({ show: true, message, type });
    setTimeout(
      () => setToast({ show: false, message: "", type: "info" }),
      5000,
    );
  };

  if (!loading && !isAuthenticated) {
    router.push("/sign-in");
    return null;
  }

  if (loading) {
    return (
      <Container size="3" p="8">
        <Flex align="center" gap="2">
          <ReloadIcon style={{ animation: "spin 1s linear infinite" }} />
          <Text color="gray">Loading...</Text>
        </Flex>
      </Container>
    );
  }

  const handleFileChange = (file: File) => {
    if (file.type !== "application/pdf") {
      showToast("Please upload a PDF file", "error");
      return;
    }
    setResumeFile(file);
    if (uploadStatus === "success") setUploadStatus("idle");
  };

  const handleUploadResume = async () => {
    if (!resumeFile) {
      showToast("Please select a PDF file", "error");
      return;
    }
    if (!userEmail) {
      showToast("User email not found", "error");
      return;
    }

    setUploadStatus("uploading");

    try {
      const arrayBuffer = await resumeFile.arrayBuffer();
      const base64 = btoa(
        new Uint8Array(arrayBuffer).reduce(
          (data, byte) => data + String.fromCharCode(byte),
          "",
        ),
      );

      const { data: uploadData } = await uploadResumeMutation({
        variables: {
          email: userEmail,
          resumePdf: base64,
          filename: resumeFile.name,
        },
      });

      const upload = uploadData?.uploadResume;
      if (!upload?.success || !upload.job_id) {
        throw new Error("Upload failed — no job_id returned");
      }

      showToast(`PDF submitted (${upload.tier} tier). Parsing...`, "info");
      setUploadStatus("parsing");

      const jobId = upload.job_id;
      const filename = resumeFile.name;

      for (let i = 0; i < MAX_POLLS; i++) {
        await new Promise((r) => setTimeout(r, POLL_INTERVAL));

        const { data: ingestData } = await ingestResumeParseMutation({
          variables: { email: userEmail, job_id: jobId, filename },
        });

        const ingest = ingestData?.ingestResumeParse;
        if (!ingest?.success) {
          throw new Error(ingest?.error || "Ingest failed");
        }

        if (ingest.status === "COMPLETED") {
          setUploadStatus("success");
          setUploadedResumeId(ingest.resume_id || "latest");
          setChunksCount(ingest.chunks_stored || 0);
          showToast(
            `Resume ready — ${ingest.chunks_stored || 0} sections indexed.`,
            "success",
          );
          return;
        }

        if (i === Math.floor(MAX_POLLS / 2)) {
          setUploadStatus("ingesting");
        }
      }

      throw new Error("Parsing timed out. Please try again.");
    } catch (error) {
      setUploadStatus("error");
      showToast(
        error instanceof Error ? error.message : "Failed to upload resume",
        "error",
      );
      setTimeout(() => setUploadStatus("idle"), 3000);
    }
  };

  const handleAskQuestion = async () => {
    if (!question.trim()) {
      showToast("Please enter a question", "error");
      return;
    }
    if (!userEmail) {
      showToast("User email not found", "error");
      return;
    }
    if (!uploadedResumeId && !resumeReady) {
      showToast("Please upload your resume first", "error");
      return;
    }

    setQueryStatus("querying");
    setAnswer("");

    try {
      const { data } = await askAboutResume({
        variables: { email: userEmail, question },
      });

      const result = data?.askAboutResume;
      if (result?.answer) {
        setQueryStatus("success");
        setAnswer(result.answer);
        setContextCount(result.context_count);
      } else {
        throw new Error("No answer received");
      }
    } catch (error) {
      setQueryStatus("error");
      showToast(
        error instanceof Error ? error.message : "Failed to get answer",
        "error",
      );
    }
  };

  const isUploading =
    uploadStatus === "uploading" ||
    uploadStatus === "parsing" ||
    uploadStatus === "ingesting";

  const currentStep = STATUS_TO_STEP[uploadStatus] ?? 0;

  return (
    <Container size="3" py="8" px="4">
      {/* Toast */}
      {toast.show && (
        <Box style={{ position: "fixed", top: 20, right: 20, zIndex: 1000, maxWidth: 340 }}>
          <Callout.Root
            color={toast.type === "success" ? "green" : toast.type === "error" ? "red" : "blue"}
          >
            <Callout.Icon>
              {toast.type === "success" ? (
                <CheckCircledIcon />
              ) : toast.type === "error" ? (
                <CrossCircledIcon />
              ) : (
                <InfoCircledIcon />
              )}
            </Callout.Icon>
            <Callout.Text>{toast.message}</Callout.Text>
          </Callout.Root>
        </Box>
      )}

      <Flex direction="column" gap="6">
        {/* Header */}
        <Flex direction="column" gap="1">
          <Heading size="7">Resume Assistant</Heading>
          <Text color="gray" size="2">
            Upload your resume and get instant AI-powered answers about your experience
          </Text>
        </Flex>

        {/* Upload card */}
        <Card>
          <Flex direction="column" gap="4">
            <Flex align="center" justify="between">
              <Flex align="center" gap="2">
                <UploadIcon />
                <Heading size="4">Your Resume</Heading>
              </Flex>
              {resumeReady && (
                <Badge color="green" variant="soft">
                  <CheckCircledIcon /> Ready
                </Badge>
              )}
            </Flex>

            {/* Progress stepper — only when actively uploading */}
            {isUploading && (
              <ProgressStepper currentStep={currentStep} />
            )}

            {/* Existing resume info */}
            {resumeReady && uploadedResumeId && (
              <Callout.Root color="green" variant="soft">
                <Callout.Icon>
                  <CheckCircledIcon />
                </Callout.Icon>
                <Callout.Text>
                  <Text weight="medium">{existingFilename || "Resume"}</Text>
                  {" — "}
                  {chunksCount} sections indexed
                  {existingIngestedAt && (
                    <Text color="gray">
                      {" · uploaded "}
                      {new Date(existingIngestedAt).toLocaleDateString()}
                    </Text>
                  )}
                </Callout.Text>
              </Callout.Root>
            )}

            <DropZone
              file={resumeFile}
              onChange={handleFileChange}
              disabled={isUploading}
            />

            <Flex gap="3" justify="end">
              <Button
                onClick={handleUploadResume}
                disabled={isUploading || !resumeFile}
                loading={isUploading}
              >
                <UploadIcon />
                {isUploading
                  ? uploadStatus === "uploading"
                    ? "Submitting…"
                    : uploadStatus === "parsing"
                      ? "Parsing PDF…"
                      : "Storing…"
                  : resumeReady
                    ? "Replace Resume"
                    : "Upload Resume"}
              </Button>
            </Flex>
          </Flex>
        </Card>

        <Separator size="4" />

        {/* Q&A card */}
        <Card>
          <Flex direction="column" gap="4">
            <Flex align="center" gap="2">
              <ChatBubbleIcon />
              <Heading size="4">Ask Questions</Heading>
            </Flex>

            {!resumeReady && (
              <Callout.Root color="blue" variant="soft">
                <Callout.Icon>
                  <InfoCircledIcon />
                </Callout.Icon>
                <Callout.Text>Upload your resume above to enable Q&amp;A</Callout.Text>
              </Callout.Root>
            )}

            {resumeReady && (
              <>
                <Flex gap="2" wrap="wrap">
                  {SAMPLE_QUESTIONS.map((sample, i) => (
                    <Button
                      key={i}
                      variant="soft"
                      size="1"
                      onClick={() => setQuestion(sample)}
                      disabled={queryStatus === "querying"}
                    >
                      {sample}
                    </Button>
                  ))}
                </Flex>

                <TextArea
                  placeholder="Ask anything about your resume…"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  rows={3}
                  disabled={queryStatus === "querying"}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                      void handleAskQuestion();
                    }
                  }}
                />

                <Flex gap="3" justify="between" align="center">
                  <Text size="1" color="gray">
                    ⌘↵ to submit
                  </Text>
                  <Button
                    onClick={handleAskQuestion}
                    disabled={queryStatus === "querying" || !question.trim()}
                    loading={queryStatus === "querying"}
                  >
                    <ChatBubbleIcon />
                    {queryStatus === "querying" ? "Thinking…" : "Ask"}
                  </Button>
                </Flex>

                {answer && (
                  <Card variant="surface">
                    <Flex direction="column" gap="3">
                      <Flex justify="between" align="center">
                        <Text size="2" weight="bold" color="gray">
                          Answer
                        </Text>
                        <Badge color="gray" variant="soft" size="1">
                          {contextCount} sections used
                        </Badge>
                      </Flex>
                      <ScrollArea style={{ maxHeight: 400 }}>
                        <MarkdownAnswer text={answer} />
                      </ScrollArea>
                    </Flex>
                  </Card>
                )}

                {queryStatus === "error" && (
                  <Callout.Root color="red">
                    <Callout.Icon>
                      <CrossCircledIcon />
                    </Callout.Icon>
                    <Callout.Text>Failed to get answer. Please try again.</Callout.Text>
                  </Callout.Root>
                )}
              </>
            )}
          </Flex>
        </Card>

        {/* How it works */}
        <Card variant="surface">
          <Flex direction="column" gap="3">
            <Flex align="center" gap="2">
              <InfoCircledIcon />
              <Heading size="3">How it works</Heading>
            </Flex>
            <Flex direction="column" gap="1" ml="4">
              {[
                "Your PDF is parsed with OCR support for scanned documents",
                "The text is split into sections and indexed for fast search",
                "Questions are matched to the most relevant resume sections",
                "An AI model composes a precise answer from your content",
                "Everything is stored privately and tied to your account",
              ].map((step, i) => (
                <Text key={i} size="2" color="gray">
                  {i + 1}. {step}
                </Text>
              ))}
            </Flex>
          </Flex>
        </Card>
      </Flex>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </Container>
  );
}

export default function ResumePage() {
  return <ResumePageContent />;
}
