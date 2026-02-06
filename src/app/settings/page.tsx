"use client";

import { useState, useEffect, useRef } from "react";
import {
  Container,
  Heading,
  Text,
  Flex,
  Card,
  TextField,
  Button,
  Separator,
  Badge,
  Dialog,
  Tooltip,
  Callout,
} from "@radix-ui/themes";
import {
  InfoCircledIcon,
  Cross2Icon,
  ChevronRightIcon,
  CheckIcon,
} from "@radix-ui/react-icons";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { useQuery, useMutation } from "@apollo/client";
import { gql } from "@/__generated__";
import type {
  GetUserSettingsQuery,
  GetUserSettingsQueryVariables,
  UpdateUserSettingsMutation,
  UpdateUserSettingsMutationVariables,
} from "@/__generated__/graphql";
import { ApolloProvider, useApollo } from "@/apollo/client";

export const dynamic = "force-dynamic";

// GraphQL operations
const GET_USER_SETTINGS = gql(`query GetUserSettings($userId: String!) {
  userSettings(userId: $userId) {
    id
    user_id
    email_notifications
    daily_digest
    new_job_alerts
    preferred_locations
    preferred_skills
    excluded_companies
    dark_mode
    jobs_per_page
    created_at
    updated_at
  }
}`);

const UPDATE_USER_SETTINGS =
  gql(`mutation UpdateUserSettings($userId: String!, $settings: UserSettingsInput!) {
  updateUserSettings(userId: $userId, settings: $settings) {
    id
    user_id
    email_notifications
    daily_digest
    new_job_alerts
    preferred_locations
    preferred_skills
    excluded_companies
    dark_mode
    jobs_per_page
    created_at
    updated_at
  }
}`);

const LOCATION_SUGGESTIONS = [
  "Fully Remote EU",
  "Fully Remote Worldwide",
  "Hybrid EU",
  "Europe (any)",
  "Remote US",
  "Remote APAC",
];

interface ToastState {
  show: boolean;
  message: string;
  type: "success" | "error";
}

