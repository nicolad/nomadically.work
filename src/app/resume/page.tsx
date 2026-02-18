"use client";

import { useState } from "react";
import {
  Container,
  Heading,
  Flex,
  Card,
  TextArea,
  Button,
  Text,
  Badge,
  Separator,
  Callout,
  Box,
} from "@radix-ui/themes";
import {
  UploadIcon,
  ChatBubbleIcon,
  CheckCircledIcon,
  CrossCircledIcon,
  InfoCircledIcon,
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

  // GQL hooks
  const [uploadResumeMutation] = useUploadResumeMutation();
  const [ingestResumeParseMutation] = useIngestResumeParseMutation();
  const [askAboutResume] = useAskAboutResumeLazyQuery();

  const userEmail = user?.email || "";

  // Check for existing resume on load (runs automatically when userEmail is available)
  const { data: resumeStatusData } = useResumeStatusQuery({
    variables: { email: userEmail },
    pollInterval: 3000, // Poll every 3 seconds to check for new resume status
    skip: !userEmail,
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
        <Text color="gray">Loading...</Text>
      </Container>
    );
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type !== "application/pdf") {
        showToast("Please upload a PDF file", "error");
        return;
      }
      setResumeFile(file);
    }
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
      // Convert PDF to base64
      const arrayBuffer = await resumeFile.arrayBuffer();
      const base64 = btoa(
        new Uint8Array(arrayBuffer).reduce(
          (data, byte) => data + String.fromCharCode(byte),
          "",
        ),
      );

      // Step 1: Submit PDF via GQL mutation
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

      // Step 2: Poll via GQL mutation until COMPLETED
      const jobId = upload.job_id;
      const filename = resumeFile.name;

      for (let i = 0; i < MAX_POLLS; i++) {
        await new Promise((r) => setTimeout(r, POLL_INTERVAL));

        const { data: ingestData } = await ingestResumeParseMutation({
          variables: {
            email: userEmail,
            job_id: jobId,
            filename,
          },
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
            `Resume processed! ${ingest.chunks_stored || 0} chunks stored.`,
            "success",
          );
          return;
        }
      }

      throw new Error("Parsing timed out. Please try again.");
    } catch (error) {
      setUploadStatus("error");
      showToast(
        error instanceof Error ? error.message : "Failed to upload resume",
        "error",
      );
      console.error("Upload error:", error);
      // Reset to idle after showing error
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
    if (!uploadedResumeId && uploadStatus !== "success") {
      showToast("Please upload your resume first", "error");
      return;
    }

    setQueryStatus("querying");
    setAnswer("");

    try {
      const { data } = await askAboutResume({
        variables: {
          email: userEmail,
          question: question,
        },
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
      console.error("Query error:", error);
    }
  };

  const SAMPLE_QUESTIONS = [
    "What are my strongest technical skills?",
    "What companies have I worked at?",
    "Summarize my work experience",
    "What programming languages do I know?",
    "What's my educational background?",
  ];

  const isUploading =
    uploadStatus === "uploading" ||
    uploadStatus === "parsing" ||
    uploadStatus === "ingesting";

  const uploadButtonLabel = {
    idle: "Upload Resume",
    uploading: "Submitting...",
    parsing: "Parsing PDF...",
    ingesting: "Storing chunks...",
    success: "Upload Resume",
    error: "Upload Resume",
  }[uploadStatus];

  return (
    <Container size="3" p="8">
      {/* Toast notification */}
      {toast.show && (
        <Box
          style={{
            position: "fixed",
            top: 20,
            right: 20,
            zIndex: 1000,
          }}
        >
          <Callout.Root
            color={
              toast.type === "success"
                ? "green"
                : toast.type === "error"
                  ? "red"
                  : "blue"
            }
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
        <Flex direction="column" gap="2">
          <Heading size="8">Resume Assistant</Heading>
          <Text color="gray" size="3">
            Upload your resume and ask questions about your experience using
            AI-powered RAG
          </Text>
        </Flex>

        {/* Upload Section */}
        <Card>
          <Flex direction="column" gap="4">
            <Flex align="center" gap="2">
              <UploadIcon width={20} height={20} />
              <Heading size="5">Upload Resume</Heading>
              {uploadStatus === "success" && (
                <Badge color="green" ml="auto">
                  Uploaded
                </Badge>
              )}
            </Flex>

            <Text color="gray" size="2">
              Upload your resume as a PDF. It will be processed, chunked, and
              stored securely with semantic embeddings for intelligent
              retrieval.
            </Text>

            <Flex direction="column" gap="3">
              <input
                type="file"
                accept="application/pdf,.pdf"
                onChange={handleFileChange}
                disabled={isUploading}
                style={{
                  padding: "12px",
                  border: "2px dashed var(--gray-7)",
                  borderRadius: "8px",
                  cursor: isUploading ? "not-allowed" : "pointer",
                  backgroundColor: "var(--gray-2)",
                  color: "var(--gray-11)",
                  fontSize: "14px",
                }}
              />
              {resumeFile && (
                <Text size="2" color="gray">
                  Selected: {resumeFile.name} (
                  {(resumeFile.size / 1024).toFixed(1)} KB)
                </Text>
              )}
            </Flex>

            {uploadStatus === "success" && uploadedResumeId && (
              <Callout.Root color="green">
                <Callout.Icon>
                  <CheckCircledIcon />
                </Callout.Icon>
                <Callout.Text>
                  Resume ingested — {chunksCount} chunks stored
                  {existingFilename && ` (${existingFilename})`}
                  {existingIngestedAt &&
                    ` · ${new Date(existingIngestedAt).toLocaleDateString()}`}
                </Callout.Text>
              </Callout.Root>
            )}

            <Flex gap="3" justify="end">
              <Button
                onClick={handleUploadResume}
                disabled={isUploading || !resumeFile}
                loading={isUploading}
              >
                <UploadIcon />
                {uploadButtonLabel}
              </Button>
            </Flex>
          </Flex>
        </Card>

        <Separator size="4" />

        {/* Q&A Section */}
        <Card>
          <Flex direction="column" gap="4">
            <Flex align="center" gap="2">
              <ChatBubbleIcon width={20} height={20} />
              <Heading size="5">Ask Questions</Heading>
            </Flex>

            <Text color="gray" size="2">
              Ask questions about your resume. The AI will search through your
              resume and provide contextual answers.
            </Text>

            {!uploadedResumeId && uploadStatus !== "success" && (
              <Callout.Root color="blue">
                <Callout.Icon>
                  <InfoCircledIcon />
                </Callout.Icon>
                <Callout.Text>
                  Upload your resume first to enable Q&A
                </Callout.Text>
              </Callout.Root>
            )}

            <Flex direction="column" gap="2">
              <Text size="2" weight="medium">
                Sample questions:
              </Text>
              <Flex gap="2" wrap="wrap">
                {SAMPLE_QUESTIONS.map((sample, i) => (
                  <Button
                    key={i}
                    variant="soft"
                    size="1"
                    onClick={() => setQuestion(sample)}
                    disabled={!uploadedResumeId && uploadStatus !== "success"}
                  >
                    {sample}
                  </Button>
                ))}
              </Flex>
            </Flex>

            <TextArea
              placeholder="Ask a question about your resume...&#10;&#10;Example: What are my strongest technical skills?"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              rows={3}
              disabled={
                queryStatus === "querying" ||
                (!uploadedResumeId && uploadStatus !== "success")
              }
            />

            <Flex gap="3" justify="end">
              <Button
                onClick={handleAskQuestion}
                disabled={
                  queryStatus === "querying" ||
                  !question.trim() ||
                  (!uploadedResumeId && uploadStatus !== "success")
                }
                loading={queryStatus === "querying"}
              >
                <ChatBubbleIcon />
                {queryStatus === "querying" ? "Thinking..." : "Ask Question"}
              </Button>
            </Flex>

            {/* Answer Display */}
            {answer && (
              <Card variant="surface" style={{ marginTop: "1rem" }}>
                <Flex direction="column" gap="3">
                  <Flex justify="between" align="center">
                    <Text weight="bold" size="3">
                      Answer
                    </Text>
                    <Badge color="gray" variant="soft">
                      {contextCount} context chunks used
                    </Badge>
                  </Flex>
                  <Text
                    style={{
                      whiteSpace: "pre-wrap",
                      lineHeight: "1.6",
                    }}
                  >
                    {answer}
                  </Text>
                </Flex>
              </Card>
            )}

            {queryStatus === "error" && (
              <Callout.Root color="red">
                <Callout.Icon>
                  <CrossCircledIcon />
                </Callout.Icon>
                <Callout.Text>
                  Failed to get answer. Please try again.
                </Callout.Text>
              </Callout.Root>
            )}
          </Flex>
        </Card>

        {/* Info Section */}
        <Card variant="surface">
          <Flex direction="column" gap="3">
            <Flex align="center" gap="2">
              <InfoCircledIcon width={18} height={18} />
              <Heading size="4">How it works</Heading>
            </Flex>
            <Flex direction="column" gap="2" ml="4">
              <Text size="2" color="gray">
                • Your resume is chunked into semantic segments
              </Text>
              <Text size="2" color="gray">
                • Each chunk is embedded using BGE-base-en-v1.5 (768 dimensions)
              </Text>
              <Text size="2" color="gray">
                • Questions use semantic search to find relevant chunks
              </Text>
              <Text size="2" color="gray">
                • Llama 3.3 70B generates answers from retrieved context
              </Text>
              <Text size="2" color="gray">
                • All data is stored securely and tied to your email
              </Text>
            </Flex>
          </Flex>
        </Card>
      </Flex>
    </Container>
  );
}

export default function ResumePage() {
  return <ResumePageContent />;
}
