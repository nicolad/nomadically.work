"use client";

import { Button, AlertDialog, Flex } from "@radix-ui/themes";
import { useState } from "react";
import { useDeleteAllJobsMutation } from "@/__generated__/hooks";

export function DeleteAllJobsButton() {
  const [open, setOpen] = useState(false);
  const [deleteAllJobsMutation, { loading }] = useDeleteAllJobsMutation();

  const handleDeleteAll = async () => {
    try {
      const result = await deleteAllJobsMutation({
        refetchQueries: ["GetJobs"],
        awaitRefetchQueries: true,
      });

      if (result.data?.deleteAllJobs?.success) {
        setOpen(false);
      } else {
      }
    } catch (error) {
      console.error("Error deleting all jobs:", error);
    }
  };

  return (
    <AlertDialog.Root open={open} onOpenChange={setOpen}>
      <AlertDialog.Trigger>
        <Button size="2" color="red" variant="soft">
          Delete All Jobs
        </Button>
      </AlertDialog.Trigger>
      <AlertDialog.Content maxWidth="450px">
        <AlertDialog.Title>Delete All Jobs</AlertDialog.Title>
        <AlertDialog.Description size="2">
          Are you sure you want to delete <strong>all jobs</strong> from the
          database? This action cannot be undone.
        </AlertDialog.Description>

        <Flex gap="3" mt="4" justify="end">
          <AlertDialog.Cancel>
            <Button variant="soft" color="gray">
              Cancel
            </Button>
          </AlertDialog.Cancel>
          <AlertDialog.Action>
            <Button
              variant="solid"
              color="red"
              onClick={handleDeleteAll}
              disabled={loading}
            >
              {loading ? "Deleting..." : "Delete All Jobs"}
            </Button>
          </AlertDialog.Action>
        </Flex>
      </AlertDialog.Content>
    </AlertDialog.Root>
  );
}
