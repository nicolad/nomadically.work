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
import { useMutation } from "@apollo/client";
import { gql } from "@/__generated__";

const CREATE_APPLICATION = gql(`
  mutation CreateApplication($input: ApplicationInput!) {
    createApplication(input: $input) {
      email
      jobId
      questions {
        questionId
        questionText
        answerText
      }
    }
  }
`);

export default function ApplicationsPage() {
  const [open, setOpen] = useState(false);
  const [jobId, setJobId] = useState("");
  const [email, setEmail] = useState("");
  const [createApplication, { loading }] = useMutation(CREATE_APPLICATION);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await createApplication({
        variables: {
          input: {
            email,
            jobId,
            questions: [],
          },
        },
      });
      setOpen(false);
      setJobId("");
      setEmail("");
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
                  <TextField
                    placeholder="Email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </label>
                <label>
                  <TextField
                    placeholder="Job ID"
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