function SettingsPageContent() {
  const router = useRouter();
  const { user, isLoaded } = useUser();

  const [locationChips, setLocationChips] = useState<string[]>([]);
  const [skillChips, setSkillChips] = useState<string[]>(["React"]);
  const [locationInput, setLocationInput] = useState("");
  const [skillInput, setSkillInput] = useState("");

  const [initialLocations, setInitialLocations] = useState<string[]>([]);
  const [initialSkills, setInitialSkills] = useState<string[]>([]);

  const [showDiscardDialog, setShowDiscardDialog] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">(
    "idle",
  );
  const [toast, setToast] = useState<ToastState>({
    show: false,
    message: "",
    type: "success",
  });

  const locationInputRef = useRef<HTMLInputElement>(null);
  const skillInputRef = useRef<HTMLInputElement>(null);

  const { data, loading, refetch } = useQuery<
    GetUserSettingsQuery,
    GetUserSettingsQueryVariables
  >(GET_USER_SETTINGS, {
    variables: { userId: user?.id || "" },
    skip: !user?.id,
  });

  const [updateSettings, { loading: updateLoading }] = useMutation<
    UpdateUserSettingsMutation,
    UpdateUserSettingsMutationVariables
  >(UPDATE_USER_SETTINGS);

  // Load settings when data is available
  useEffect(() => {
    if (data?.userSettings) {
      const settings = data.userSettings;
      const locations = settings.preferred_locations || [];
      const skills = settings.preferred_skills || ["React"];

      setLocationChips(locations);
      setSkillChips(skills);
      setInitialLocations(locations);
      setInitialSkills(skills);
    }
  }, [data]);

  // Check if there are unsaved changes
  const hasUnsavedChanges = () => {
    return (
      JSON.stringify(locationChips.sort()) !==
        JSON.stringify(initialLocations.sort()) ||
      JSON.stringify(skillChips.sort()) !== JSON.stringify(initialSkills.sort())
    );
  };

  // Show toast notification
  const showToast = (message: string, type: "success" | "error") => {
    setToast({ show: true, message, type });
    setTimeout(
      () => setToast({ show: false, message: "", type: "success" }),
      3000,
    );
  };

  // Add location chip
  const addLocationChip = (value: string) => {
    const trimmed = value.trim();
    if (trimmed && !locationChips.includes(trimmed)) {
      setLocationChips([...locationChips, trimmed]);
      setLocationInput("");
    }
  };

  // Add skill chip
  const addSkillChip = (value: string) => {
    const trimmed = value.trim();
    if (trimmed && !skillChips.includes(trimmed)) {
      setSkillChips([...skillChips, trimmed]);
      setSkillInput("");
    }
  };

  // Handle location input key press
  const handleLocationKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addLocationChip(locationInput);
    } else if (
      e.key === "Backspace" &&
      locationInput === "" &&
      locationChips.length > 0
    ) {
      setLocationChips(locationChips.slice(0, -1));
    }
  };

  // Handle skill input key press
  const handleSkillKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addSkillChip(skillInput);
    } else if (
      e.key === "Backspace" &&
      skillInput === "" &&
      skillChips.length > 0
    ) {
      setSkillChips(skillChips.slice(0, -1));
    }
  };

  // Handle save with keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        if (hasUnsavedChanges()) {
          handleSave();
        }
      } else if (e.key === "Escape") {
        handleCancel();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [locationChips, skillChips, initialLocations, initialSkills]);

  const handleSave = async () => {
    if (!user?.id) {
      showToast("You must be signed in to save settings", "error");
      return;
    }

    setSaveStatus("saving");

    try {
      await updateSettings({
        variables: {
          userId: user.id,
          settings: {
            email_notifications: true,
            daily_digest: false,
            new_job_alerts: true,
            dark_mode: true,
            jobs_per_page: 50,
            preferred_locations: locationChips,
            preferred_skills: skillChips,
            excluded_companies: [],
          },
        },
      });

      await refetch();
      setInitialLocations(locationChips);
      setInitialSkills(skillChips);
      setSaveStatus("saved");
      showToast("Settings saved successfully!", "success");

      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch (error) {
      console.error("Error saving settings:", error);
      setSaveStatus("idle");
      showToast("Failed to save settings. Please try again.", "error");
    }
  };

  const handleCancel = () => {
    if (hasUnsavedChanges()) {
      setShowDiscardDialog(true);
    } else {
      router.push("/");
    }
  };

  const handleDiscard = () => {
    setLocationChips(initialLocations);
    setSkillChips(initialSkills);
    setShowDiscardDialog(false);
    router.push("/");
  };

  if (!isLoaded || loading) {
    return (
      <Container size="3" px="8" py="6">
        <Text>Loading...</Text>
      </Container>
    );
  }

  if (!user) {
    return (
      <Container size="3" px="8" py="6">
        <Flex direction="column" gap="4">
          <Heading size="8">Settings</Heading>
          <Text>You must be signed in to access settings.</Text>
          <Link href="/">
            <Button>Go to Home</Button>
          </Link>
        </Flex>
      </Container>
    );
  }

  return (
    <Container size="3" px="8" py="6">
      <Flex direction="column" gap="6">
        {/* Breadcrumb Navigation */}
        <Flex align="center" gap="2">
          <Link
            href="/"
            style={{ textDecoration: "none", color: "var(--gray-11)" }}
          >
            <Text size="3" weight="medium">
              Jobs
            </Text>
          </Link>
          <ChevronRightIcon style={{ color: "var(--gray-9)" }} />
          <Text size="3" weight="medium">
            Settings
          </Text>
        </Flex>

        {/* Job Preferences */}
        <Card size="3">
          <Flex direction="column" gap="4">
            <Flex justify="between" align="center">
              <Flex direction="column" gap="1">
                <Heading size="5">Job Preferences</Heading>
                <Text size="2" color="gray">
                  We'll highlight jobs matching your criteria
                </Text>
              </Flex>
            </Flex>

            <Separator size="4" style={{ margin: "0" }} />

            {/* Preferred Locations */}
            <Flex direction="column" gap="2">
              <Flex align="center" gap="2">
                <Text weight="medium">Preferred Locations</Text>
                <Tooltip content="Add locations where you want to work. Press Enter or comma to add.">
                  <InfoCircledIcon
                    style={{ color: "var(--gray-9)", cursor: "help" }}
                  />
                </Tooltip>
              </Flex>

              {/* Location Chips */}
              {locationChips.length > 0 && (
                <Flex gap="2" wrap="wrap">
                  {locationChips.map((location, index) => (
                    <Badge
                      key={index}
                      size="2"
                      variant="soft"
                      style={{ paddingRight: "4px" }}
                    >
                      <Flex align="center" gap="1">
                        {location}
                        <Cross2Icon
                          style={{
                            cursor: "pointer",
                            width: "14px",
                            height: "14px",
                          }}
                          onClick={() =>
                            setLocationChips(
                              locationChips.filter((_, i) => i !== index),
                            )
                          }
                        />
                      </Flex>
                    </Badge>
                  ))}
                </Flex>
              )}

              <TextField.Root
                ref={locationInputRef}
                placeholder="Fully Remote EU, Berlin, London, etc."
                value={locationInput}
                onChange={(e) => setLocationInput(e.target.value)}
                onKeyDown={handleLocationKeyDown}
                onBlur={() => {
                  if (locationInput.trim()) {
                    addLocationChip(locationInput);
                  }
                }}
              />

              {/* Quick-pick suggestions */}
              <Flex gap="2" wrap="wrap">
                {LOCATION_SUGGESTIONS.filter(
                  (s) => !locationChips.includes(s),
                ).map((suggestion) => (
                  <Button
                    key={suggestion}
                    size="1"
                    variant="ghost"
                    onClick={() => addLocationChip(suggestion)}
                    style={{ cursor: "pointer" }}
                  >
                    + {suggestion}
                  </Button>
                ))}
              </Flex>

              <Text size="1" color="gray">
                Press Enter or comma to add • Backspace to remove
              </Text>
            </Flex>

            {/* Skills & Keywords */}
            <Flex direction="column" gap="2">
              <Flex align="center" gap="2">
                <Text weight="medium">Skills & Keywords</Text>
                <Tooltip content="Jobs mentioning these terms will be highlighted in your feed.">
                  <InfoCircledIcon
                    style={{ color: "var(--gray-9)", cursor: "help" }}
                  />
                </Tooltip>
              </Flex>

              {/* Skill Chips */}
              {skillChips.length > 0 && (
                <Flex gap="2" wrap="wrap">
                  {skillChips.map((skill, index) => (
                    <Badge
                      key={index}
                      size="2"
                      variant="soft"
                      color="blue"
                      style={{ paddingRight: "4px" }}
                    >
                      <Flex align="center" gap="1">
                        {skill}
                        <Cross2Icon
                          style={{
                            cursor: "pointer",
                            width: "14px",
                            height: "14px",
                          }}
                          onClick={() =>
                            setSkillChips(
                              skillChips.filter((_, i) => i !== index),
                            )
                          }
                        />
                      </Flex>
                    </Badge>
                  ))}
                </Flex>
              )}

              <TextField.Root
                ref={skillInputRef}
                placeholder="React, TypeScript, LLM, Next.js, etc."
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyDown={handleSkillKeyDown}
                onBlur={() => {
                  if (skillInput.trim()) {
                    addSkillChip(skillInput);
                  }
                }}
              />

              <Text size="1" color="gray">
                Press Enter or comma to add • Backspace to remove
              </Text>
            </Flex>

            {/* Validation */}
            {locationChips.length === 0 && (
              <Callout.Root color="orange" size="1">
                <Callout.Icon>
                  <InfoCircledIcon />
                </Callout.Icon>
                <Callout.Text>
                  Add at least one location to see relevant jobs
                </Callout.Text>
              </Callout.Root>
            )}
          </Flex>
        </Card>

        {/* Action Buttons */}
        <Flex justify="end" gap="3" align="center">
          {saveStatus === "saved" && (
            <Flex align="center" gap="2" style={{ color: "var(--green-9)" }}>
              <CheckIcon />
              <Text size="2" weight="medium">
                Saved
              </Text>
            </Flex>
          )}

          <Button variant="soft" color="gray" onClick={handleCancel}>
            Cancel
          </Button>

          <Button
            onClick={handleSave}
            disabled={
              updateLoading ||
              !hasUnsavedChanges() ||
              locationChips.length === 0
            }
            loading={updateLoading}
          >
            {saveStatus === "saving" ? "Saving..." : "Save Preferences"}
          </Button>

          {hasUnsavedChanges() && saveStatus === "idle" && (
            <Text size="1" color="gray">
              ⌘↵ to save
            </Text>
          )}
        </Flex>
      </Flex>

      {/* Discard Changes Dialog */}
      <Dialog.Root open={showDiscardDialog} onOpenChange={setShowDiscardDialog}>
        <Dialog.Content style={{ maxWidth: 450 }}>
          <Dialog.Title>Discard changes?</Dialog.Title>
          <Dialog.Description size="2" mb="4">
            You have unsaved changes. Are you sure you want to discard them?
          </Dialog.Description>

          <Flex gap="3" mt="4" justify="end">
            <Dialog.Close>
              <Button variant="soft" color="gray">
                Keep editing
              </Button>
            </Dialog.Close>
            <Button variant="solid" color="red" onClick={handleDiscard}>
              Discard changes
            </Button>
          </Flex>
        </Dialog.Content>
      </Dialog.Root>

      {/* Toast Notification */}
      {toast.show && (
        <div
          style={{
            position: "fixed",
            bottom: "24px",
            right: "24px",
            padding: "12px 20px",
            backgroundColor:
              toast.type === "success" ? "var(--green-9)" : "var(--red-9)",
            color: "white",
            borderRadius: "8px",
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
            zIndex: 1000,
            animation: "slideIn 0.2s ease-out",
          }}
        >
          <Flex align="center" gap="2">
            {toast.type === "success" && <CheckIcon />}
            <Text size="2" weight="medium">
              {toast.message}
            </Text>
          </Flex>
        </div>
      )}

      <style jsx>{`
        @keyframes slideIn {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
      `}</style>
    </Container>
  );
}

export default function SettingsPage() {
  const apolloClient = useApollo(null);

  return (
    <ApolloProvider client={apolloClient}>
      <SettingsPageContent />
    </ApolloProvider>
  );
}
