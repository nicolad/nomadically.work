"use client";

import { useState, useEffect } from "react";
import {
  Container,
  Heading,
  Text,
  Flex,
  Card,
  Switch,
  TextField,
  Button,
  Select,
  Separator,
  Box,
} from "@radix-ui/themes";
import Link from "next/link";
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

function SettingsPageContent() {
  const { user, isLoaded } = useUser();
  const [preferredLocations, setPreferredLocations] = useState(
    "Fully Remote EU, Fully Remote Worldwide",
  );
  const [preferredSkills, setPreferredSkills] = useState("React");

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
      setPreferredLocations(settings.preferred_locations?.join(", ") || "");
      setPreferredSkills(settings.preferred_skills?.join(", ") || "");
    }
  }, [data]);

  const handleSave = async () => {
    if (!user?.id) {
      alert("You must be signed in to save settings");
      return;
    }

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
            preferred_locations: preferredLocations
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean),
            preferred_skills: preferredSkills
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean),
            excluded_companies: [],
          },
        },
      });
      await refetch();
      alert("Settings saved successfully!");
    } catch (error) {
      console.error("Error saving settings:", error);
      alert("Failed to save settings. Please try again.");
    }
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
        <Flex justify="between" align="center">
          <Heading size="8">Settings</Heading>
          <Link href="/">
            <Button variant="soft">← Back to Jobs</Button>
          </Link>
        </Flex>

        {/* Job Preferences */}
        <Card size="3">
          <Flex direction="column" gap="4">
            <Heading size="5">Job Preferences</Heading>
            <Text size="2" color="gray">
              Customize your job search experience
            </Text>

            <Separator size="4" />

            <Flex direction="column" gap="2">
              <Text weight="medium">Preferred Locations</Text>
              <TextField.Root
                placeholder="e.g., EU, Remote, Berlin, London..."
                value={preferredLocations}
                onChange={(e) => setPreferredLocations(e.target.value)}
              />
              <Text size="1" color="gray">
                Separate multiple locations with commas
              </Text>
            </Flex>

            <Flex direction="column" gap="2">
              <Text weight="medium">Skills & Keywords</Text>
              <TextField.Root
                placeholder="e.g., React, Python, AI/ML, DevOps..."
                value={preferredSkills}
                onChange={(e) => setPreferredSkills(e.target.value)}
              />
              <Text size="1" color="gray">
                Jobs matching these skills will be highlighted
              </Text>
            </Flex>
          </Flex>
        </Card>

        {/* Save Button */}
        <Flex justify="end" gap="3">
          <Link href="/">
            <Button variant="soft" color="gray">
              Cancel
            </Button>
          </Link>
          <Button onClick={handleSave} disabled={updateLoading}>
            {updateLoading ? "Saving..." : "Save Preferences"}
          </Button>
        </Flex>
      </Flex>
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
