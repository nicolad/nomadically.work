"use client";

import {
  Container,
  Heading,
  Button,
  Flex,
  Dialog,
  TextField,
  TextArea,
} from "@radix-ui/themes";
import { PlusIcon } from "@radix-ui/react-icons";
import { useState } from "react";
import { useAuth } from "@/lib/auth-hooks";
import {
  useCreateApplicationMutation,
  useGetApplicationsQuery,
} from "@/__generated__/hooks";

export default function ApplicationsPage() {
  const [open, setOpen] = useState(false);
  const [jobId, setJobId] = useState("");
  const { user } = useAuth();
  const [createApplication, { loading }] = useCreateApplicationMutation();
  const { data, loading: loadingApplications } = useGetApplicationsQuery();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user?.email) {
      console.error("User email not available");
      return;
    }

    try {
      await createApplication({
        variables: {
          input: {
            jobId,
            questions: [],
          },
        },
        refetchQueries: ["GetApplications"],
        awaitRefetchQueries: true,
      });
      setOpen(false);
      setJobId("");
    } catch (error) {
      console.error("Error creating application:", error);
    }
  };

  return (
    <Container size="4" p="8">
      <Flex justify="between" align="center" mb="4">
        <Heading size="8">Applications</Heading>
        <Dialog.Root open={open} onOpenChange={setOpen}>
          <Dialog.Trigger>
            <Button>
              <PlusIcon /> Add Application
            </Button>
          </Dialog.Trigger>

          <Dialog.Content style={{ maxWidth: 450 }}>
            <Dialog.Title>Add Application</Dialog.Title>
            <Dialog.Description size="2" mb="4">
              Submit a new job application
            </Dialog.Description>

            <form onSubmit={handleSubmit}>
              <Flex direction="column" gap="3">
                <label>
                  <TextField.Root
                    placeholder="Job URL"
                    type="url"
                    value={jobId}
                    onChange={(e) => setJobId(e.target.value)}
                    required
                  />
                </label>
              </Flex>

              <Flex gap="3" mt="4" justify="end">
                <Dialog.Close>
                  <Button variant="soft" color="gray" type="button">
                    Cancel
                  </Button>
                </Dialog.Close>
                <Button type="submit" disabled={loading}>
                  {loading ? "Submitting..." : "Submit"}
                </Button>
              </Flex>
            </form>
          </Dialog.Content>
        </Dialog.Root>
      </Flex>

      {loadingApplications ? (
        <Flex justify="center" p="8">
          Loading applications...
        </Flex>
      ) : data?.applications && data.applications.length > 0 ? (
        <Flex direction="column" gap="3">
          {data.applications.map((app, index) => (
            <Flex
              key={index}
              p="4"
              style={{
                border: "1px solid var(--gray-6)",
                borderRadius: "8px",
              }}
              direction="column"
              gap="2"
            >
              <Flex justify="between">
                <strong>Job ID:</strong> {app.jobId}
              </Flex>
              <Flex>
                <strong>Email:</strong> {app.email}
              </Flex>
              {app.questions.length > 0 && (
                <Flex direction="column" gap="1">
                  <strong>Questions:</strong>
                  {app.questions.map((q, qIndex) => (
                    <Flex key={qIndex} pl="3" direction="column">
                      <span>Q: {q.questionText}</span>
                      <span style={{ color: "var(--gray-11)" }}>
                        A: {q.answerText}
                      </span>
                    </Flex>
                  ))}
                </Flex>
              )}
            </Flex>
          ))}
        </Flex>
      ) : (
        <Flex justify="center" p="8" style={{ color: "var(--gray-11)" }}>
          No applications yet. Click &quot;Add Application&quot; to submit your
          first one.
        </Flex>
      )}
    </Container>
  );
}
