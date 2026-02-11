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
import { useAuth } from "@/auth/hooks";
import { useCreateApplicationMutation } from "@/__generated__/hooks";

export default function ApplicationsPage() {
  const [open, setOpen] = useState(false);
  const [jobId, setJobId] = useState("");
  const { user } = useAuth();
  const [createApplication, { loading }] = useCreateApplicationMutation();

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
    </Container>
  );
}
